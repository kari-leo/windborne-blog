export type DemoProduct = "homeagent" | "retask";
export type DemoSample =
	| "normal"
	| "occupied"
	| "dropped"
	| "obstacle"
	| "sort-full";
export type DemoStatus = "idle" | "running" | "success" | "fault" | "stopped";
export interface Vec3 {
	x: number;
	y: number;
	z: number;
}
export interface DemoBox {
	name: string;
	center: Vec3;
	size: Vec3;
}
export interface Body {
	position: Vec3;
	velocity: number;
	landed: string;
}
export interface DemoStage {
	id: string;
	label: string;
	duration: number;
}
export interface DemoEvent {
	time: number;
	side: string;
	message: string;
}
export interface TerminalStatus {
	name: string;
	task: string;
	status: string;
	detail: string;
}
export const samples: Record<
	DemoProduct,
	{ id: DemoSample; name: string; description: string }[]
> = {
	homeagent: [
		{
			id: "normal",
			name: "正常送书",
			description: "沿预设轨迹取书，释放后由重力落到交付台，验证放置。",
		},
		{
			id: "occupied",
			name: "交付区占用",
			description: "在交付台上放入占位箱，检测重叠后停止放置，保留夹持。",
		},
		{
			id: "dropped",
			name: "书籍掉落",
			description: "降低运输段夹持保持力，书籍脱离夹具后受重力落地，任务终止。",
		},
	],
	retask: [
		{
			id: "normal",
			name: "搬运与分类完成",
			description: "A 工位搬运补料，迁移至 B 后按物品颜色标签选择对应分拣区。",
		},
		{
			id: "obstacle",
			name: "授权区域内绕障",
			description:
				"迁移时检测到固定位置的障碍，在授权区域内切换局部跟踪路线，继续完成分拣。",
		},
		{
			id: "sort-full",
			name: "分拣目标区满载",
			description:
				"蓝色物品的对应分拣区已被占满，无法改投其他类别，任务停止并报告未完成。",
		},
	],
};
const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 =>
	v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
export const distance = (a: Vec3, b: Vec3): number =>
	Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export function boxesOverlap(a: DemoBox, b: DemoBox): boolean {
	return (["x", "y", "z"] as const).every(
		(axis) =>
			Math.abs(a.center[axis] - b.center[axis]) <
			(a.size[axis] + b.size[axis]) / 2,
	);
}
// Sweep the robot centre against an obstacle expanded by the base footprint.
export function sweptCollision(
	from: Vec3,
	to: Vec3,
	obstacle: DemoBox,
	radius = 0.38,
): boolean {
	let enter = 0;
	let exit = 1;
	for (const axis of ["x", "z"] as const) {
		const low = obstacle.center[axis] - obstacle.size[axis] / 2 - radius;
		const high = obstacle.center[axis] + obstacle.size[axis] / 2 + radius;
		const delta = to[axis] - from[axis];
		if (Math.abs(delta) < 1e-9) {
			if (from[axis] < low || from[axis] > high) return false;
		} else {
			const first = (low - from[axis]) / delta;
			const last = (high - from[axis]) / delta;
			enter = Math.max(enter, Math.min(first, last));
			exit = Math.min(exit, Math.max(first, last));
			if (enter > exit) return false;
		}
	}
	return true;
}

