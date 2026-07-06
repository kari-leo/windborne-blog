---
title: 强化学习学习笔记：从 Bellman 方程到 DQN
published: 2026-06-04
description: 以 Flappy Bird 为例梳理强化学习基本框架、Reward 设计、Q 值与 Bellman 方程，以及 DQN 的两个稳定性技巧（Experience Replay、Target Network）。
tags: [robotic, 强化学习]
category: 学习笔记
---

## 一、RL 基本框架

两个角色：**Agent**（智能体）和 **Environment**（环境）。

```
Agent --[action]--> Environment
      <--[obs, reward]--
```

对应到 Flappy Bird：Agent = DQNAgent，Environment = FlappyBirdEnv，action = 跳/不跳，obs = 5 维向量，reward = 存活/过管/死亡信号。

## 二、Observation 设计要点

- 只提供决策所需的最小信息（小鸟位置/速度 + 最近管道距离/缝隙位置）
- 归一化到 [-1, 1]，神经网络对量纲敏感

## 三、Reward 设计要点

- Reward 决定智能体优先学什么，设计错了训练方向就错
- **稀疏奖励**是大坑：只在通过管道时给 +10，早期完全没信号
- **密集奖励**缓解稀疏：每帧按对齐缝隙程度额外给 +0.3，提供持续梯度
- **量纲平衡**：用等比级数检验——若 `r_survive / (1 - γ)` 接近或超过主目标奖励，次要行为会压过主目标

## 四、Q 值与即时奖励的关系

即时奖励 `r` 是 Q 值展开式的**第一项**，Q 值是所有未来奖励的折扣求和：

$$Q(s_t, a_t) = r_t + \gamma r_{t+1} + \gamma^2 r_{t+2} + \cdots$$

γ（折扣因子）是"即时 vs 长期"的旋钮：

- γ → 0：只看眼前
- γ = 0.99：约 100 步内的因果链都重要
- γ → 1：无限看重未来，难以训练

## 五、Bellman 方程：自举的核心

$$Q(s, a) = r + \gamma \cdot \max_{a'} Q(s', a')$$

**含义**：一个状态的价值 = 即时奖励 + 折扣后的下一状态最优价值。

**特点**：用自己估计自己（自举，bootstrapping）——这是 Q-learning 高效的原因，也是不稳定的根源。

## 六、DQN 的两个稳定性技巧

### Experience Replay（经验回放）

- 把每步经历 `(s, a, r, s', done)` 存入 ReplayBuffer
- 训练时**随机**抽 batch，打破时序相关性
- 没有它：连续帧高度相关，网络过拟合当前局面

### Target Network（目标网络）

- 两个结构相同的网络：`q_net`（学生，每步更新）和 `target_net`（旧教材，每 100 步从 q_net 硬拷贝）
- 目标值用 `target_net` 计算，梯度**只流入** `q_net`
- 没有它：目标每步都变，相当于追着自己的尾巴跑，训练发散

### 训练流程

```
target = r + γ × target_net(s').max()   # 稳定的目标
pred   = q_net(s)[a]                     # 当前预测
loss   = MSE(pred, target)
→ 梯度更新 q_net（target_net 不动）
→ 每 100 步：target_net ← q_net
```

## 七、ε-greedy 探索策略

```
以概率 ε 随机行动（探索）
以概率 1-ε 选 argmax Q（利用）
ε 从 1.0 随训练衰减到 0.01
```

**衰减速度是关键**：`EPS_DECAY = 0.995` 约在第 460 个 episode 停止探索，太早。改为 `0.9985` 让探索延续到第 1500 个 episode。

## 八、DQN 的内在局限

即使有以上技巧，DQN 仍有根本问题：**bootstrapping 误差传播**。

```
Q(s,a) 有误差 → 影响 target → 训练出有误差的 Q(s') → 再影响 target → ...
```

目标网络只是引入滞后来换取稳定，并未根治。PPO 等策略梯度方法用 episode 实际 return 估价值，绕开了自举，更稳定但数据效率低。