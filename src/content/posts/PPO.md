---
title: PPO 算法学习文档
published: 2026-06-25
description: 基于 pendulum-PPO 项目的代码精读与原理讲解——Actor-Critic 结构、RolloutBuffer、GAE、PPO-Clip 损失、完整训练循环，以及与 DQN 的对比。
tags: [robotic, 强化学习]
category: 学习笔记
---

> 基于 `pendulum-PPO` 项目的代码精读与原理讲解
> 项目路径：`RL-game/pendulum-PPO/`

## 1. PPO 是什么，为什么需要它

强化学习的核心循环是：**采样经验 → 用经验改进策略**。

最朴素的方法（REINFORCE）直接对策略梯度做梯度上升：

```
∇J(θ) = E[ ∇log π(a|s) · A ]
```

问题：学习率稍大，一步更新就可能把策略"踩烂"——策略变化太大，采到的旧数据和新策略已经不匹配，下一轮采样更烂，陷入恶性循环。

**PPO 的核心思想只有一句话：限制每次更新的步幅，别走得太远。**

## 2. 符号表

| 符号 | 含义 | 代码对应 |
|---|---|---|
| s_t | t 时刻状态（观测） | `obs` |
| a_t | t 时刻动作 | `action` |
| r_t | t 时刻奖励 | `reward` |
| π_θ(a\|s) | 参数为 θ 的策略 | `ActorCritic` |
| V_φ(s) | 值函数估计 | `critic` 头 |
| A_t | 优势 | `buffer.advantages` |
| G_t | 折扣回报（returns） | `buffer.returns` |
| γ | 折扣因子 | `GAMMA = 0.99` |
| λ | GAE 衰减因子 | `GAE_LAMBDA = 0.95` |
| ε | Clip 范围 | `CLIP_EPS = 0.2` |
| θ_old | 采样时的旧策略参数 | buffer 中固定的 log_prob |
| θ | 当前正在更新的策略参数 | optimizer 更新的参数 |

## 3. 核心模块概览

```
┌─────────────────────────────────────────────────────────────┐
│  PPO 完整数据流                                             │
├─────────────────────────────────────────────────────────────┤
│  1. Actor-Critic 网络   →  策略 π 和值函数 V                │
│  2. RolloutBuffer       →  存储 N_STEPS 步 on-policy 数据   │
│  3. GAE                 →  计算优势 A 和 returns G          │
│  4. PPO-Clip 损失       →  限制策略更新步幅                 │
│  5. 多 epoch 更新       →  数据复用，提升样本效率           │
└─────────────────────────────────────────────────────────────┘
```

## 4. Actor-Critic 网络结构

### 网络拓扑

```
观测 s (3 维) → shared backbone → ┬→ actor_mean → 高斯分布 N(μ, σ) → 采样 a
                                  └→ critic     → V(s)
```

- **Actor**：输出动作均值 μ，配合可学参数 `log_std` 构造高斯分布 N(μ, σ)
- **Critic**：输出标量 V(s)，预测当前状态的期望累积折扣回报
- 共享前两层 backbone，减少参数量

### 为什么用高斯分布

Pendulum 动作是连续扭矩 [-2, 2]，无法用 softmax。高斯分布天然支持连续动作：μ 是动作均值，σ 控制探索幅度。

### log_std 设计

```python
self.log_std = nn.Parameter(torch.zeros(act_dim))
```

`log_std` 不依赖状态，是独立的可学参数。初始化为 0 → 初始 σ = 1。训练初期 σ 大（探索），收敛后 σ 小（利用）。

### log_prob 的本质

`log_prob = dist.log_prob(action).sum(-1)` 是**在采样动作 a 这一点的对数概率密度**，不是策略本身。

高斯分布的对数密度：

```
log π(a|s) = -0.5 · log(2π·σ²) - (a - μ)² / (2σ²)
```

即给定 (μ, σ, a) 三个数计算出一个标量。

存 log_prob 而不是分布参数的原因：

- 数值稳定（概率连乘易下溢）
- 后面计算 ratio 时 `exp(new_lp - old_lp)` 直接得到比值

