<script lang="ts">
  import { warehouseTransition, initialWarehouse, type WarehouseAction, type WarehousePhase } from "./prototype-machines";
  import "../../styles/homeagent-prototype.css";
  let state = initialWarehouse();
  let target = "";
  let strategy = "";
  let permitted = false;
  let available = true;
  let scenario = "pass";
  let configConfirmed = false;
  let corrected = false;
  let runAuthorized = false;
  const labels: Record<WarehousePhase, string> = { intro: "体验跨工位切换", "a-running": "工位 A 运行中（模拟）", request: "申请切换至工位 B", checking: "执行前检查", blocked: "切换被阻止", exiting: "安全退出工位 A", migrating: "迁移至工位 B（模拟）", configuring: "加载工位 B 配置", calibrating: "校准与安全检查中", fault: "校准未通过，工位 B 不可启动", "b-ready": "工位 B 已就绪", "b-running": "工位 B 运行中（模拟）", "safe-stop": "设备保持安全停止（模拟）" };
  const phases: WarehousePhase[] = ["a-running", "request", "checking", "exiting", "migrating", "configuring", "calibrating", "b-ready", "b-running"];
  const steps = ["A 运行", "请求切换", "前置检查", "安全退出", "迁移至 B", "加载配置", "校准检查", "B 就绪", "B 运行"];
  $: active = state.phase === "blocked" ? 2 : state.phase === "fault" ? 6 : phases.indexOf(state.phase);
  function dispatch(action: WarehouseAction) {
    state = warehouseTransition(state, action);
    if (action.type === "reset") { target = ""; strategy = ""; permitted = false; available = true; scenario = "pass"; configConfirmed = false; corrected = false; runAuthorized = false; }
  }
</script>

