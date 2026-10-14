export type HomePhase =
	| "create"
	| "execute"
	| "success"
	| "error"
	| "cancelled";
export type HomeFault = "none" | "missing" | "occupied";
export const homeStages = [
	"规划路线并前往客厅取物点",
	"识别并取书",
	"运送至卧室",
	"放置并验证床边交付",
];
export interface HomeState {
	phase: HomePhase;
	step: number;
	item: string;
	destination: string;
	fault: HomeFault;
	error: string;
}
export type HomeAction =
	| { type: "tick" | "cancel" | "reset" }
	| {
			type: "submit";
			item: string;
			destination: string;
			fault: HomeFault;
			authorized: boolean;
	  };
export const initialHome = (): HomeState => ({
	phase: "create",
	step: 0,
	item: "",
	destination: "",
	fault: "none",
	error: "",
});
export function homeTransition(
	state: HomeState,
	action: HomeAction,
): HomeState {
	if (action.type === "reset") return initialHome();
	if (action.type === "submit" && state.phase === "create") {
		if (action.item !== "book" || action.destination !== "bedside")
			return { ...state, error: "请选择已登记书籍与床边指定交付区。" };
		if (!action.authorized)
			return { ...state, error: "任务超出授权范围，无法执行。" };
		return {
			...state,
			item: action.item,
			destination: action.destination,
			fault: action.fault,
			phase: "execute",
			error: "",
		};
	}
	if (action.type === "tick" && state.phase === "execute") {
		if (state.step === 1 && state.fault === "missing")
			return {
				...state,
				phase: "error",
				error: "未在授权取物区域找到目标书籍，系统已停止本次取送并报告异常。",
			};
		if (state.step === 3 && state.fault === "occupied")
			return {
				...state,
				phase: "error",
				error: "床边交付区被占用，系统已停止放置并报告异常；书籍尚未交付。",
			};
		return state.step === homeStages.length - 1
			? { ...state, phase: "success" }
			: { ...state, step: state.step + 1 };
	}
	if (action.type === "cancel" && state.phase === "execute")
		return { ...state, phase: "cancelled", error: "" };
	return state;
}

export type WarehousePhase =
	| "request"
	| "checking"
	| "blocked"
	| "exiting"
	| "migrating"
	| "configuring"
	| "calibrating"
	| "fault"
	| "b-ready"
	| "b-running"
	| "safe-stop";
export const warehouseStages = [
	{ phase: "checking", label: "检查任务权限与工位可用性" },
	{ phase: "exiting", label: "安全退出工位 A" },
	{ phase: "migrating", label: "规划授权区域内路线并迁移至 B" },
	{ phase: "configuring", label: "加载已登记的工位配置" },
	{ phase: "calibrating", label: "自动校准与安全检查" },
	{ phase: "b-ready", label: "检查通过，自动启动 B" },
] satisfies { phase: WarehousePhase; label: string }[];
export interface WarehouseState {
	phase: WarehousePhase;
	target: string;
	strategy: string;
	permitted: boolean;
	available: boolean;
	failCalibration: boolean;
	configLoaded: boolean;
	calibrated: boolean;
	error: string;
}
export type WarehouseAction =
	| { type: "tick" | "stop" | "reset" }
	| {
			type: "submit";
			target: string;
			strategy: string;
			permitted: boolean;
			available: boolean;
			failCalibration: boolean;
	  };
export const initialWarehouse = (): WarehouseState => ({
	phase: "request",
	target: "",
	strategy: "",
	permitted: false,
	available: true,
	failCalibration: false,
	configLoaded: false,
	calibrated: false,
	error: "",
});
export function warehouseTransition(
	state: WarehouseState,
	action: WarehouseAction,
): WarehouseState {
	if (action.type === "reset") return initialWarehouse();
	if (action.type === "submit" && state.phase === "request") {
		if (
			action.target !== "B" ||
			!["finish", "safe-stop"].includes(action.strategy)
		)
			return { ...state, error: "请选择目标工位 B 和当前任务处理策略。" };
		return {
			...state,
			target: action.target,
			strategy: action.strategy,
			permitted: action.permitted,
			available: action.available,
			failCalibration: action.failCalibration,
			phase: "checking",
			error: "",
		};
	}
	if (action.type === "tick") {
		if (state.phase === "checking") {
			const reasons = [
				!state.permitted && "任务未获授权",
				!state.available && "工位 B 不可用",
			].filter(Boolean);
			return reasons.length
				? {
						...state,
						phase: "blocked",
						error: `${reasons.join("；")}。系统已拒绝切换，未迁移至 B。`,
					}
				: { ...state, phase: "exiting" };
		}
		if (state.phase === "exiting") return { ...state, phase: "migrating" };
		if (state.phase === "migrating") return { ...state, phase: "configuring" };
		if (state.phase === "configuring")
			return { ...state, phase: "calibrating", configLoaded: true };
		if (
			state.phase === "calibrating" &&
			state.configLoaded &&
			state.permitted &&
			state.available
		)
			return state.failCalibration
				? {
						...state,
						phase: "fault",
						calibrated: false,
						error:
							"坐标标定偏差超出模拟许可范围，系统已安全停止并报告异常，未启动 B 工位任务。",
					}
				: { ...state, phase: "b-ready", calibrated: true };
		if (
			state.phase === "b-ready" &&
			state.calibrated &&
			state.configLoaded &&
			state.permitted &&
			state.available
		)
			return { ...state, phase: "b-running" };
	}
	if (
		action.type === "stop" &&
		!["request", "safe-stop", "blocked", "fault"].includes(state.phase)
	)
		return { ...state, phase: "safe-stop", calibrated: false, error: "" };
	return state;
}
