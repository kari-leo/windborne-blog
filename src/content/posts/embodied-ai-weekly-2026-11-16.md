---
title: 具身智能行业周报｜2026-11-16
published: 2026-11-16
updated: 2026-11-16
description: 23 条具身智能新闻，覆盖 Gemini Robotics 2.5、Runway Praxis-1、华硕 Gallop、仓储应用、机器人融资与产业政策。
tags: [具身智能, 行业周报]
---

本期汇集 **2026 年 11 月 9—15 日**公开发布或更新的 23 条具身智能新闻，覆盖机器人模型与数据、整机与零部件、应用合作、融资及产业政策。编制日期：11 月 16 日。

## 模型、数据与开发工具

### 1. Google DeepMind 发布 Gemini Robotics 2.5

11 月 10 日，Google DeepMind 发布视觉语言动作模型 Gemini Robotics 2.5，提升机器人学习新技能、使用工具及操作柔性物体的能力，并向机器人合作伙伴推出。

Google 同时披露，在梅赛德斯－奔驰生产线的概念验证中，Apptronik Apollo 2 通过 Gemini Robotics ER 跟踪工作流、由 Robotics 2.5 控制手臂，将金属汽车支架从供料箱放入配料容器，任务成功率达到 96%。

来源：[Google DeepMind，11 月 10 日](https://deepmind.google/blog/gemini-robotics-2-5-accelerates-real-world-physical-intelligence/)。

### 2. Runway 开放 Praxis-1 模型权重及训练代码

11 月 11 日，Runway 向所有开发者开放世界动作模型 Praxis-1。该模型采用 270 亿参数的混合专家扩散 Transformer，联合预测视频与机器人动作；权重、推理及微调代码采用 Apache 2.0 许可，支持商业使用、全量微调与 LoRA。

Runway 公布其在 RoboLab-120 的 1200 次仿真评测中取得 46.2% 成功率。此前参与测试的 Noble Machines、Standard Bots 和 Ultra，分别将模型用于人形机器人、六轴工业机械臂和双臂仓储机器人。

来源：[Runway，11 月 11 日](https://runway.com/news/company-news/praxis-1-is-now-available)。

### 3. 智元 LIFE 项目更新 RoboBeats 实时推理功能

11 月 10 日，智元 LIFE 项目更新实时 RoboBeats，加入逐帧推理、缓存复用、自定义条件，以及可接入摄像头或视频的本地网页演示。

LIFE 将持续观察、选择性记忆与技能复用结合；RoboBeats 负责检测视频流中的事件和条件变化，选择需要响应或写入记忆的观察。本次更新延续了此前已公开的 0.8B、2B、4B 模型及 SSS-Bench 评测资源。

来源：[智元 LIFE 官方代码仓库，11 月 10 日更新](https://github.com/AgibotTech/LIFE)。

### 4. Ropedia 发布 Xperience 2 具身数据集

11 月 13 日，Ropedia 发布 Xperience 2，配套技术报告于 11 月 12 日提交。数据集包含 1589 个具有真实尺度的三维扫描场景，以及覆盖 74 类任务、共 4230 段和 131 小时的第一人称行为记录。

团队展示了将扫描场景转为可物理交互的仿真环境、把人体动作重定向到机器人全身轨迹，以及通过虚拟遥操作和自动长程轨迹生成扩展机器人行为的方法。

来源：[Xperience 2 技术报告](https://arxiv.org/abs/2611.17060)；[Ropedia 发布稿，11 月 13 日](https://menafn.com/1111958498/Ropedia-Introduces-Xperience-2-As-The-Gold-Standard-To-Scaling-Physical-AI-Data-Infrastructure)。

### 5. Eden 机器人学习框架亮相

11 月 14 日，Eden 团队公布基于 Genesis 的机器人学习框架，以统一任务定义连接仿真训练和真机部署。开发者可在同一配置中定义场景、观察、动作、奖励及训练流程，进行 GPU 并行训练，并将策略部署到 MuJoCo 或真实机器人。

项目支持人形机器人、四足机器人、机械臂与灵巧手，提供动作重定向、遥操作及示范数据采集工具，采用 Apache 2.0 许可。

来源：[Eden 官方项目文档](https://embodied-ai-nexus.github.io/Eden/)；[11 月 14 日发布消息](https://digg.com/ai/e4tnm5q8)。

## 整机与核心零部件

### 6. 华硕披露首款人形机器人 Gallop 的工厂试验

11 月 13 日，华硕介绍首款人形机器人 Gallop。机器人正在集团电子制造工厂学习主板配件包装，工位涉及 15 件小配件；华硕设定的目标是在 20 秒内完成任务、成功率达到 99.5%。

当前 Gallop 采用固定底座和双臂，搭载单颗 NVIDIA Jetson AGX Thor，通过工人示范、仿真和 VR 遥操作训练。华硕计划继续集成自研触觉灵巧手并开发轮式版本，2027 年开展客户试点，目标于 2028 年下半年上市。

来源：[华硕官方介绍，11 月 13 日](https://press.asus.com/blog/factory-proven-physical-ai-asus-gallop-humanoid-robot/)。

### 7. 波士顿动力展示轮足版 Atlas 全身控制实验

11 月 9 日，波士顿动力发布“Atlas on a Roll”，为 Atlas 的踝关节安装滑板车轮，展示横向滑行、旋转和 360 度跳跃。

该研究平台结合电机底层控制与全身强化学习，通过匹配仿真与真实执行器的动力学，测试高扭矩、高转速和持续负载下的控制表现。团队表示，实验所得经验正用于标准双足 Atlas 的控制开发。

来源：[波士顿动力官方技术文章](https://bostondynamics.com/blog/atlas-on-a-roll/)。

### 8. 银河通用 ET1 获 CES 2027 机器人类最佳创新奖

本周公布的 CES 2027 创新奖名单中，银河通用双足人形机器人 Galbot ET1 获得机器人类别 Best of Innovation。

CES 产品页介绍，ET1 搭载银河通用的 AstraBrain 系统，可感知环境、理解指令并规划动作；其 AstraBrain-WBC 运动模型支持从人体示范学习动作，无需使用动作捕捉设备。

来源：[CES 官方获奖页面](https://www.ces.tech/ces-innovation-awards/2027/galbot-et1/)；[界面新闻，11 月 10 日](https://www.jiemian.com/article/15317678.html)。

### 9. Melexis 推出 MLX90901 触觉指尖模组

11 月 12 日，Melexis 发布 MLX90901 Tactile Fingertip Module，用于人形机器人的灵巧手。模组基于 Tactaxis 技术，可感知法向力和剪切力，提供三维接触力信息。

这是 Melexis 首款机电一体化模组，将传感技术与机械结构、材料及集成支持打包，供机器人开发者评估和集成触觉能力。

来源：[Melexis 官方公告，11 月 12 日](https://www.melexis.com/bg/news/2026/12nov2026-tactile-fingertip-module-sense-of-touch-humanoid-robots)。

### 10. Genki Robotics 在日本首相官邸展示人形机器人

11 月 12 日，Android 联合创始人 Andy Rubin 创办的 Genki Robotics，在日本首相官邸举行的物理 AI 企业交流会上首次公开展示人形机器人实机。

据现场介绍，该机型的零件于前一周周五到齐，团队在周末完成装配，随后于周一首次行走。公司正推进首款产品机型，并计划利用日本执行器、相机及零部件供应链开展研发。

来源：[Humanoids Daily，11 月 13 日](https://www.humanoidsdaily.com/news/genki-robotics-humanoid-debut-takaichi-kantei)。

## 应用落地与商业合作

### 11. GXO 与 Apptronik 签署 Apollo 扩展合作意向书

11 月 12 日，GXO 宣布与 Apptronik 签署意向书，计划自 2027 年起扩大 Apollo 仓储试验，候选任务包括拣选、箱与料箱搬运、包装和分拣。

双方拟在满足约定的性能、安全及运营 KPI 后，于未来四年推进最多 1000 台 Apollo 的全球部署，北美初始部署预计在 2027 年末，商业框架拟采用机器人即服务（RaaS）。GXO 同时披露，Apollo 今年已完成一个美国小件消费品自主拣选试点。

来源：[GXO 官方公告，11 月 12 日](https://investors.gxo.com/news-releases/news-release-details/gxo-and-apptronik-expand-partnership-scale-humanoid-deployment)。

### 12. 优必选与永达汽车签约，首批采购 400 台 U1 Pro

11 月 11 日，优必选与永达汽车签署战略合作协议。永达汽车首批采购 400 台 U1 Pro 超仿生人形机器人，优必选计划在年内交付。

这批机器人将用于产品体验、销售推广和客户服务等业务。双方还计划在上海共建优必选全系列机器人体验展示中心。

来源：[红星新闻，11 月 12 日](https://static.cdsb.com/micropub/Articles/202611/3b08f0513d7a37d5c8443d846ca463c7.html)。

### 13. 菜鸟华南仓 135 台攀爬机器人参与双十一

11 月 11 日，广州日报报道，广州增城天猫超市华南仓的 135 台攀爬机器人首次参与双十一物流保障。机器人从九米多高的货架取出料箱并送至人工工作站，再由工作人员完成商品拣选。

仓库负责人介绍，该区域于 9 月开始实单测试，用 2000 多平方米承接原先 1 万多平方米相关区域的作业，并在双十一期间处理约日常三倍的单量。

来源：[广州日报新花城，11 月 11 日](https://huacheng.gz-cmc.com/pages/2026/11/11/154c45c3d3eb41d386479c732b912b53.html)。

### 14. 昆腾动力机器人进入菜鸟双十一现场

11 月 11 日，昆腾动力披露，其具身机器人首次进入菜鸟供应链双十一作业现场。公司称，通用双臂机器人已在称重、供包等岗位完成部署验证，供包效率超过每小时 1200 件、成功率达到 99%，已获得合计近 5000 台机器人批量订单。

公司还披露了跨境电商仓项目进展：9 月机器人进仓，10 月开始签署批量采购合同。昆腾动力计划于 12 月底发布一款新构型机器人。

来源：[36 氪刊载企业信息，11 月 11 日](https://www.36kr.com/p/4065235763581828)。

### 15. DHL 将 AI 调度引入实际运营仓库

11 月 9 日，DHL Supply Chain 宣布，在完成概念验证后，将 AI 调度引入实际运营仓库，并继续试点能够感知环境、根据任务目标调整动作的自适应机器人。

相关工作流连接自主移动机器人、自动包装设备与仓储管理系统，按订单需求协调资源。DHL 同时披露，其全球网络累计部署超过 9000 台机器人，累计完成超过 15 亿次机器人拣选和 1000 万箱机器人卸货。

来源：[DHL 官方公告，11 月 9 日](https://www.dhl.com/us-en/home/press/press-archive/2026/dhl-supply-chain-doubles-down-on-digitalization-strategy-pilots-adaptive-robotics-and-ai-orchestration.html)。

### 16. Serve Robotics 向开发者开放机器人配送网络

11 月 11 日，Serve Robotics 推出 AV Delivery Developer Portal，通过按需配送 API，允许独立开发者、商家和 AI 助手在其机器人网络上构建配送服务。

公告介绍，该网络拥有 2000 台机器人，覆盖美国 20 座城市、150 多个社区。此前主要通过第三方配送平台提供的运力，将向更多本地服务开放。

来源：[Serve Robotics 官方公告，11 月 11 日](https://ir.serverobotics.com/node/10051/pdf)。

## 融资、政策与企业动态

### 17. 思灵机器人完成 5 亿美元 F 轮融资

11 月 12 日，Agile Robots（思灵机器人）宣布完成 5 亿美元 F 轮融资，估值达到 85 亿美元，累计融资约 20 亿美元。

本轮由软银集团领投，英伟达、日立集团及 T.Capital 等参与。资金将用于美国市场拓展、德国等地的产能建设和新应用开发。公司提供机械臂、灵巧手、移动机器人、人形机器人及配套软件。

来源：[Agile Robots 官方公告，正文日期 11 月 12 日](https://www.agile-robots.com/en/news/detail/physical-ai-leader-agile-robots-raises-500-million-series-f-funding/)。

### 18. Path Robotics 完成 3 亿美元 E 轮融资

11 月 10 日，Path Robotics 宣布完成由 Georgian 领投的 3 亿美元 E 轮融资，投后估值为 24.5 亿美元。

公司从机器人焊接切入工业物理 AI，计划继续扩展焊接业务，并加大数据、算力和模型研发投入，向焊接前后更多制造工序拓展。

来源：[Path Robotics 官方公告，11 月 10 日](https://www.path-robotics.com/news/path-robotics-announces-300-million-series-e-led-by-georgian)。

### 19. 优理奇机器人完成 5 亿元 Pre-A 轮融资

11 月 9 日，优理奇机器人宣布完成 5 亿元 Pre-A 轮融资。老股东谢诺投资、涌铧投资追加投资，绿地集团、柯力传感、华工创投、新景富盈、红鸟启航基金和玉林产投等参与。

绿地集团以战略投资人身份加入，双方将围绕安保、酒店和康养场景，推进机器人模型、本体、数据及解决方案的应用合作。

来源：[新京报报道，11 月 9 日](https://finance.eastmoney.com/a/202611093926215564.html)。

### 20. 曦选创智完成 5 亿元天使轮融资

11 月 11 日，曦选创智完成 5 亿元天使轮融资的消息披露，本轮由纪源资本、经纬创投联合领投。公司由沐曦股份与优必选共同发起，资金将用于机器人端侧芯片及计算平台研发、软件工具链建设、团队扩充和客户联合验证。

来源：[上海证券报·中国证券网，11 月 11 日](https://finance.eastmoney.com/a/202611113928712954.html)。

### 21. 纬钛机器人完成 A 轮融资

本周，纬钛机器人宣布完成 A 轮融资，由中车资本、永鑫方舟联合领投，鲁信创投、木棉花基金、银杏谷资本及华仓资本等跟投。公司聚焦视触觉传感与机器人感知。

来源：[证券之星，11 月 12 日](https://wap.stockstar.com/detail/RB2026111200036510)。

### 22. 北京发布 2026—2028 年具身智能机器人产业行动方案

11 月 11 日，北京市经济和信息化局发布《北京市具身智能机器人产业高质量发展行动方案（2026—2028 年）》。

方案提出，到 2028 年培育不少于 5 家国际一流、10 家国内领先的人形机器人整机企业，京津冀区域整机产能占全国 25%，关键零部件配套率超过 60%。重点方向包括 VLA、世界模型、强化学习、跨本体迁移、实时推理、自学习及轻量化部署。

来源：[北京市政府官方文件，11 月 11 日](https://www.beijing.gov.cn/zhengce/gfxwj/202611/t20261111_4942067.html)。

### 23. OpenAI 调整机器人团队组织架构

11 月 13 日，Fortune 报道 OpenAI 将独立机器人团队并入其他部门，OpenAI 向媒体确认了调整。机器人研究人员转入首席研究官 Mark Chen 负责的核心研究团队，应用机器人和硬件人员转入 Greg Brockman 负责的 Applied 部门。

公司表示，机器人仍是长期战略的一部分，此次调整旨在加快相关研发。

来源：[Benzinga，11 月 13 日](https://www.benzinga.com/markets/private-markets/26/11/63266906/openai-dismantles-standalone-robotics-team-as-it-bets-on-bigger-ai-models)。
