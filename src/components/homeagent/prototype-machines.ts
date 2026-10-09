export type HomePhase = "intro" | "create" | "confirm" | "execute" | "receipt" | "success" | "error" | "cancelled" | "manual";
export type HomeFault = "none" | "missing" | "occupied";
export interface HomeState { phase: HomePhase; step: number; item: string; destination: string; fault: HomeFault; error: string; }
export type HomeAction =
  | { type: "start" | "advance" | "retry" | "receive" | "cancel" | "manual" | "reset" | "edit" }
  | { type: "review"; item: string; destination: string; fault: HomeFault }
  | { type: "execute"; authorized: boolean };
export const initialHome = (): HomeState => ({ phase: "intro", step: 0, item: "", destination: "", fault: "none", error: "" });
export function homeTransition(state: HomeState, action: HomeAction): HomeState {
  if (action.type === "reset") return initialHome();
  if (action.type === "start" && state.phase === "intro") return { ...initialHome(), phase: "create" };
  if (action.type === "review" && state.phase === "create") {
    if (action.item !== "book" || action.destination !== "bedside") return { ...state, error: "请先选择书籍和卧室床边指定交付区。" };
    return { ...state, ...action, phase: "confirm", error: "" };
  }
  if (action.type === "edit" && state.phase === "confirm") return { ...state, phase: "create", error: "" };
  if (action.type === "execute" && state.phase === "confirm") return action.authorized
    ? { ...state, phase: "execute", step: 0, error: "" }
    : { ...state, error: "请确认物品、取物点和床边交付区均在授权范围内。" };
  if (action.type === "advance" && state.phase === "execute") {
    if (state.step === 1 && state.fault === "missing") return { ...state, phase: "error", error: "书籍不在客厅预设位置，取物已暂停。" };
    if (state.step === 3 && state.fault === "occupied") return { ...state, phase: "error", error: "床边指定交付区被占用，交付已暂停。" };
    return state.step === 3 ? { ...state, phase: "receipt" } : { ...state, step: state.step + 1 };
  }
  if (action.type === "retry" && state.phase === "error") return { ...state, phase: "execute", fault: "none", error: "" };
  if (action.type === "receive" && state.phase === "receipt") return { ...state, phase: "success" };
  if (action.type === "manual" && state.phase === "error") return { ...state, phase: "manual", error: "" };
  if (action.type === "cancel" && ["create", "confirm", "execute", "receipt", "error"].includes(state.phase)) return { ...state, phase: "cancelled", error: "" };
  return state;
}

export type WarehousePhase = "intro" | "a-running" | "request" | "checking" | "blocked" | "exiting" | "migrating" | "configuring" | "calibrating" | "fault" | "b-ready" | "b-running" | "safe-stop";
export interface WarehouseState { phase: WarehousePhase; target: string; strategy: string; permitted: boolean; available: boolean; failCalibration: boolean; configConfirmed: boolean; calibrated: boolean; error: string; }
export type WarehouseAction =
  | { type: "start" | "request" | "check" | "next" | "validate" | "stop" | "reset" | "edit" }
  | { type: "submit"; target: string; strategy: string; permitted: boolean; available: boolean; failCalibration: boolean }
  | { type: "configure"; confirmed: boolean }
  | { type: "recover"; corrected: boolean }
  | { type: "run"; authorized: boolean };
export const initialWarehouse = (): WarehouseState => ({ phase: "intro", target: "", strategy: "", permitted: false, available: true, failCalibration: false, configConfirmed: false, calibrated: false, error: "" });
export function warehouseTransition(state: WarehouseState, action: WarehouseAction): WarehouseState {
  if (action.type === "reset") return initialWarehouse();
  if (action.type === "start" && state.phase === "intro") return { ...initialWarehouse(), phase: "a-running" };
  if (action.type === "request" && state.phase === "a-running") return { ...state, phase: "request" };
  if (action.type === "submit" && state.phase === "request") {
    if (action.target !== "B" || !["finish", "safe-stop"].includes(action.strategy)) return { ...state, error: "请选择目标工位 B 和当前任务处理策略。" };
    return { ...state, ...action, phase: "checking", error: "" };
  }
  if (action.type === "check" && state.phase === "checking") {
    const reasons = [!state.permitted && "尚未取得切换授权", !state.available && "目标工位 B 不可用"].filter(Boolean);
    return reasons.length ? { ...state, phase: "blocked", error: reasons.join("；") } : { ...state, phase: "exiting", error: "" };
  }
  if (action.type === "edit" && ["checking", "blocked"].includes(state.phase)) return { ...state, phase: "request", error: "" };
  if (action.type === "next" && state.phase === "exiting") return { ...state, phase: "migrating" };
  if (action.type === "next" && state.phase === "migrating") return { ...state, phase: "configuring" };
  if (action.type === "configure" && state.phase === "configuring") return action.confirmed
    ? { ...state, phase: "calibrating", configConfirmed: true, error: "" }
    : { ...state, error: "请先确认工位 B 的技能、任务参数与外设配置已加载。" };
  if (action.type === "validate" && state.phase === "calibrating" && state.configConfirmed && state.permitted && state.available) return state.failCalibration
    ? { ...state, phase: "fault", calibrated: false, error: "坐标标定偏差超出模拟许可范围，安全检查未通过。工位 B 不可启动。" }
    : { ...state, phase: "b-ready", calibrated: true, error: "" };
  if (action.type === "recover" && state.phase === "fault") return action.corrected
    ? { ...state, phase: "calibrating", failCalibration: false, error: "" }
    : { ...state, error: "请先确认模拟现场重新校准已完成，再重新检查。工位 B 仍不可启动。" };
  if (action.type === "run" && state.phase === "b-ready" && state.calibrated && state.configConfirmed && state.permitted && state.available) return action.authorized
    ? { ...state, phase: "b-running", error: "" }
    : { ...state, error: "请确认启动工位 B 的模拟任务。" };
  if (action.type === "stop" && !["intro", "safe-stop"].includes(state.phase)) return { ...state, phase: "safe-stop", calibrated: false, error: "" };
  return state;
}
