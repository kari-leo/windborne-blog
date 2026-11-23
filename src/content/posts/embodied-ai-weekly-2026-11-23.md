---
title: 具身智能行业周报｜2026-11-23
published: 2026-11-23
updated: 2026-11-23
description: 20 条具身智能新闻，覆盖华为 CloudRobo 世界模型、灵巧手与人形机器人、制造及仓储应用、Genesis AI 融资与产业标准。
tags: [具身智能, 行业周报]
---

本期汇集 2026 年 11 月 16—22 日公开发布或更新的 20 条全球具身智能机器人新闻，覆盖模型与开发工具、整机与灵巧手、制造及仓储物流应用、融资并购与产业标准，编制日期为 2026 年 11 月 23 日。

## 模型、数据与开发工具

### 1. 华为云发布 CloudRobo-WM1.2 具身世界模型

11 月 16 日，华为云“行业 AI 梦工厂”宣布发布并开源昇腾原生具身世界模型 CloudRobo-WM1.2。模型采用共享世界模型骨干网络构建预测增强的世界表征，并通过原生 DualAct 架构生成机器人动作；华为云称其在 RoboTwin 2.0 和 LiberoPro 2.0 评测中均排名第一。

模型支持缺少部分动作标注、深度或相机视角的异构数据，面向单臂、双臂和轮式等本体开展统一运动建模，并提供世界模型与动作专家、联合与仅动作输出等可组合推理模式。