<div class="interactive-prototype" data-prototype="retask">
  <div class="prototype-bar"><div><strong>ReTask · A → B 工位切换</strong><span>交互原型（模拟）</span></div><button type="button" onclick={() => dispatch({ type: "reset" })}>重置演示</button></div>
  <div class="prototype-layout">
    <ol class="prototype-steps" aria-label="工位切换流程">{#each steps as step, index}<li aria-current={index === active ? "step" : undefined}><span>0{index + 1}</span><span>{step}</span></li>{/each}</ol>
    <div class="prototype-body">
      <div aria-live="polite" aria-atomic="true"><span class="prototype-status">{state.calibrated ? "模拟校准与安全检查已通过" : "未连接真实产线"}</span><h3>{labels[state.phase]}</h3></div>
      {#if state.phase === "intro"}
        <p>从工位 A 的受限包裹重新上件，切换至工位 B 的第二上件任务。你将完成授权、退出、迁移、配置和校准，也可触发校准失败。</p>
        <div class="prototype-actions"><button class="prototype-primary" type="button" onclick={() => dispatch({ type: "start" })}>体验原型</button></div>
      {:else if state.phase === "a-running"}
        <dl class="prototype-summary"><div><dt>当前工位</dt><dd>工位 A · 受限包裹重新上件</dd></div><div><dt>设备状态</dt><dd>作业中 · 模拟状态</dd></div><div><dt>目标任务</dt><dd>工位 B · 第二工位上件</dd></div></dl>
        <div class="prototype-actions"><button class="prototype-primary" type="button" onclick={() => dispatch({ type: "request" })}>申请切换至 B</button></div>
      {:else if state.phase === "request"}
        <form onsubmit={(event) => { event.preventDefault(); dispatch({ type: "submit", target, strategy, permitted, available, failCalibration: scenario === "fail" }); }}>
          <div class="prototype-fields">
            <label>目标工位<select bind:value={target}><option value="">请选择目标工位</option><option value="B">工位 B · 第二工位上件</option></select></label>
            <label>当前任务处理策略<select bind:value={strategy}><option value="">请选择处理策略</option><option value="finish">完成当前包裹后退出</option><option value="safe-stop">安全停止并交接当前任务</option></select></label>
            <label>模拟校准结果<select bind:value={scenario}><option value="pass">校准与安全检查通过</option><option value="fail">坐标标定偏差，校准失败</option></select></label>
          </div>
          <label class="prototype-check"><input type="checkbox" bind:checked={permitted} />已取得工位切换授权（模拟）</label>
          <label class="prototype-check"><input type="checkbox" bind:checked={available} />目标工位 B 可用（模拟）</label>
          <div class="prototype-actions"><button class="prototype-primary" type="submit">提交切换请求</button><button type="button" onclick={() => dispatch({ type: "stop" })}>终止并安全停止</button></div>
        </form>
      {:else if state.phase === "checking" || state.phase === "blocked"}
        <dl class="prototype-summary"><div><dt>A 任务策略</dt><dd>{state.strategy === "finish" ? "完成当前包裹后安全退出" : "安全停止并交接，禁止带未结束动作迁移"}</dd></div><div><dt>切换授权</dt><dd>{state.permitted ? "已取得" : "未取得"}</dd></div><div><dt>B 可用性</dt><dd>{state.available ? "可用" : "不可用"}</dd></div></dl>
        <div class="prototype-actions">{#if state.phase === "checking"}<button class="prototype-primary" type="button" onclick={() => dispatch({ type: "check" })}>执行前检查</button>{/if}<button type="button" onclick={() => dispatch({ type: "edit" })}>返回检查配置</button><button type="button" onclick={() => dispatch({ type: "stop" })}>终止并安全停止</button></div>
      {:else if state.phase === "exiting"}
        <p>{state.strategy === "finish" ? "模拟完成当前包裹、结束 A 工位动作并释放作业区。" : "模拟安全停止动作并完成当前任务交接。"}确认退出后，才进入迁移阶段。</p>
        <div class="prototype-actions"><button class="prototype-primary" type="button" onclick={() => dispatch({ type: "next" })}>确认 A 安全退出，开始迁移</button><button type="button" onclick={() => dispatch({ type: "stop" })}>终止并安全停止</button></div>
      {:else if state.phase === "migrating"}
        <p>模拟沿预设授权路线从 A 移动至 B。到达不代表就绪，仍需加载配置与重新校准。</p>
        <div class="prototype-actions"><button class="prototype-primary" type="button" onclick={() => dispatch({ type: "next" })}>模拟到达 B，加载配置</button><button type="button" onclick={() => dispatch({ type: "stop" })}>终止并安全停止</button></div>
      {:else if state.phase === "configuring"}
        <dl class="prototype-summary"><div><dt>任务</dt><dd>B 工位 · 第二上件任务</dd></div><div><dt>技能版本</dt><dd>上件技能 v1.0 · Mock 配置</dd></div><div><dt>任务参数</dt><dd>受支持包装范围、预设取放位置</dd></div><div><dt>坐标标定</dt><dd>B 工位坐标 · 待校准确认</dd></div><div><dt>外设与互锁</dt><dd>输送点接口与作业区安全检查 · 待验证</dd></div></dl>
        <label class="prototype-check"><input type="checkbox" bind:checked={configConfirmed} />确认已加载工位 B 的技能、任务参数与外设配置</label>
        <div class="prototype-actions"><button class="prototype-primary" type="button" onclick={() => dispatch({ type: "configure", confirmed: configConfirmed })}>开始校准与安全检查</button><button type="button" onclick={() => dispatch({ type: "stop" })}>终止并安全停止</button></div>
      {:else if state.phase === "calibrating"}
        <p>正在检查坐标标定、作业区和外设互锁（模拟）。检查未通过前，B 工位不能启动。</p>
        <div class="prototype-actions"><button class="prototype-primary" type="button" onclick={() => dispatch({ type: "validate" })}>运行校准与安全检查</button><button type="button" onclick={() => dispatch({ type: "stop" })}>终止并安全停止</button></div>
      {:else if state.phase === "fault"}
        <p>模拟坐标标定偏差超出许可范围，设备不执行 B 工位任务。可以重新校准后检查，或结束切换并保持安全停止。</p>
        <label class="prototype-check"><input type="checkbox" bind:checked={corrected} />模拟现场重新校准已完成</label>
        <div class="prototype-actions"><button class="prototype-primary" type="button" onclick={() => dispatch({ type: "recover", corrected })}>重新检查</button><button type="button" onclick={() => dispatch({ type: "stop" })}>终止并安全停止</button></div>
      {:else if state.phase === "b-ready" || state.phase === "b-running"}
        <dl class="prototype-summary"><div><dt>当前工位</dt><dd>工位 B · 第二工位上件</dd></div><div><dt>当前配置</dt><dd>上件技能 v1.0 · B 工位参数（模拟）</dd></div><div><dt>校准与互锁</dt><dd>已通过模拟检查</dd></div><div><dt>任务状态</dt><dd>{state.phase === "b-ready" ? "就绪 · 等待启动授权" : "运行中 · 模拟状态"}</dd></div></dl>
        {#if state.phase === "b-ready"}<label class="prototype-check"><input type="checkbox" bind:checked={runAuthorized} />确认启动工位 B 的模拟任务</label><div class="prototype-actions"><button class="prototype-primary" type="button" onclick={() => dispatch({ type: "run", authorized: runAuthorized })}>启动 B 工位任务</button></div>{/if}
        {#if state.phase === "b-running"}<p class="prototype-notice">A → B 切换成功，模拟任务已启动。配置与检查记录保留在当前演示中。</p><div class="prototype-actions"><button type="button" onclick={() => dispatch({ type: "stop" })}>安全停止 B 工位任务</button></div>{/if}
      {:else}
        <p>模拟动作已停止，工位 B 不继续运行。这里不模拟自动返回 A；可重置演示，从 A 工位初始状态重新体验。</p>
      {/if}
      {#if state.error}<div class="prototype-notice" role="alert">{state.error}</div>{/if}
    </div>
  </div>
  <p class="prototype-footnote">本地 Mock 状态与配置，仅演示产品交互；不代表真实迁移、产线连接或现场部署结果。</p>
</div>