## 5. RolloutBuffer：On-policy 数据管理

### 与 DQN ReplayBuffer 的根本区别

| | DQN ReplayBuffer | PPO RolloutBuffer |
|---|---|---|
| 数据来源 | 历史所有策略 | 只有当前策略 |
| 使用方式 | 随机抽样复用 | 用完即丢 |
| 容量 | 大（百万级） | 固定 N_STEPS |

**On-policy 的核心约束**：策略梯度公式中的期望必须由**当前策略**采集的数据估计，否则有偏。

### Buffer 内容

每步存储 6 项：

```
obs[t]       = s_t
actions[t]   = a_t
rewards[t]   = r_t
dones[t]     = done_t
values[t]    = V_φ_old(s_t)         ← 采样时 critic 的输出（凝固）
log_probs[t] = log π_θ_old(a_t|s_t) ← 采样时 actor 的对数概率（凝固）
```

### Rollout 概念

**Rollout = 用当前策略与环境交互一段时间得到的轨迹片段。**

每次 rollout 长度固定为 N_STEPS = 2048 步，可以跨多个 episode 边界：

```
episode A: s_0 → ... → s_500 (done)
episode B: s_0' → ... → s_300' (done)
episode C: s_0'' → ... → s_1247'' (rollout 满)
─────────────────────────────────────
共 500 + 300 + 1248 = 2048 步
```

### done_t 的作用

`done_t ∈ {0, 1}` 表示第 t 步执行后 episode 是否结束。在 GAE 中用于截断跨 episode 的优势传递：

```
gae_t = δ_t + γλ·(1 - done_t)·gae_{t+1}
                       ↑
                done=1 时这一项变 0
```

防止不同 episode 的回报相互"污染"。

## 6. GAE：广义优势估计

### 三个量必须分清

| 量 | 含义 |
|---|---|
| **G_t**（returns） | 累积折扣回报，由实际 reward 组成 |
| **V_φ(s_t)** | 网络对 G_t 的估计 |
| **δ_t**（TD 误差） | `r_t + γ·V(s_{t+1})·(1-done_t) - V(s_t)` |
| **A_t**（优势） | "这个动作比平均好多少" |

### 为什么需要优势函数

最朴素的策略梯度用累积回报 G_t 代替 A_t，但 G_t 方差极大。**减去基线 V_φ(s_t)** 可以降低方差而不引入偏差：

```
A_t = G_t - V_φ(s_t)
```

直觉：不看"绝对回报"，只看"比当前状态平均预期高多少"。

### GAE 公式

GAE 在"高偏差低方差"（纯 TD）和"低偏差高方差"（纯 MC）之间插值：

$$A_t = \sum_{k=0}^{\infty} (\gamma\lambda)^k \cdot \delta_{t+k}$$

等价的反向递推（实际实现方式）：

```
gae_T = 0
gae_t = δ_t + γλ·(1 - done_t)·gae_{t+1}
A_t   = gae_t
```

### λ 的影响

```
λ = 0    → A_t = δ_t（纯 TD(0)，高偏差低方差）
λ = 1    → A_t = G_t - V(s_t)（纯 MC，低偏差高方差）
λ = 0.95 → 折中，实践常用值
```

### 反向递推为什么从 0 开始

`gae = 0` 是循环外的初始变量，代表"假设 rollout 之后的 δ 都是 0"。第一次循环 t = T-1 时：

```
gae_{T-1} = δ_{T-1} + γλ·(1-done)·0 = δ_{T-1}
```

而 last_value（rollout 之后状态的 V 估计）已经在 δ_{T-1} 内部 bootstrap 进去了。

### Returns 的计算

```python
self.returns[:] = self.advantages + self.values
```

即 `G_t^GAE = A_t^GAE + V_φ_old(s_t)`，作为 critic 的训练目标。

### GAE 用 V_old 还是 V_new

**只用 V_old，且只算一次**。在 `agent.learn()` 开头算完 advantages 和 returns 就凝固，整个 10 epoch 更新过程中不再变化。原因：

