<script lang="ts">
import { onMount } from "svelte";
import {
	type HomeAction,
	type HomeFault,
	homeStages,
	homeTransition,
	initialHome,
} from "./prototype-machines";
import "../../styles/homeagent-prototype.css";
let state = initialHome();
let item = "book";
let destination = "bedside";
let scenario: HomeFault = "none";
const labels = {
	create: "让机器人把书送到床边",
	execute: "系统正在自主取送（模拟）",
	success: "书已送达床边（模拟）",
	error: "本次取送未完成",
	cancelled: "任务已停止（模拟）",
};
$: currentStep = state.phase === "create" ? 0 : state.phase === "execute" ? 1 : 2;
function dispatch(action: HomeAction) {
	state = homeTransition(state, action);
	if (action.type === "reset") {
		item = "book";
		destination = "bedside";
		scenario = "none";
	}
}
onMount(() => {
	const timer = window.setInterval(() => dispatch({ type: "tick" }), 1200);
	return () => window.clearInterval(timer);
});
</script>

<div class="interactive-prototype" data-prototype="homeagent">
  <div class="prototype-bar"><div><strong>HomeAgent · 床边取书</strong><span>设定任务 → 自主执行 → 结果通知 · 模拟</span></div><button type="button" onclick={() => dispatch({ type: "reset" })}>重置演示</button></div>
  <div class="prototype-layout">
    <ol class="prototype-steps" aria-label="取物流程">{#each ["设定任务", "系统自主取送", "结果通知"] as stage, index}<li aria-current={currentStep === index ? "step" : undefined}><span>0{index + 1}</span><span>{stage}</span></li>{/each}</ol>
    <div class="prototype-body">
      <div aria-live="polite" aria-atomic="true"><span class="prototype-status">{state.phase === "success" ? "系统已验证放置并生成送达通知" : state.phase === "create" ? "等待设定任务" : state.phase === "execute" ? "任务已提交，系统自主执行" : "本次任务已结束"}</span><h3>{labels[state.phase]}</h3>{#if state.phase === "execute"}<p>当前阶段：{homeStages[state.step]}</p>{/if}</div>
      {#if state.phase === "create"}
        <p>你正在卧室休息，只需设定要送来的书和交付位置。机器人自动完成取物、运送、放置验证与结果通知。</p>
        <form onsubmit={(event) => { event.preventDefault(); dispatch({ type: "submit", item, destination, fault: scenario, authorized: true }); }}>
          <div class="prototype-fields">
            <label>取送物品<select bind:value={item}><option value="book">书 · 客厅预设取物点</option></select></label>
            <label>送达位置<select bind:value={destination}><option value="bedside">卧室床边指定安全交付区</option></select></label>
          </div>
          <details class="prototype-scenarios"><summary>演示情境</summary><div class="prototype-fields"><label>模拟结果<select bind:value={scenario}><option value="none">正常取送</option><option value="missing">书不在预设位置</option><option value="occupied">床边交付区被占用</option></select></label></div></details>
          <p class="prototype-notice">本演示已预设物品、路线与交付区权限。提交即授权本次取送，执行中可随时停止。</p>
          <div class="prototype-actions"><button class="prototype-primary" type="submit">把书送到床边</button></div>
        </form>
      {:else}
        <ol class="prototype-progress" aria-label="系统自动执行进度">{#each homeStages as stage, index}<li class:active={state.phase !== "success" && index === state.step}><strong>{stage}</strong><span>{state.phase === "success" || index < state.step ? "已完成" : index === state.step ? state.phase === "execute" ? "自动执行中" : "已停止" : state.phase === "execute" ? "待执行" : "未执行"}</span></li>{/each}</ol>
        {#if state.phase === "execute"}
          <p class="prototype-notice">系统自动推进取送，你可以继续休息。完成后自动通知。</p>
          <div class="prototype-actions"><button type="button" onclick={() => dispatch({ type: "cancel" })}>停止任务</button></div>
        {:else if state.phase === "success"}
          <p class="prototype-notice">书已放至床边指定交付区，系统已验证放置并记录任务完成。</p>
        {:else if state.phase === "error"}
          <p>系统已结束本次执行，并保留失败阶段和原因。异常处理不计为取送成功。</p>
        {:else}
          <p>系统已响应停止请求，不继续执行取放动作。</p>
        {/if}
      {/if}
      {#if state.error}<div class="prototype-notice" role="alert">{state.error}</div>{/if}
    </div>
  </div>
</div>
