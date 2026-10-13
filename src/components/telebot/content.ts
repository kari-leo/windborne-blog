export const overviewSections = [
	{ id: "demo", title: "任务演示" },
	{ id: "evolution", title: "产品演进" },
	{ id: "documents", title: "项目文档" },
];

export const taskCases = [
	{
		id: "files",
		label: "远程取文件",
		kicker: "人在外面，也能拿到电脑里的资料",
		title: "文件直接回到原会话",
		request: "帮我找到面试资料里的简历，发到这里。",
		goal: "找到并取回一份本机文件。",
		input: "大致目录与文件特征。",
		delivery: "飞书收到目标文件，可直接打开。",
		decision: "支持模糊描述与目录探索，在目标不明确时收敛候选文件。",
		video: "file-transfer.mp4",
		videoLabel: "TeleBot 文件收发功能演示",
		document: "telebot-product-case",
		linkLabel: "阅读完整产品说明",
	},
	{
		id: "blog",
		label: "博客整理与发布",
		kicker: "整理好的内容，直接进入博客项目",
		title: "从内容生成，到发布交付",
		request: "把这次整理的笔记写成博客，准备发布。",
		goal: "把整理结果写成博客文章。",
		input: "内容来源、目标项目与发布意图。",
		delivery: "Markdown 草稿与发布结果返回原会话。",
		decision: "内容落盘与对外发布分成两个阶段，推送前展示操作并确认。",
		video: "blog-publishing.mp4",
		videoLabel: "TeleBot 博客推送功能演示",
		document: "telebot-product-case",
		linkLabel: "阅读完整产品说明",
	},
	{
		id: "schedule",
		label: "定时委托",
		kicker: "每天凌晨 · 秋招岗位文档更新",
		title: "岗位持续更新，变更表自动返回",
		request:
			"在job_workspace目录下用codex调用里面的autumn-recruiment skill，更新机器人/具身智能产品经理 相关的岗位，将新增和修改的部分总结成一个表格发给我。",
		goal: "每天凌晨更新机器人 / 具身智能产品经理相关的秋招岗位。",
		input:
			"job_workspace 工作区、Codex、autumn-recruiment Skill，以及执行时间与授权范围。",
		delivery: "更新后的岗位文档，及新增 / 修改岗位的汇总表。",
		decision:
			"首次设定时间和授权后，按计划自行执行；对比文档更新前后，只汇总本次新增与修改项。",
		video: "scheduled-trigger.mp4",
		videoLabel: "TeleBot 定时委托功能演示",
		document: "telebot-scheduled-prd",
		linkLabel: "阅读定时委托 PRD",
	},
];

export const documentDetails = {
	"telebot-product-case": {
		kind: "产品说明",
		title: "当前产品与使用案例",
		description: "主要功能、实际任务与产品演进。",
		preview: "product",
		action: "阅读产品说明",
		order: 1,
	},
	"telebot-prd-mvp": {
		kind: "初始 PRD",
		title: "从远程取文件开始",
		description: "首个 MVP 的目标、范围与产品取舍。",
		preview: "mvp",
		action: "阅读初始 PRD",
		order: 2,
	},
	"telebot-scheduled-prd": {
		kind: "迭代 PRD",
		title: "任务定时触发",
		description: "以秋招岗位文档为例，设计调度、Skill 调用与变更表交付。",
		preview: "schedule",
		action: "阅读迭代 PRD",
		order: 3,
	},
};