- 训练目标必须稳定，不能跟着网络一起变
- GAE 需要按时间顺序反向递推，无法在打乱后的 minibatch 上做
- PPO 的理论保证基于"用 θ_old 的数据估计 θ 的更新"

## 7. PPO-Clip：核心损失函数

### 重要性采样比率

用同一批数据更新多次，需要 importance sampling 修正分布偏差：

```
r_t(θ) = π_θ(a_t|s_t) / π_θ_old(a_t|s_t)
       = exp(log π_θ - log π_θ_old)
```

代码：

```python
ratio = (new_lp - old_lp_b).exp()
```

- ratio = 1：新旧策略对该动作看法一致
- ratio > 1：新策略更倾向于采该动作
- ratio < 1：新策略更不倾向于采该动作

ratio **同时受 μ 和 σ 影响**——既受动作均值偏移影响，也受探索幅度变化影响。

### Clip 公式

$$L_{CLIP} = E[\min(\text{ratio} \cdot A_t, \text{clip}(\text{ratio}, 1-\epsilon, 1+\epsilon) \cdot A_t)]$$

代码（注意 PyTorch 是最小化 loss，所以加负号后 min 变 max）：

```python
pg_loss1 = -adv_b * ratio
pg_loss2 = -adv_b * ratio.clamp(1 - CLIP_EPS, 1 + CLIP_EPS)
pg_loss  = torch.max(pg_loss1, pg_loss2).mean()
```

### Clip 如何"踩刹车"

**情况 1：A_t > 0（好动作，想增大概率）**

- ratio 已经 > 1+ε：pg_loss2 是常数无梯度，max 选 pg_loss2 → 停止增大
- ratio ∈ [1-ε, 1+ε]：正常更新

**情况 2：A_t < 0（坏动作，想减小概率）**

- ratio 已经 < 1-ε：pg_loss2 是常数无梯度，max 选 pg_loss2 → 停止减小
- ratio ∈ [1-ε, 1+ε]：正常更新

**核心**：Clip 确保每次更新后策略不会偏离采样策略太远（ratio ∈ [0.8, 1.2]），重要性采样的方差不失控。

## 8. 总损失三项详解

```python
loss = pg_loss + VF_COEF * vf_loss - ENT_COEF * entropy.mean()
```

对应数学：

$$L_{total} = L_{policy} + 0.5 \cdot L_{value} - 0.0 \cdot H[\pi_\theta]$$

### 第 1 项：策略损失 L_policy

由三个成分组成：

| 成分 | 来源 | 角色 |
|---|---|---|
| **ratio** | 新旧 log_prob 之比 | 衡量策略变化幅度 |
| **A_t** | GAE 输出 | 衡量动作好坏方向 |
| **clip 操作** | ε = 0.2 | 限制更新步幅 |

```python
ratio    = (new_lp - old_lp_b).exp()
pg_loss1 = -adv_b * ratio
pg_loss2 = -adv_b * ratio.clamp(1 - CLIP_EPS, 1 + CLIP_EPS)
pg_loss  = torch.max(pg_loss1, pg_loss2).mean()
```

### 第 2 项：值函数损失 L_value

```python
vf_loss = nn.functional.mse_loss(value, ret_b)
```

让当前 critic 的预测 V_φ_new(s_t) 拟合 GAE 算出的 returns G_t。

**为什么是 G_t 而不是 A_t？**

值函数定义就是 `V(s) = E[G | s]`，必须用 G_t 当目标。如果用 A_t（在 0 附近波动），V 会被推向 0，critic 就废了。

由于 `G_t = A_t + V_old(s_t)`，vf_loss 实际等价于：

```
(V_new(s) - V_old(s) - A_t)² = ((V_new - V_old) - A_t)²
```

含义：让 V_new 相对 V_old 的修正量去拟合 GAE 给出的修正信号。

### 第 3 项：熵正则 H[π_θ]

```python
entropy = dist.entropy().sum(-1)
```

高斯分布熵的解析解（**只跟 σ 有关**）：

$$H[N(\mu, \sigma)] = 0.5 \cdot \log(2\pi e \sigma^2)$$

- σ 大 → 熵大 → 探索性强
- σ 小 → 熵小 → 利用性强

