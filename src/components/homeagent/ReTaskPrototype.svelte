<script lang="ts">
import { onMount } from "svelte";
import {
	initialWarehouse,
	type WarehouseAction,
	type WarehousePhase,
	warehouseStages,
	warehouseTransition,
} from "./prototype-machines";
import "../../styles/homeagent-prototype.css";
let state = initialWarehouse();
let target = "B";
let strategy = "finish";
let scenario = "pass";
const labels: Record<WarehousePhase, string> = {
	request: "设定下一项工位任务",
	checking: "系统正在检查执行条件",
	blocked: "系统已拒绝本次切换",
	exiting: "系统正在安全退出工位 A",
	migrating: "系统正在迁移至工位 B",
	configuring: "系统正在加载工位 B 配置",
	calibrating: "系统正在自动校准与安全检查",
	fault: "校准未通过，系统已安全停止",
	"b-ready": "检查已通过，系统正在启动 B",
	"b-running": "切换完成，工位 B 运行中（模拟）",
	"safe-stop": "系统已响应停止请求（模拟）",
};
$: active = warehouseStages.findIndex((stage) => stage.phase === state.phase);
$: progressIndex = state.phase === "blocked" ? 0 : state.phase === "fault" ? 4 : active;
$: executing = active >= 0;
$: currentStep = state.phase === "request" ? 0 : executing ? 1 : 2;
function dispatch(action: WarehouseAction) {
	state = warehouseTransition(state, action);
	if (action.type === "reset") {
		target = "B";
		strategy = "finish";
		scenario = "pass";
	}
}
onMount(() => {
	const timer = window.setInterval(() => dispatch({ type: "tick" }), 1200);
	return () => window.clearInterval(timer);
});
</script>

<div class="interactive-prototype" data-prototype="retask">
  <div class="prototype-bar"><div><strong>ReTask · A → B 工位切换</strong><span>设定任务 → 自主执行 → 结果通知 · 模拟</span></div><button type="button" onclick={() => dispatch({ type: "reset" })}>重置演示</button></div>
  <div class="prototype-layout">
    <ol class="prototype-steps" aria-label="工位切换流程">{#each ["设定任务", "系统自主切换", "结果通知"] as step, index}<li aria-current={index === currentStep ? "step" : undefined}><span>0{index + 1}</span><span>{step}</span></li>{/each}</ol>
    <div class="prototype-body">
      <div aria-live="polite" aria-atomic="true"><span class="prototype-status">{state.calibrated ? "校准与安全检查已通过" : state.phase === "request" ? "等待设定任务" : executing ? "系统自主推进工位切换" : "本次任务已结束"}</span><h3>{labels[state.phase]}</h3></div>
      {#if state.phase === "request"}
        <p>设备当前在工位 A 重新上件。设定下一项任务后，系统自动完成退出、迁移、配置、校准与启动。</p>
        <form onsubmit={(event) => { event.preventDefault(); dispatch({ type: "submit", target, strategy, permitted: true, available: scenario !== "unavailable", failCalibration: scenario === "fail" }); }}>
          <div class="prototype-fields">
            <label>目标任务<select bind:value={target}><option value="B">工位 B · 第二工位上件</option></select></label>
            <label>当前任务处理策略<select bind:value={strategy}><option value="finish">完成当前包裹后退出</option><option value="safe-stop">安全停止并交接当前任务</option></select></label>
          </div>
          <details class="prototype-scenarios"><summary>演示情境</summary><div class="prototype-fields"><label>模拟结果<select bind:value={scenario}><option value="pass">正常切换并启动 B</option><option value="unavailable">目标工位 B 不可用</option><option value="fail">坐标标定偏差，校准失败</option></select></label></div></details>
          <p class="prototype-notice">工位技能、参数与外设配置已预先登记。提交即授权本次切换及检查通过后的启动；执行条件由系统校验。</p>
          <div class="prototype-actions"><button class="prototype-primary" type="submit">切换至 B 并执行任务</button></div>
        </form>
      {:else}
        {#if executing || state.phase === "blocked" || state.phase === "fault" || state.phase === "b-running"}
          <ol class="prototype-progress" aria-label="系统自动执行进度">{#each warehouseStages as stage, index}<li class:active={index === progressIndex}><strong>{stage.label}</strong><span>{state.phase === "b-running" || index < progressIndex ? "已完成" : index === progressIndex ? executing ? "自动执行中" : "已阻止" : executing ? "待执行" : "未执行"}</span></li>{/each}</ol>
        {/if}
        {#if executing}
          <p class="prototype-notice">{state.phase === "exiting" ? state.strategy === "finish" ? "系统自动完成当前包裹并释放 A 作业区。" : "系统安全停止当前动作并记录任务交接。" : state.phase === "configuring" ? "系统加载上件技能 v1.0、B 工位参数与外设配置（模拟）。" : "系统正在自动推进任务，完成后通知结果。"}</p>
          <div class="prototype-actions"><button type="button" onclick={() => dispatch({ type: "stop" })}>安全停止</button></div>
        {:else if state.phase === "b-running"}
          <dl class="prototype-summary"><div><dt>当前任务</dt><dd>工位 B · 第二工位上件</dd></div><div><dt>当前配置</dt><dd>上件技能 v1.0 · B 工位参数（模拟）</dd></div><div><dt>校准与互锁</dt><dd>已通过模拟检查</dd></div><div><dt>执行结果</dt><dd>切换完成，B 任务已自动启动</dd></div></dl>
          <p class="prototype-notice">系统已生成切换完成通知，并保留配置与检查记录。</p>
          <div class="prototype-actions"><button type="button" onclick={() => dispatch({ type: "stop" })}>安全停止 B 工位任务</button></div>
        {:else if state.phase === "blocked" || state.phase === "fault"}
          <p>系统已记录失败原因，B 工位任务未启动。本次演示在异常结果处结束。</p>
        {:else}
          <p>模拟动作已停止，工位 B 不继续运行。可重置演示并重新设定任务。</p>
        {/if}
      {/if}
      {#if state.error}<div class="prototype-notice" role="alert">{state.error}</div>{/if}
    </div>
  </div>
</div>
