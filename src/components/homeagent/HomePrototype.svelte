<script lang="ts">
  import { homeTransition, initialHome, type HomeAction, type HomeFault } from "./prototype-machines";
  import "../../styles/homeagent-prototype.css";
  let state = initialHome();
  let item = "";
  let destination = "";
  let scenario: HomeFault = "none";
  let authorized = false;
  const stages = ["前往客厅取物点", "识别并取书", "运送至卧室", "到达床边指定交付区"];
  const labels = { intro: "体验取物流程", create: "创建取书任务", confirm: "确认任务与权限", execute: "取书任务执行中（模拟）", receipt: "书已送达，等待确认", success: "取书任务已完成（模拟）", error: "任务暂停，需要处理", cancelled: "任务已取消（模拟）", manual: "已转为人工处理（模拟）" };
  $: currentStep = ["intro", "create"].includes(state.phase) ? 0 : state.phase === "confirm" ? 1 : ["execute", "error"].includes(state.phase) ? 2 : 3;
  function dispatch(action: HomeAction) {
    state = homeTransition(state, action);
    if (action.type === "reset") { item = ""; destination = ""; scenario = "none"; authorized = false; }
  }
</script>

<div class="interactive-prototype" data-prototype="homeagent">
  <div class="prototype-bar"><div><strong>HomeAgent · 床边取书</strong><span>交互原型（模拟）</span></div><button type="button" onclick={() => dispatch({ type: "reset" })}>重置演示</button></div>
  <div class="prototype-layout">
    <ol class="prototype-steps" aria-label="取物流程">{#each ["创建任务", "确认执行", "模拟取送", "收到确认"] as stage, index}<li aria-current={currentStep === index ? "step" : undefined}><span>0{index + 1}</span><span>{stage}</span></li>{/each}</ol>
    <div class="prototype-body">
      <div aria-live="polite" aria-atomic="true"><span class="prototype-status">{state.phase === "success" ? "用户已确认收到" : state.phase === "error" ? "操作暂停" : "未连接真实设备"}</span><h3>{labels[state.phase]}</h3></div>
      {#if state.phase === "intro"}
        <p>你正在卧室床上休息，想读放在客厅的一本书。选择物品与床边交付区，体验一次取送，也可以选择异常情境。</p>
        <div class="prototype-actions"><button class="prototype-primary" type="button" onclick={() => dispatch({ type: "start" })}>体验原型</button></div>
      {:else if state.phase === "create"}
        <p>仅支持已登记书籍、客厅预设取物点和卧室床边指定安全交付区。</p>
        <form onsubmit={(event) => { event.preventDefault(); dispatch({ type: "review", item, destination, fault: scenario }); }}>
          <div class="prototype-fields">
            <label>取送物品<select bind:value={item}><option value="">请选择物品</option><option value="book">书 · 已登记的轻小物品</option></select></label>
            <label>送达位置<select bind:value={destination}><option value="">请选择送达位置</option><option value="bedside">卧室床边指定交付区</option></select></label>
            <label>模拟情境<select bind:value={scenario}><option value="none">正常取送</option><option value="missing">书不在预设位置</option><option value="occupied">床边交付区被占用</option></select></label>
          </div>
          <div class="prototype-actions"><button class="prototype-primary" type="submit">检查任务范围</button><button type="button" onclick={() => dispatch({ type: "cancel" })}>取消任务</button></div>
        </form>
      {:else if state.phase === "confirm"}
        <dl class="prototype-summary"><div><dt>物品</dt><dd>书 · 已登记轻小物品</dd></div><div><dt>取物点</dt><dd>客厅 · 预设取物位置</dd></div><div><dt>交付点</dt><dd>卧室 · 床边指定安全交付区</dd></div><div><dt>执行边界</dt><dd>授权单层室内路线；本地处理影像；失败暂停，交由用户处理。</dd></div></dl>
        <label class="prototype-check"><input type="checkbox" bind:checked={authorized} />确认物品、取物点与床边交付区均已授权</label>
        <div class="prototype-actions"><button class="prototype-primary" type="button" onclick={() => dispatch({ type: "execute", authorized })}>确认执行</button><button type="button" onclick={() => dispatch({ type: "edit" })}>修改任务</button></div>
      {:else if state.phase === "execute" || state.phase === "error"}
        <p>当前阶段：{stages[state.step]}。每次推进会更新模拟状态。</p>
        <ol class="prototype-progress" aria-label="模拟执行进度">{#each stages as stage, index}<li class:active={index === state.step}><strong>{stage}</strong><span>{index < state.step ? "已完成" : index === state.step ? state.phase === "error" ? "已暂停" : "进行中" : "待执行"}</span></li>{/each}</ol>
        {#if state.phase === "error"}
          <p class="prototype-notice">{state.fault === "missing" ? "请检查并将书放回预设位置；确认后可在当前阶段重试。" : "请清空床边指定交付区；确认后可继续交付。"}</p>
          <div class="prototype-actions"><button class="prototype-primary" type="button" onclick={() => dispatch({ type: "retry" })}>{state.fault === "missing" ? "确认物品已归位，重试" : "确认交付区已清空，重试"}</button><button type="button" onclick={() => dispatch({ type: "manual" })}>转为人工处理</button><button type="button" onclick={() => dispatch({ type: "cancel" })}>取消任务</button></div>
        {:else}
          <div class="prototype-actions"><button class="prototype-primary" type="button" onclick={() => dispatch({ type: "advance" })}>推进一步</button><button type="button" onclick={() => dispatch({ type: "cancel" })}>取消任务</button></div>
        {/if}
      {:else if state.phase === "receipt"}
        <p>书已放至卧室床边指定交付区（模拟）。任务尚未结束，请确认是否收到。</p>
        <div class="prototype-actions"><button class="prototype-primary" type="button" onclick={() => dispatch({ type: "receive" })}>确认收到物品</button><button type="button" onclick={() => dispatch({ type: "cancel" })}>取消任务</button></div>
      {:else if state.phase === "success"}
        <p>取物、运送、床边交付与用户确认均已完成。你可以继续休息并阅读这本书。</p>
      {:else if state.phase === "manual"}
        <p>自动取送已结束，由用户自行拿取或请在场家人帮忙。本次演示不记为机器人完成任务。</p>
      {:else}
        <p>模拟任务已结束，不继续执行取放动作。可通过“重置演示”重新体验。</p>
      {/if}
      {#if state.error}<div class="prototype-notice" role="alert">{state.error}</div>{/if}
    </div>
  </div>
  <p class="prototype-footnote">本地模拟交互，未连接机器人，不代表真实取物能力或已验证的家庭需求。</p>
</div>