数值感受：

```
σ = 0.1 → H ≈ -1.88
σ = 1.0 → H ≈  1.42
σ = 5.0 → H ≈  3.03
```

**作用**：

- ENT_COEF > 0 时鼓励高熵，防止策略 collapse
- ENT_COEF = 0（当前代码）时不参与梯度，但作为训练健康度指标监控

### 三类损失的"组成"对比

```
┌────────────────────────────────────────────────────────────┐
│ pg_loss  ← ratio (受 μ, σ 影响) × A_t × clip 限制          │
├────────────────────────────────────────────────────────────┤
│ vf_loss  ← (V_new(s) - G_t)²，用 returns 拟合              │
├────────────────────────────────────────────────────────────┤
│ entropy  ← 0.5·log(2πe·σ²)，只跟 σ 有关                    │
└────────────────────────────────────────────────────────────┘
```

策略梯度通过两条路径影响 σ：pg_loss 想让 σ 收敛到合适大小，entropy 想让 σ 别太小保持探索。

## 9. 完整训练循环

### 三阶段流程

```
═══════════ 采样阶段（forward only, 无梯度）═══════════
网络参数 θ_old 固定
for t in 0..2047:
    forward(obs_t) → mean, std, V_old
    sample a_t from N(mean, std)
    log_prob_old = log π(a_t|obs_t)
    env.step(a_t) → r_t, done_t, next_obs

    buffer 存入：obs, action, reward, done, V_old, log_prob_old

═══════════ GAE 阶段（纯数值计算，无网络）═══════════
用 buffer 数据反向递推，一次性算完：
    advantages[0..2047]
    returns[0..2047] = advantages + V_old

═══════════ 更新阶段（forward + backward, 有梯度）═══════════
for epoch in 0..9:
    打乱 indices
    for minibatch in 0..31:
        forward(obs_b) → V_new, log π_new   ← 重新走网络
        ratio   = exp(log π_new - log π_old)
        pg_loss = clip 公式
        vf_loss = (V_new - returns)²
        loss    = pg_loss + 0.5·vf_loss - 0·entropy
        backward + clip_grad_norm + optimizer.step()

═══════════ 清空 buffer，下一个 rollout ═══════════
```

### 关键数字

```
采样：2048 次 forward（无梯度）
更新：10 epoch × 32 minibatch = 320 次 forward + backward（有梯度）
同一个 obs 被网络处理 1 + 10 = 11 次
```

### 多 epoch 更新

同一份 2048 步数据被使用 10 轮，每轮重新打乱后切成 32 个 minibatch。

**为什么传统 on-policy 不敢这么做？**
朴素策略梯度假设数据来自当前策略，更新一次后策略变了，数据已"过期"。

**PPO 为什么敢？**

1. importance sampling 用 ratio 修正分布偏差
2. Clip 限制 ratio ∈ [0.8, 1.2]，离太远的更新自动失去梯度

## 10. 关键概念辨析

### V_φ(s_t) ≠ r_t

| 量 | 含义 | 来源 |
|---|---|---|
| r_t | 单步即时奖励 | 环境 `env.step()` 返回 |
| V_φ(s_t) | 状态期望累积折扣回报 | Critic 网络输出 |

**r_t 完全由环境决定，跟网络无关**。Pendulum-v1 内部公式：

```
reward = -(θ² + 0.1·θ_dot² + 0.001·action²)
```

智能体看不到这个公式，只能通过试错观察 reward。

### V_old vs V_new

**同一个网络在不同参数版本下的输出**，不是两个网络。

- **V_old**：采样时的前向输出，存入 buffer，后续不变
- **V_new**：每个 minibatch 用当前最新参数重新前向计算，带梯度

### A_t 和 G_t 的角色分工

```
GAE 反向递推
r_t, V_old, done ─────────────► A_t (优势)
                                 │
                          ┌──────┴──────┐
                          │             │
                  G_t = A_t + V_old      │
                  (returns)              │
                          │             │
                          ▼             ▼
                     vf_loss        pg_loss
                  (用 G_t 拟合)   (用 A_t 当方向信号)
```