export interface RouteBounds {
	minX: number;
	maxX: number;
	minZ: number;
	maxZ: number;
}
export function insideRouteBounds(
	point: Vec3,
	bounds: RouteBounds,
	radius = 0.38,
): boolean {
	return (
		point.x - radius >= bounds.minX &&
		point.x + radius <= bounds.maxX &&
		point.z - radius >= bounds.minZ &&
		point.z + radius <= bounds.maxZ
	);
}
export function routeLength(points: Vec3[]): number {
	return points
		.slice(1)
		.reduce((sum, point, i) => sum + distance(points[i], point), 0);
}
export function selectLocalRoute(
	start: Vec3,
	goal: Vec3,
	templates: Vec3[][],
	obstacles: DemoBox[],
	bounds: RouteBounds,
): Vec3[] | null {
	for (const template of templates) {
		const path = [start, ...template, goal].map((point) => ({ ...point }));
		if (!path.every((point) => insideRouteBounds(point, bounds))) continue;
		if (
			path
				.slice(1)
				.some((point, i) =>
					obstacles.some((box) => sweptCollision(path[i], point, box)),
				)
		)
			continue;
		return path;
	}
	return null;
}
export function pathPosition(points: Vec3[], progress: number): Vec3 {
	const lengths = points.slice(1).map((point, i) => distance(points[i], point));
	let remaining =
		Math.max(0, Math.min(1, progress)) * lengths.reduce((a, b) => a + b, 0);
	for (let i = 0; i < lengths.length; i++) {
		if (remaining <= lengths[i])
			return lerp(
				points[i],
				points[i + 1],
				lengths[i] ? remaining / lengths[i] : 0,
			);
		remaining -= lengths[i];
	}
	return { ...points[points.length - 1] };
}
export function stepGravity(
	body: Body,
	size: Vec3,
	dt: number,
	supports: DemoBox[],
): void {
	if (body.landed) return;
	const bottom = body.position.y - size.y / 2;
	const nextY = body.position.y + body.velocity * dt - 0.5 * 9.81 * dt * dt;
	body.velocity -= 9.81 * dt;
	const support = supports
		.filter((box) => {
			const top = box.center.y + box.size.y / 2;
			return (
				bottom >= top - 1e-7 &&
				nextY - size.y / 2 <= top &&
				Math.abs(body.position.x - box.center.x) + size.x / 2 <=
					box.size.x / 2 &&
				Math.abs(body.position.z - box.center.z) + size.z / 2 <= box.size.z / 2
			);
		})
		.sort((a, b) => b.center.y + b.size.y / 2 - (a.center.y + a.size.y / 2))[0];
	if (support) {
		body.position.y = support.center.y + support.size.y / 2 + size.y / 2;
		body.velocity = 0;
		body.landed = support.name;
	} else body.position.y = nextY;
}
export interface DemoScene {
	product: DemoProduct;
	itemSize: Vec3;
	itemMass: number;
	holdForce: number;
	start: Vec3;
	stationA: Vec3;
	stationB: Vec3;
	actualB: Vec3;
	sourceA: Vec3;
	sourceB: Vec3;
	targetA: DemoBox;
	targetB: DemoBox;
	supports: DemoBox[];
	obstacles: DemoBox[];
	routeA: Vec3[];
	routeB: Vec3[];
	routeBounds: RouteBounds;
	localRoutes: Vec3[][];
	sortCategory: "blue" | "amber";
	sortTargets: Record<"blue" | "amber", DemoBox>;
	stages: DemoStage[];
}
export function createScene(
	product: DemoProduct,
	sample: DemoSample,
): DemoScene {
	const home = product === "homeagent";
	const itemSize = home ? v(0.52, 0.1, 0.34) : v(0.5, 0.32, 0.42);
	const table = (name: string, x: number): DemoBox => ({
		name,
		center: v(x, 0.7, -1.4),
		size: v(1.2, 0.1, 0.9),
	});
	const targetA = table("A 补料台", -1.3);
	const sortTargets = {
		blue: table("B 蓝色分拣区", 4.2),
		amber: { ...table("B 琥珀色分拣区", 4.2), center: v(4.2, 0.7, 0.2) },
	};
	const sortCategory = sample === "obstacle" ? "amber" : "blue";
	const targetB = home ? table("床边交付台", 3) : sortTargets[sortCategory];
	const stationA = v(home ? -3 : -2.4, 0, 0);
	const stationB = v(home ? 3 : 3.1, 0, 0);
	const actualB = { ...stationB };
	const start = home ? v(-4.2, 0, 2) : { ...stationA };
	const sourceA = v(-3, 0.75 + itemSize.y / 2, -1.4);
	const sourceB = v(2.4, 0.75 + itemSize.y / 2, -1.4);
	const obstacles: DemoBox[] =
		sample === "occupied"
			? [
					{
						name: "交付区占位箱",
						center: v(3, 1, -1.4),
						size: v(0.8, 0.5, 0.6),
					},
				]
			: sample === "obstacle"
				? [{ name: "迁移障碍箱", center: v(0, 0.5, 2), size: v(0.7, 1, 0.85) }]
				: sample === "sort-full"
					? [
							{
								name: "蓝色区满载物料",
								center: v(4.2, 1, -1.4),
								size: v(1, 0.5, 0.7),
							},
						]
					: [];
	const supports = [
		{ name: "地面", center: v(0, -0.1, 0), size: v(12, 0.2, 8) },
		table(home ? "客厅取书台" : "A 待搬运物料", -3),
		targetB,
	];
	if (!home)
		supports.push(
			targetA,
			table("B 待分拣物料", 2.4),
			sortTargets[sortCategory === "blue" ? "amber" : "blue"],
		);
	const stage = (id: string, label: string, duration: number): DemoStage => ({
		id,
		label,
		duration,
	});
	return {
		product,
		itemSize,
		itemMass: home ? 0.4 : 1.2,
		holdForce: sample === "dropped" ? 1 : 25,
		start,
		stationA,
		stationB,
		actualB,
		sourceA,
		sourceB,
		targetA,
		targetB,
		supports,
		obstacles,
		routeA: [start, v(-3, 0, 2), stationA],
		routeB: [stationA, v(stationA.x, 0, 2), v(actualB.x, 0, 2), actualB],
		routeBounds: { minX: -4.2, maxX: 4.5, minZ: -0.6, maxZ: 3.25 },
		localRoutes: [
			[
				v(-1.2, 0, 2),
				v(-1.2, 0, 1),
				v(1.2, 0, 1),
				v(1.2, 0, 2),
				v(stationB.x, 0, 2),
			],
		],
		sortCategory,
		sortTargets,
		stages: home
			? [
					stage("dispatch", "中控下发取书任务", 0.7),
					stage("moveA", "沿固定轨迹前往取书台", 2.2),
					stage("pickA", "夹取并抬升书籍", 1.8),
					stage("moveB", "沿固定轨迹运送", 5),
					stage("checkTarget", "检测交付区占用", 0.7),
					stage("placeB", "将书移至交付台上方", 1.8),
					stage("settleB", "释放、重力落定与放置验证", 0.8),
				]
			: [
					stage("dispatch", "中控下发工位任务", 0.7),
					stage("pickA", "A 工位夹取待搬运物料", 1.5),
					stage("placeA", "A 工位搬运至补料台", 1.5),
					stage("settleA", "验证 A 搬运并安全退出", 0.8),
					stage("moveB", "沿固定轨迹迁移至 B", 5),
					stage("configureB", "加载 B 工位分拣规则", 0.7),
					stage("classifyB", "读取颜色标签并选择类别分拣区", 1),
					stage("checkSort", "检查对应分拣区剩余空间", 0.7),
					stage("pickB", "B 工位夹取待分拣物料", 1.5),
					stage("placeB", "B 工位投入对应类别分拣区", 1.5),
					stage("settleB", "释放、重力落定与放置验证", 0.8),
				],
	};
}
export interface DemoSnapshot {
	status: DemoStatus;
	stage: number;
	stageTime: number;
	elapsed: number;
	robot: Vec3;
	grip: Vec3;
	itemA: Body;
	itemB: Body;
	held: "A" | "B" | null;
	dropping: boolean;
	reason: string;
	evidence: string;
	completed: number;
	events: DemoEvent[];
	detours: number;
	activeRoute: Vec3[];
}
export class DemoSimulation {
	readonly scene: DemoScene;
	state: DemoSnapshot;
	private gripStart: Vec3;
	private replanPause = 0;
	constructor(product: DemoProduct, sample: DemoSample = "normal") {
		this.scene = createScene(product, sample);
		this.state = {
			status: "idle",
			stage: 0,
			stageTime: 0,
			elapsed: 0,
			robot: { ...this.scene.start },
			grip: this.carryPoint(this.scene.start),
			itemA: { position: { ...this.scene.sourceA }, velocity: 0, landed: "" },
			itemB: { position: { ...this.scene.sourceB }, velocity: 0, landed: "" },
			held: null,
			dropping: false,
			reason: "",
			evidence: "等待运行样例",
			completed: 0,
			events: [],
			detours: 0,
			activeRoute: this.scene.routeB.map((point) => ({ ...point })),
		};
		this.gripStart = { ...this.state.grip };
	}
	get phase(): string {
		return this.scene.stages[this.state.stage]?.id ?? "complete";
	}
	get label(): string {
		if (this.replanPause > 0) return "暂停执行，校验授权区域内局部路线";
		if (this.phase === "moveB" && this.state.detours)
			return "跟踪授权区域内局部路线";
		return this.scene.stages[this.state.stage]?.label ?? "任务完成";
	}
	private carryPoint(robot: Vec3): Vec3 {
		return v(robot.x, 1.2, robot.z - 0.65);
	}
	private event(side: string, message: string): void {
		this.state.events.push({ time: this.state.elapsed, side, message });
	}
	start(): void {
		if (this.state.status !== "idle") return;
		this.state.status = "running";
		this.state.evidence = "等待中控下发固定轨迹指令";
		this.event(
			"用户端",
			this.scene.product === "homeagent"
				? "提交：把客厅的书送到床边"
				: "提交：A 工位搬运补料，B 工位按颜色分类",
		);
		this.event(
			"中控端",
			this.scene.product === "homeagent"
				? "接受任务，调用预设轨迹与任务参数"
				: "接受任务，加载工位任务与迁移路线",
		);
	}
	stop(): void {
		if (this.state.status !== "running") return;
		this.state.status = "stopped";
		this.state.reason = "用户主动停止，本次任务未完成";
		this.event("机器人本体端", "停止轨迹执行，保持当前姿态");
		this.event("用户端", "收到停止结果");
	}
	private fail(reason: string): void {
		this.state.status = "fault";
		this.state.reason = reason;
		this.event("机器人本体端", reason);
		this.event("中控端", "终止后续指令，记录未完成原因");
		this.event("用户端", "收到异常通知，任务未完成");
	}
	step(seconds: number): void {
		if (!Number.isFinite(seconds) || seconds <= 0) return;
		let remaining = Math.min(seconds, 0.25);
		while (remaining > 1e-8 && this.state.status === "running") {
			const dt = Math.min(remaining, 1 / 120);
			this.advance(dt);
			remaining -= dt;
		}
	}
	private advance(dt: number): void {
		const s = this.state;
		s.elapsed += dt;
		if (this.replanPause > 0) {
			this.replanPause = Math.max(0, this.replanPause - dt);
			return;
		}
		if (s.dropping) {
			stepGravity(s.itemA, this.scene.itemSize, dt, this.scene.supports);
			s.evidence = `物体高度 ${s.itemA.position.y.toFixed(2)} m · 重力 9.81 m/s²`;
			if (s.itemA.landed) this.fail("夹持保持力不足，书籍已落地；停止运送");
			return;
		}
		s.stageTime += dt;
		const stage = this.scene.stages[s.stage];
		const p = Math.min(s.stageTime / stage.duration, 1);
		const id = stage.id;
		if (id === "moveA" || id === "moveB") {
			const next = pathPosition(
				id === "moveA" ? this.scene.routeA : s.activeRoute,
				p,
			);
			if (
				this.scene.obstacles.some((obstacle) =>
					sweptCollision(s.robot, next, obstacle),
				)
			) {
				if (
					this.scene.product === "retask" &&
					id === "moveB" &&
					s.detours < 2
				) {
					this.event(
						"机器人本体端",
						"检测到路线障碍，暂停底盘并切换局部跟踪路线",
					);
					const route = selectLocalRoute(
						s.robot,
						this.scene.stationB,
						this.scene.localRoutes,
						this.scene.obstacles,
						this.scene.routeBounds,
					);
					if (route) {
						s.activeRoute = route;
						s.detours++;
						s.stageTime = 0;
						stage.duration = Math.max(1, routeLength(route) / 1.9);
						this.replanPause = 0.75;
						s.evidence = "局部路线无碰撞 · 全部位于授权区域内";
						this.event(
							"中控端",
							"授权边界内继续执行；本体局部路线已通过包络校验",
						);
						return;
					}
				}
				s.evidence = "底盘扫掠包络与障碍重叠，授权区域内无可行路线";
				this.fail("授权区域内无法绕过障碍，本体已安全停止");
				return;
			}
			s.robot = next;
			s.grip = this.carryPoint(next);
			if (s.held)
				s[s.held === "A" ? "itemA" : "itemB"].position = { ...s.grip };
			s.evidence = `${s.detours ? "局部路线" : this.scene.product === "homeagent" ? "预设轨迹" : "迁移路线"}进度 ${Math.round(p * 100)}% · 底盘包络无重叠`;
			if (
				s.held === "A" &&
				p > 0.35 &&
				this.scene.holdForce < this.scene.itemMass * 9.81
			) {
				s.held = null;
				s.dropping = true;
				s.evidence = `保持力 ${this.scene.holdForce.toFixed(1)} N < 重力 ${(this.scene.itemMass * 9.81).toFixed(2)} N`;
				this.event("机器人本体端", `${s.evidence}，停止底盘并检测物体掉落`);
				this.event("中控端", "暂停轨迹，等待掉落检测结果");
				return;
			}
		} else if (id === "pickA" || id === "pickB") {
			const key = id === "pickA" ? "A" : "B";
			const source = key === "A" ? this.scene.sourceA : this.scene.sourceB;
			const contact = lerp(this.gripStart, source, Math.min(p / 0.4, 1));
			if (p < 0.4) s.grip = contact;
			else {
				s.held = key;
				s.grip = lerp(source, this.carryPoint(s.robot), (p - 0.4) / 0.6);
				s[key === "A" ? "itemA" : "itemB"].position = { ...s.grip };
			}
			s.evidence = "简化夹持约束 · 按固定夹取动作执行";
		} else if (id === "checkTarget") {
			const box = this.scene.targetB;
			const clearance: DemoBox = {
				name: "放置空间",
				center: v(box.center.x, 1.05, box.center.z),
				size: v(
					this.scene.itemSize.x + 0.12,
					0.6,
					this.scene.itemSize.z + 0.12,
				),
			};
			if (
				this.scene.obstacles.some((obstacle) =>
					boxesOverlap(clearance, obstacle),
				)
			) {
				s.evidence = "放置空间与占位箱重叠";
				this.fail("床边交付区被占用，本体停止放置并保持夹持");
				return;
			}
			s.evidence = "放置空间无重叠，可执行释放";
		} else if (id === "classifyB") {
			this.scene.targetB = this.scene.sortTargets[this.scene.sortCategory];
			s.evidence = `${this.scene.sortCategory === "blue" ? "蓝色" : "琥珀色"}标签 → ${this.scene.targetB.name}`;
		} else if (id === "checkSort") {
			const target = this.scene.targetB;
			const space = {
				name: "分拣空间",
				center: v(target.center.x, 1.05, target.center.z),
				size: v(
					this.scene.itemSize.x + 0.12,
					0.6,
					this.scene.itemSize.z + 0.12,
				),
			};
			if (this.scene.obstacles.some((box) => boxesOverlap(space, box))) {
				s.evidence = `${target.name}空间被占满 · 其他类别分拣区不可替代`;
				this.fail(`${target.name}满载，本次分类任务无法完成`);
				return;
			}
			s.evidence = `${target.name}空间可用 · 允许按类别投放`;
		} else if (id === "placeA" || id === "placeB") {
			const target = id === "placeA" ? this.scene.targetA : this.scene.targetB;
			const above = v(
				target.center.x,
				target.center.y + target.size.y / 2 + this.scene.itemSize.y / 2 + 0.22,
				target.center.z,
			);
			s.grip = lerp(this.gripStart, above, p);
			if (s.held)
				s[s.held === "A" ? "itemA" : "itemB"].position = { ...s.grip };
			s.evidence = "固定放置轨迹 · 目标台面上方释放";
		} else if (id === "settleA" || id === "settleB") {
			const body =
				id === "settleA" || this.scene.product === "homeagent"
					? s.itemA
					: s.itemB;
			stepGravity(body, this.scene.itemSize, dt, this.scene.supports);
			s.evidence = body.landed
				? `接触面：${body.landed} · 竖直速度 0.00 m/s`
				: `物体高度 ${body.position.y.toFixed(2)} m · 重力落定中`;
		}
		if (p < 1) return;
		if (id === "settleA" || id === "settleB") {
			const body =
				id === "settleA" || this.scene.product === "homeagent"
					? s.itemA
					: s.itemB;
			const target = id === "settleA" ? this.scene.targetA : this.scene.targetB;
			if (body.landed !== target.name) {
				this.fail("物体未落在指定台面，放置验证失败");
				return;
			}
			s.completed++;
		}
		this.event(
			id === "dispatch" || id === "configureB" ? "中控端" : "机器人本体端",
			`${stage.label}：完成`,
		);
		s.stage++;
		s.stageTime = 0;
		this.gripStart = { ...s.grip };
		if (this.phase === "settleA" || this.phase === "settleB") s.held = null;
		if (s.stage === this.scene.stages.length) {
			s.status = "success";
			this.event("中控端", "根据台面接触与目标位置验证，记录任务完成");
			this.event(
				"用户端",
				this.scene.product === "homeagent"
					? "收到书籍送达通知"
					: "收到 A 搬运与 B 分类完成通知",
			);
		}
	}
	snapshot(): DemoSnapshot {
		return {
			...this.state,
			robot: { ...this.state.robot },
			grip: { ...this.state.grip },
			events: [...this.state.events],
			activeRoute: this.state.activeRoute.map((point) => ({ ...point })),
		};
	}
	terminals(): TerminalStatus[] {
		const s = this.state;
		const home = this.scene.product === "homeagent";
		const terminal = s.status === "fault" || s.status === "stopped";
		const initial = s.status === "idle";
		const done = s.status === "success";
		const bodyStatus = initial
			? "待命"
			: done
				? "执行完成"
				: terminal
					? "安全停止"
					: s.dropping
						? "底盘停止 · 检测掉落"
						: this.label;
		return [
			{
				name: "机器人本体端",
				task: home
					? "移动、夹取、运送与放置"
					: "A 搬运补料、局部避障、B 分类投放",
				status: bodyStatus,
				detail: initial
					? "等待中控指令；保留本体停止能力"
					: s.reason || s.evidence,
			},
			{
				name: "中控端",
				task: home
					? "调用物品记忆与固定取送轨迹"
					: "编排跨工位任务、限定避障区域、加载分类规则",
				status: initial
					? "等待任务"
					: done
						? "结果已验证并归档"
						: terminal
							? "任务终止 · 已发通知"
							: s.dropping
								? "暂停轨迹 · 等待本体反馈"
								: "任务执行中 · 接收本体反馈",
				detail: initial
					? home
						? "已登记：客厅取书点 / 床边交付区"
						: "已登记：A 搬运 / B 蓝色与琥珀色分类区"
					: terminal
						? "已阻止后续执行，保留异常记录"
						: done
							? `已验证 ${s.completed} 次放置，已同步用户端`
							: `当前调度：${this.label}`,
			},
			{
				name: "用户端",
				task: home ? "把客厅的书送到床边" : "完成 A 搬运补料与 B 按颜色分类",
				status: initial
					? "待提交"
					: done
						? "已收到完成通知"
						: terminal
							? "已收到未完成通知"
							: "已提交 · 无需继续操作",
				detail: initial
					? "选择样例并提交一次任务"
					: done
						? home
							? "书已送达指定台面"
							: `B 物料已投入${this.scene.sortCategory === "blue" ? "蓝色" : "琥珀色"}分拣区`
						: terminal
							? s.reason
							: "等待结果通知，可主动停止任务",
			},
		];
	}
}