来源：[华为云](https://www.huaweicloud.com/news/2026/20261116171910882.html)，2026-11-16。

### 2. MoRE 团队发表多物理机制机器人世界模型

11 月 19 日，Ziyu Zhu 等研究者提交 MoRE 技术论文，提出按刚体、可变形物体和抓持交互组织运动专家的三维世界模型，在同一框架内预测不同物理机制下的物体变化。

模型使用仿真与真实数据混合训练，并与模型预测控制（MPC）结合开展操作任务。团队报告了跨物理机制的预测精度与真机 MPC 表现提升，并提供代码、数据和项目页面；论文已被 CoRL 2026 接收。

来源：[MoRE 研究团队／arXiv](https://arxiv.org/abs/2611.25336)，2026-11-19。

### 3. WAMotor 团队公布世界动作模型推测推理方法

11 月 19 日，Zexun Lin、Yuan Feng 和 Xike Xie 发表 WAMotor，针对世界动作模型多步去噪推理延迟提出即插即用的加速方法。方法根据去噪阶段的速度变化与积分时间步选择可复用的锚点，并执行与时间步相关的验证。

团队称，在 LIBERO、RoboTwin 2.0 和 LIBERO-Plus 上，WAMotor 在保持任务成功率的同时实现 2.86—4.28 倍端到端加速，并公开代码。

来源：[WAMotor 研究团队／arXiv](https://arxiv.org/abs/2611.25413)，2026-11-19。

### 4. Unstick 团队公布 JEPA 规划停滞诊断与修复方法

11 月 19 日，Junhyeok Lee 等研究者发表《Stuck in Place》，分析使用 JEPA 世界模型的视觉规划器在推物任务中的失败。论文指出，在其多数实验设置中，至少 96% 的失败属于物体未移动、模型却预测取得进展的停滞，规划器因而不断生成近似相同的动作。

团队提出 Unstick，将部署前的在策略微调与部署时固定权重的循环打破机制结合，使用预测误差残差记忆，或在每次重规划时随机初始化。论文同时提供实现代码。

来源：[Unstick 研究团队／arXiv](https://arxiv.org/abs/2611.25415)，2026-11-19。

### 5. ACE-Brain 团队发表执行状态驱动的具身推理模型

11 月 19 日，Yinhe Wang 等研究者提交 ACE-Brain-0.7 论文。该 9B 视觉语言模型结合空间定位、任务理解和执行进度估计，训练数据包括从第一人称人类视频、机器人轨迹及仿真中整理的 370 万组问答。

团队在 Qwen3.5-9B 基础上微调，报告模型在六项公开任务推理评测中平均得分 76.5，在七项空间定位评测中平均得分 75.90；研究同时考察视觉历史利用及不同执行状态的区分能力。

来源：[ACE-Brain 研究团队／arXiv](https://arxiv.org/abs/2611.26519)，2026-11-19。

### 6. ECHO 团队发表人形机器人上下文全身控制模型

11 月 19 日，Xingyi Wang 等研究者发表 ECHO，将通用动作先验与针对环境动力学的执行调整分开。模型通过混合与退火采样建立行为先验，再利用交互历史学习动力学表示，对冻结的先验进行残差修正，无需在测试时更新参数。

团队在宇树 G1 上展示全身遥操作、复杂动作、地形交互，以及操作与全身控制中的负载适应。

来源：[ECHO 研究团队／arXiv](https://arxiv.org/abs/2611.25778)，2026-11-19。

## 整机与核心零部件

### 7. 星动纪元开放 XHAND 1 Pro-U 灵巧手商业订购

11 月 16 日，星动纪元（ROBOTERA）宣布 XHAND 1 Pro-U 五指灵巧手开放商业订购，首批限量 40 只。产品采用 16 自由度结构，与 NVIDIA GEAR Lab 的 DexUMI 外骨骼关节配置对应，并调整拇指位置、掌侧触觉感知与手指活动结构。

DexUMI 记录人手动作及指尖力信息，用于 GR00T 2 后训练，再由配备两只 Pro-U 的双臂机器人执行。公司披露，香蕉酸奶制作、舀取谷物和点火化学操作三项多步骤任务的整体成功率分别为 60%、80% 和 75%。

来源：[星动纪元／PR Newswire](https://www.prnewswire.co.uk/news-releases/robotera-launches-xhand-1-pro-u-featured-in-nvidias-gr00t-2-dexumi-demonstration-302940296.html)，2026-11-16。

### 8. Foundation 发布 Phantom MKII 与 Cortex II

11 月 18 日，Fast Company 报道，Foundation Future Industries 发布第二代人形机器人 Phantom MKII 及其 Cortex II AI 系统，面向建筑、制造和国防用途。公司称机器人可在行走时承载 200 磅，约合 90.7 千克，具备适应雨雪、粉尘的关节和可现场更换的模块，电池续航最长六小时，较重负载会缩短续航。

公司 CEO Sankaet Pathak 表示，新执行器尺寸约为前代的四分之三，性能超过前代的 1.5 倍，物料成本减半；公司目标是在 2027 年初开始生产，初期数百台，年底扩大至数千台。

来源：[Fast Company](https://www.fastcompany.com/91643258/foundation-future-industries-humanoid-robot-war?partner=rss)，2026-11-18。

## 应用落地与商业合作

### 9. 波士顿动力与格罗方德扩大 Spot 部署并计划测试 Atlas

11 月 17 日，波士顿动力与格罗方德宣布扩大合作，将 Spot 巡检部署扩展至美国纽约州 Malta、佛蒙特州 Burlington、德国德累斯顿及新加坡的制造基地。格罗方德将加入 Atlas 早期采用者计划，双方拟于 2027 年初开始现场测试，评估人形机器人使用场景、集成需求及具体任务训练。

公告披露，新加坡两台 Spot 自 4 月以来已行进近 900 千米、完成超过 9 万次检查，任务成功率为 99%；采用最新软硬件后，团队在两周内重新部署了 875 项例行检查，并计划继续增加检查项目。

来源：[波士顿动力](https://bostondynamics.com/news/boston-dynamics-globalfoundries-expand-robotics-collaboration/)，2026-11-17。

### 10. 星动纪元披露中国邮政广东网络十一处部署

11 月 17 日，星动纪元宣布，其人形机器人已部署至中国邮政广东分公司的 11 个邮政枢纽，覆盖广州、深圳、东莞、江门、汕头、汕尾、揭阳和河源八座城市。

公司称，自 2026 年 3 月广州邮区中心试点以来，机器人平均供件速度超过每小时 1500 件。方案包含异形件剔除、自适应速度控制及自研五指灵巧手，并已扩展至华东地区邮政作业场景。

来源：[星动纪元／PR Newswire](https://www.prnewswire.com/news-releases/robotera-expands-humanoid-robot-deployment-across-china-posts-guangdong-network-reaching-eight-cities-province-wide-302941865.html)，2026-11-17。

### 11. 智元与蓝思科技合作部署手机测试产线

11 月 20—21 日，多家媒体报道智元创新与蓝思科技近日达成战略合作，在手机测试产线部署精灵 G2 机器人，数十台机器人同时开展测试工位自动上下料和测试设备交互。

新华财经报道，项目涉及 MMI、ANT、CAM、CAMCV 等测试环节，机器人承担手机转运、分拨与上下料，面向操作重复、机型迭代较快的 3C 精密制造岗位。

来源：[广州日报新花城](https://huacheng.gz-cmc.com/pages/2026/11/20/ca7b31da76c6448babf8ecbd9dfa3bc9.html)，2026-11-20；[新华财经](https://www.cnfin.com/gs-lb/detail/20261121/4498541_1.html)，2026-11-21。

### 12. Mujin 公布 Green Logistics 六台机器人出库作业案例

11 月 19 日，Mujin 公布日本 Green Logistics 新物流中心的自动化案例，将六台机器人与自动仓库直接连接，开展出库拣选和混合箱码垛。

据 Mujin 介绍，MujinOS 利用三维视觉识别约 1000 种箱体，实时计算和执行码放位置，单台处理能力约为每小时 500 箱。系统采用机械臂一体化三维视觉，无需另设专用相机支架。

来源：[Mujin](https://media.mujin.co.jp/news/11657/)，2026-11-19。

### 13. CEVA 与新加坡理工大学成立物流自动化联合实验室

11 月 17 日，CEVA Logistics 与新加坡理工大学（SIT）成立智能物流与自主系统实验室（ILAS Lab），开展为期五年的合作，研究机器人、AI 视觉与互联自动化在多品种、小批量增值作业中的应用，包括配套组装、贴标和包装。

双方预计，实验室方案将在未来一至两年内进入 CEVA 新加坡 Blue Hub。SIT 公告称，该设施的增值服务约占仓库总作业工时的一半；合作获得新加坡经济发展局及国家机器人计划支持。

来源：[新加坡理工大学](https://www.singaporetech.edu.sg/news/ceva-logistics-and-sit-jointly-launch-innovation-lab-bring-flexible-automation-research-warehouse)，2026-11-17。

### 14. 伽利略披露 C1-W 在波兰仓库巡检应用

11 月 16 日，伽利略机器人宣布与波兰本地企业合作，在波兹南物流园部署 C1-W 四足机器人仓储巡检及安防方案。机器人结合光学、热成像和声学数据，在高货架通道和装卸平台自主巡检。

公司称，方案覆盖超过 2000 平方米仓储区域及 2250 米货架，累计稳定运行超过 400 小时，将每日两班人工巡检调整为每三小时一次机器人巡检。产品具备 IP65 防护，标称工作温度为零下 20℃至 55℃。

来源：[伽利略机器人／PR Newswire](https://www.prnewswire.com/news-releases/galileo-c1-w-robot-dog-deployed-in-polish-warehouses-setting-overseas-benchmark-for-domestic-embodied-intelligence-302940267.html)，2026-11-16。

## 融资、政策与企业动态

### 15. Genesis AI 完成五亿美元 A 轮融资

11 月 17 日，Genesis AI 宣布完成 5 亿美元 A 轮融资，投后估值为 35 亿美元，由 Premji Invest、Khosla Ventures 和 Eclipse 联合领投，参投方包括 NVIDIA、AMD Ventures、三星 Next、爱立信、Bpifrance 及 HSG 等。

资金将用于扩大数据采集与大规模训练、提升物体操作能力，以及推动旗舰通用机器人 Eno 的客户规模部署。公司同时介绍了人手、采集手套与机器人手的对应设计，以及连接 GENE 模型、Genesis World 仿真平台和 Eno 的训练与部署体系。

来源：[Genesis AI／PR Newswire](https://www.prnewswire.com/news-releases/genesis-ai-raises-500m-series-a-at-3-5b-valuation-to-master-human-level-dexterity-in-general-purpose-robots-and-deploy-at-scale-302941249.html)，2026-11-17。

### 16. Humyn Labs 获得四千七百万美元股权与债务融资

11 月 18 日，Humyn Labs 宣布获得 4700 万美元 A 轮融资，其中 2600 万美元股权融资由 Accel 领投，2100 万美元风险债务由 Lighthouse Canton 领投、Trifecta Capital 参与。

公司使用专有设备记录工厂、仓库、农场及家庭中的人类作业，将视觉、声音、动作与触觉信息转为训练数据，并称已在二十多个国家开展采集和数据加工。资金将支持巴西、韩国及印度的部署准备基础设施、采集硬件与数据引擎，以及旧金山、伦敦和首尔的业务布局。

来源：[Humyn Labs](https://humynlabs.ai/blog/humyn-labs-raises-usd-47m-in-series-a)，2026-11-18。

### 17. 原力无限完成数千万元 Pre-B 轮融资

11 月 19 日，原力无限（INFIFORCE）宣布完成数千万元人民币 Pre-B 轮融资，由杭州资本独家投资。公司表示，融资将重点投入具身大脑 AtomBrain 研发、真实场景拓展和产业化落地。

来源：[界面新闻](https://m.jiemian.com/article/15349865.html)，2026-11-19。

### 18. 罗克韦尔自动化签署收购 AGILOX 的最终协议

11 月 18 日，罗克韦尔自动化宣布签署最终协议，拟收购奥地利自主移动机器人企业 AGILOX。其叉车式 AMR 将与 OTTO 平板式 AMR 平台组成互补产品组合，覆盖生产物流与仓储物料运输。

罗克韦尔称，交易将使其 AMR 业务规模扩大至原来的两倍以上，并结合 OTTO 在北美与 AGILOX 在欧洲的业务布局。交易仍需满足交割条件并获得监管批准，预计于罗克韦尔 2027 财年第二季度完成；交割后 AGILOX 将归入 Intelligent Devices 业务部门。

来源：[罗克韦尔自动化](https://www.rockwellautomation.com/en-au/company/news/press-releases/Rockwell-Automation-Signs-Definitive-Agreement-to-Acquire-AGILOX.html)，2026-11-18；[凯雷](https://www.carlyle.com/media-room/news-release-archive/carlyle-agrees-sell-agilox-rockwell-automation)，2026-11-18。

### 19. 工信部发布五项人形机器人行业标准

11 月 16 日，工信部发布 2026 年第 30 号公告，发布五项由人形机器人与具身智能标准化技术委员会归口管理的行业标准，涉及电驱动一体化关节、灵巧手、训练场构建、训练数据管理和智能化能力分级，均自发布之日起实施。

其中，智能化能力分级围绕感知认知、决策学习、执行表现和协作交互四个维度设置 L0—L5 框架；训练相关标准涵盖场地设施、采集与验证，以及数据全生命周期管理。

来源：[澎湃新闻](https://www.thepaper.cn/newsDetail_forward_34492647?commTag=true)，2026-11-17；[IT之家](https://www.ithome.com/1/028/746.htm)，2026-11-18。

### 20. LG 与韩国机器人产业振兴院合作建设人形机器人评价体系

11 月 16 日，LG 电子公布与韩国机器人产业振兴院（KIRIA）的合作，参与人形机器人安全认证中心评价体系建设，以及相关国际和国家标准开发。双方于 11 月 13 日在首尔签署合作备忘录。

LG 计划推动 CLOiD 等人形机器人取得韩国安全试点认证，并计划在 2027 年第一季度公开基于双足行走的 NVIDIA 参考机器人。

来源：[韩联社／Financial News](https://www.fnnews.com/news/202611161000326317)，2026-11-16。