- **A_t** 直接进入 pg_loss
- **A_t** 间接通过 G_t 进入 vf_loss
- **A_t 是 GAE 的输出，不是输入**

### advantage 归一化的时机

```python
# 1. 先算 advantages 和 returns（用未归一化 A_t）
self.returns[:] = self.advantages + self.values

# 2. 之后才归一化 advantages
self.buffer.advantages[:] = (adv - adv.mean()) / (adv.std() + 1e-8)
```

- pg_loss 用**归一化后**的 A_t（数值稳定）
- returns 用**未归一化**的 A_t（保持真实量级，否则 critic 学不出正确 V）

## 11. 常见误解与澄清

### 误解 1：log_prob 是策略

❌ "log π_θ(a|s) 代表策略"
✅ "log π_θ(a|s) 是策略分布在 a 这一点的对数概率密度，是一个标量"

策略是分布 N(μ, σ) 这条曲线整体，log_prob 是曲线在 x = a 处的取值。

### 误解 2：GAE 是无穷迭代

❌ "GAE 公式有 ∞ 求和，没法算"
✅ "rollout 长度固定 2048 步，反向递推一次扫完即可。无穷只是数学表达"

### 误解 3：r_t 跟网络有关

❌ "reward 是网络算的"
✅ "reward 是环境根据物理状态和固定公式给出的，与网络无关"

### 误解 4：vf_loss 用 A_t 拟合

❌ "vf_loss = (V - A)²"
✅ "vf_loss = (V_new - G_t)²，用 returns 拟合，A_t 只在 pg_loss 用"

如果用 A_t 拟合，V 会收敛到 0，毫无意义。

### 误解 5：GAE 每个 epoch 都重算

❌ "每次更新都用最新 V 重算 advantages"
✅ "GAE 在 rollout 后只算一次，整个 10 epoch 用同一份 advantages 和 returns"

训练目标必须稳定，不能跟着网络一起变。

### 误解 6：gae_T = 0 是物理意义

❌ "最后一步的优势真的是 0"
✅ "0 是反向递推的初始值，是算法实现技巧。真正的 bootstrap 通过 last_value 在 δ_{T-1} 内部完成"

## 12. 与 DQN 对比

| | DQN | PPO |
|---|---|---|
| 学习对象 | Q(s,a)（动作价值） | π(a\|s)（策略本身） |
| 动作空间 | 离散 | 连续/离散均可 |
| 数据复用 | ReplayBuffer 随机抽 | RolloutBuffer 用完丢 |
| Policy 类型 | off-policy | on-policy |
| 稳定性来源 | Target Network | Clip 限制步幅 |
| 探索机制 | ε-greedy | 高斯分布的 σ |
| 适合场景 | Atari 等离散控制 | Pendulum/MuJoCo 连续控制 |

Pendulum 动作是连续扭矩 [-2, 2]，DQN 无法直接处理，正是 PPO 的主场。

## 13. 关键超参数

| 参数 | 值 | 调大效果 | 调小效果 |
|---|---|---|---|
| `LR` | 3e-4 | 收敛快但不稳 | 稳但慢 |
| `GAMMA` | 0.99 | 更看长远 | 短视 |
| `GAE_LAMBDA` | 0.95 | 低偏差高方差 | 高偏差低方差 |
| `CLIP_EPS` | 0.2 | 激进更新 | 保守更新 |
| `N_STEPS` | 2048 | 优势估计准但慢 | 快但噪声大 |
| `BATCH_SIZE` | 64 | 梯度稳定 | 更新次数多 |
| `N_EPOCHS` | 10 | 样本效率高 | 浪费数据 |
| `ENT_COEF` | 0.0 | 鼓励探索 | 纯利用 |
| `VF_COEF` | 0.5 | critic 学得快 | actor 优先 |
| `MAX_GRAD_NORM` | 0.5 | 防梯度爆炸 | 更敏感 |

## 14. 类比理解

### 整体类比：射箭训练营

把 PPO 训练过程想象成一个射箭训练营，每天训练分三个阶段。

**角色对应：**

| PPO 概念 | 射箭类比 |
|---|---|
| Actor (策略 π) | 射手的瞄准习惯 |
| μ（动作均值） | 当前的瞄准点 |
| σ（探索幅度） | 手抖的幅度（故意保留的随机性） |
| Critic (V) | 教练对"这个局面能拿几分"的预判能力 |
| 动作 a | 一次具体的射箭出手 |
| reward | 这一箭的实际得分（环境/靶子给的） |
| episode | 一整场比赛（从开始到结束） |
| rollout | 今天采集的 2048 次出手记录 |
| GAE 算 advantage | 教练复盘每箭"比平均水平好多少" |
| returns G_t | 这一箭之后整场比赛的累计得分 |
| ratio | 复盘后新瞄准方式 vs 原瞄准方式的概率比 |
| Clip | "一次别改太多" 的训练原则 |
| 多 epoch 更新 | 同一份录像反复看 10 遍学习 |

### 阶段 1：采样（射 2048 箭）

射手用今天的瞄准习惯（θ_old）射 2048 次：

- 每次射出前：教练心里默默给个分数预测（V_old(s_t)）
- 实际射出：得到真实分数 r_t
- 同时记录："以我现在的瞄准习惯，恰好出这一箭的概率有多大"（log π_old）

**全程不改习惯**，只观察。所有数据存进笔记本（buffer）。

### 阶段 2：复盘（GAE 计算）

教练翻笔记本算每箭的"优势"：

```
δ_t = 实际分数 + γ·教练对下一局面的预判 - 教练对当前局面的预判
A_t = δ_t + γλ·后续箭的优势衰减累加
```

直觉：

- A_t > 0 → 这一箭比"平均水平"好，瞄准方向对
- A_t < 0 → 这一箭比"平均水平"差，需要修正

教练同时算出 returns（G_t = A_t + V_old），作为后续复盘自己预判能力的目标。

### 阶段 3：纠正习惯（多 epoch 更新）

```
看 10 遍录像（10 epoch）
每遍把 2048 箭打乱分成 32 组（minibatch）
每组做一次纠正：
  - 重新模拟："如果用现在新习惯，这一箭概率会怎样"（new_lp, V_new）
  - 算改变倍数 ratio = exp(new_lp - old_lp)
  - 朝 A_t 大的方向调瞄准 (pg_loss)
  - 朝 G_t 调教练预判能力 (vf_loss)
  - 但每次只改一点点，ratio ∈ [0.8, 1.2]（Clip）
```

**为什么 Clip 重要**：如果一遍录像改太多，第二遍录像里的"假设"就完全不可信了——录像里的箭是用旧习惯射的，改完和现实差太远就没参考价值。

### 几个细节的类比

**为什么 V_old 凝固，V_new 每次重算？**

笔记本上写的是"昨天教练的预判"（V_old），凝固不变。今天每次复盘时教练能力都在长进，要重新算"今天教练对这同一个局面的预判"（V_new），然后让 V_new 朝笔记本上记的 returns 学习。

**为什么 GAE 只算一次？**

笔记本上写的"每箭优势 A_t"是基于昨天教练的判断。复盘 10 次都用这同一份判断标准，否则今天教练自己评的优势既当裁判又当运动员，循环参考没意义。

**为什么 reward 跟网络无关？**

靶子（环境）有自己的计分规则（物理公式），跟射手习惯、教练能力都没关系。射手只能通过看分数试错，永远不知道计分公式长啥样。

**为什么需要 σ（手抖）？**

如果完全不抖（σ=0），每次都射同一个点，永远发现不了"稍微偏一点能不能更好"。手抖（探索）让你尝试附近的方案，从中找出更优的瞄准点。entropy 项就是在防止过早把 σ 调到 0。

**为什么 done 要截断 GAE？**

新的一场比赛和上一场无关，上一场最后一箭的好坏不能影响这一场第一箭的优势计算。done=1 就是"换场"标记，把优势的传播切断。

## 15. 一句话核心

> **PPO = 用旧策略采一批数据 → 算优势 → 反复用 clip 后的 ratio·A 推策略，但不允许走太远 → 同时让 critic 拟合 GAE 算出的 returns。**