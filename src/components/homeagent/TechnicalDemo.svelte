<script lang="ts">
import { onMount } from "svelte";
import { DemoSimulation, samples, type DemoProduct, type DemoSample } from "./technical-demo-model";
import type { DemoView } from "./technical-demo-scene";
export let product: DemoProduct;
let sample: DemoSample = "normal";
let simulation = new DemoSimulation(product, sample);
let state = simulation.snapshot();
let terminals = simulation.terminals();
let sceneHost: HTMLDivElement;
let wrapper: HTMLDivElement;
let view: DemoView | undefined;
let createView: typeof import("./technical-demo-scene").createDemoView;
let ready = false;
let error = "";
let speed = "1.5";
let visible = true;
const statusNames = { idle: "等待任务", running: "执行中", success: "已完成", fault: "异常停止", stopped: "主动停止" };
$: selected = samples[product].find((entry) => entry.id === sample) ?? samples[product][0];
function sync() {
	state = simulation.snapshot();
	terminals = simulation.terminals();
	view?.render(state);
}
function setupScene() {
	view?.dispose();
	view = undefined;
	if (!createView) return;
	try {
		view = createView(sceneHost, simulation.scene);
		view.render(state);
		error = "";
		ready = true;
	} catch {
		ready = false;
		error = "三维场景未能加载，请使用支持 WebGL 2 的浏览器重新打开页面。";
	}
}
function choose(next: DemoSample) {
	if (state.status === "running") return;
	sample = next;
	simulation = new DemoSimulation(product, sample);
	sync();
	setupScene();
}
function start() {
	if (state.status !== "idle") {
		simulation = new DemoSimulation(product, sample);
		sync();
		setupScene();
	}
	simulation.start();
	sync();
}
onMount(() => {
	let disposed = false;
	let frame = 0;
	let last = 0;
	let publish = 0;
	const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 });
	observer.observe(wrapper);
	import("./technical-demo-scene").then((module) => {
		if (disposed) return;
		createView = module.createDemoView;
		setupScene();
	}).catch(() => { if (!disposed) error = "场景资源加载失败，请刷新页面重试。"; });
	function animate(now: number) {
		const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
		last = now;
		if (view && visible && !document.hidden && simulation.state.status === "running") {
			simulation.step(dt * Number(speed));
			view.render(simulation.state);
			if (now - publish > 100 || simulation.state.status !== "running") {
				sync();
				publish = now;
			}
		}
		frame = window.requestAnimationFrame(animate);
	}
	frame = window.requestAnimationFrame(animate);
	return () => {
		disposed = true;
		window.cancelAnimationFrame(frame);
		observer.disconnect();
		view?.dispose();
	};
});
</script>

<div class="technical-demo" class:warehouse={product === "retask"} bind:this={wrapper} data-technical-demo={product} data-status={state.status}>
  <div class="demo-header"><div><strong>{product === "homeagent" ? "HomeAgent · 固定轨迹取书" : "迁作 ReTask · 跨工位搬运与分类"}</strong><p>{product === "homeagent" ? "简化三维场景＋固定轨迹＋局部物理计算" : "跨工位任务＋授权区域内局部绕障＋类别投放验证"}</p></div><span class="demo-badge">网页端演示</span></div>
  <fieldset class="sample-picker" disabled={state.status === "running"}><legend>选择执行样例</legend><div>{#each samples[product] as entry}<button type="button" aria-pressed={sample === entry.id} onclick={() => choose(entry.id)}>{entry.name}</button>{/each}</div></fieldset>
  <p class="sample-description">{selected.description}</p>
  <div class="scene-toolbar"><span>拖动画面可旋转观察</span><button type="button" onclick={() => view?.resetCamera()} disabled={!ready}>恢复视角</button></div>
  <div class="scene-host" bind:this={sceneHost}>{#if !ready}<p class="scene-loading" role="status">{error || "正在加载三维场景…"}</p>{/if}</div>
  <div class="scene-legend"><span><i class="legend-route"></i>{product === "homeagent" ? "固定轨迹" : "迁移路线"}</span><span><i class="legend-target"></i>目标台面</span><span><i class="legend-obstacle"></i>异常样例障碍</span>{#if product === "retask"}<span><i class="legend-local"></i>授权区域 / 局部路线</span>{/if}</div>
  <div class="run-controls"><div class="run-buttons"><button class="run-primary" type="button" disabled={!ready || state.status === "running"} onclick={start}>{state.status === "idle" ? "提交任务并运行样例" : "重新运行此样例"}</button>{#if state.status === "running"}<button type="button" onclick={() => { simulation.stop(); sync(); }}>停止本次执行</button>{/if}</div><label>演示速度<select bind:value={speed} disabled={state.status === "running"}><option value="1">1 倍</option><option value="1.5">1.5 倍</option><option value="2">2 倍</option></select></label></div>
  <div class="run-result" aria-live="polite" aria-atomic="true"><strong>{statusNames[state.status]}</strong><span>{state.status === "idle" ? "只需提交一次任务，后续自动执行" : state.status === "running" ? simulation.label : state.status === "success" ? product === "homeagent" ? "书已落定在床边交付台，用户端已收到通知" : "A 搬运与 B 分类均已验证，用户端已收到通知" : state.reason}</span></div>
  <div class="terminal-panels" aria-label="三端任务与状态">{#each terminals as terminal, index}<section class="terminal-card" aria-label={terminal.name}><div class="terminal-heading"><span>0{index + 1}</span><h3>{terminal.name}</h3></div><dl><div><dt>任务</dt><dd>{terminal.task}</dd></div><div><dt>状态</dt><dd class="terminal-status">{terminal.status}</dd></div><div><dt>反馈</dt><dd>{terminal.detail}</dd></div></dl></section>{/each}</div>
  <dl class="demo-metrics"><div><dt>模拟执行时间</dt><dd>{state.elapsed.toFixed(1)} s</dd></div><div><dt>已验证放置</dt><dd>{state.completed} / {product === "homeagent" ? 1 : 2}</dd></div><div><dt>局部计算反馈</dt><dd>{state.evidence}</dd></div></dl>
  <details class="event-log"><summary>三端事件记录（{state.events.length}）</summary>{#if state.events.length}<ol>{#each state.events as event}<li><time>{event.time.toFixed(1)} s</time><strong>{event.side}</strong><span>{event.message}</span></li>{/each}</ol>{:else}<p>提交任务后记录用户请求、中控指令、本体反馈与结果通知。</p>{/if}</details>
</div>

<style>
  .technical-demo { --demo-accent: #b57a45; border: 1px solid var(--line-color); border-radius: .75rem; overflow: hidden; background: var(--card-bg); color: var(--deep-text); }
  .warehouse { --demo-accent: var(--primary); }
  .demo-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.25rem; border-bottom: 1px solid var(--line-color); background: var(--btn-regular-bg); }
  .demo-header strong { font-size: .9rem; } .demo-header p { color: var(--btn-content); font-size: .75rem; margin-top: .3rem; }
  .demo-badge { flex-shrink: 0; color: var(--demo-accent); font-size: .65rem; border: 1px solid var(--line-color); border-radius: 2rem; padding: .3rem .6rem; }
  button, select { font: inherit; font-size: .8rem; color: var(--deep-text); border: 1px solid var(--line-color); border-radius: .35rem; background: var(--card-bg); min-height: 2.75rem; padding: .6rem .9rem; }
  button { cursor: pointer; } button:hover { background: var(--btn-regular-bg); } button:disabled, fieldset:disabled button { opacity: .5; cursor: not-allowed; }
  button:focus-visible, select:focus-visible, summary:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
  .sample-picker { padding: 1.25rem 1.25rem 0; } .sample-picker legend { float: left; width: 100%; margin-bottom: .6rem; color: var(--btn-content); font-size: .75rem; } .sample-picker > div { display: flex; flex-wrap: wrap; gap: .5rem; clear: both; }
  .sample-picker button[aria-pressed="true"] { color: var(--demo-accent); background: var(--btn-regular-bg); border-color: var(--demo-accent); font-weight: 600; }
  .sample-description { font-size: .8rem; line-height: 1.8; padding: .75rem 1.25rem 1rem; color: var(--btn-content); }
  .scene-toolbar { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .5rem 1rem; background: var(--btn-regular-bg); border-block: 1px solid var(--line-color); font-size: .7rem; color: var(--btn-content); }
  .scene-toolbar button { font-size: .7rem; padding: .4rem .7rem; min-height: 2.25rem; }
  .scene-host { height: 25rem; position: relative; background: var(--btn-regular-bg); overflow: hidden; }
  .scene-host :global(canvas) { display: block; width: 100%; height: 100%; touch-action: pan-y; } .scene-loading { position: absolute; inset: 0; display: grid; place-items: center; padding: 1.5rem; color: var(--btn-content); font-size: .8rem; text-align: center; }
  .scene-legend { display: flex; flex-wrap: wrap; gap: .5rem 1rem; padding: .8rem 1.25rem; font-size: .65rem; color: var(--btn-content); border-bottom: 1px solid var(--line-color); } .scene-legend span { display: flex; align-items: center; gap: .4rem; } .scene-legend i { width: .65rem; height: .65rem; display: inline-block; } .legend-route { width: 1.2rem !important; height: 0 !important; border-top: 2px dashed var(--demo-accent); } .legend-target { background: var(--demo-accent); opacity: .65; } .legend-obstacle { background: #b96559; }
  .legend-local { background: #68938b; }
  .run-controls { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .75rem; padding: 1.25rem; } .run-buttons { display: flex; flex-wrap: wrap; gap: .6rem; } .run-primary { color: var(--page-bg); background: var(--deep-text); border-color: var(--deep-text); } .run-primary:hover { background: var(--deep-text); opacity: .85; } .run-controls label { display: flex; align-items: center; gap: .5rem; font-size: .7rem; color: var(--btn-content); }
  .run-result { display: flex; align-items: baseline; gap: .8rem; margin: 0 1.25rem 1.25rem; padding: .9rem 1rem; background: var(--btn-regular-bg); border-left: 2px solid var(--demo-accent); line-height: 1.8; font-size: .8rem; } .run-result strong { flex-shrink: 0; color: var(--demo-accent); } .run-result span { color: var(--btn-content); }
  .terminal-panels { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; padding: 0 1.25rem 1.25rem; }
  .terminal-card { min-width: 0; border: 1px solid var(--line-color); border-radius: .4rem; padding: 1rem; }
  .terminal-heading { display: flex; gap: .5rem; align-items: center; border-bottom: 1px solid var(--line-color); padding-bottom: .65rem; } .terminal-heading span { color: var(--demo-accent); font-size: .65rem; } .terminal-heading h3 { font-size: .8rem; font-weight: 600; margin: 0; }
  .terminal-card dl { margin-top: .75rem; } .terminal-card dl > div + div { margin-top: .65rem; } dt { color: var(--btn-content); font-size: .65rem; } .terminal-card dd { font-size: .75rem; line-height: 1.75; margin-top: .25rem; overflow-wrap: anywhere; } .terminal-status { color: var(--demo-accent); font-weight: 500; }
  .demo-metrics { display: grid; grid-template-columns: 1fr 1fr 2fr; gap: 1rem; border-block: 1px solid var(--line-color); padding: 1rem 1.25rem; background: var(--btn-regular-bg); } .demo-metrics dd { font-size: .75rem; line-height: 1.8; margin-top: .25rem; }
  .event-log { padding: .75rem 1.25rem; font-size: .75rem; line-height: 1.8; } .event-log summary { cursor: pointer; min-height: 2.75rem; padding-block: .6rem; } .event-log li { display: grid; grid-template-columns: 3rem 6rem 1fr; gap: .5rem; border-top: 1px solid var(--line-color); padding-block: .5rem; } .event-log time { color: var(--btn-content); } .event-log strong { font-weight: 500; } .event-log p { color: var(--btn-content); }
  @media (max-width: 900px) { .terminal-panels { grid-template-columns: 1fr; } .terminal-card dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .65rem; } .terminal-card dl > div + div { margin-top: 0; } }
  @media (max-width: 540px) { .demo-header { align-items: flex-start; } .demo-badge { display: none; } .scene-host { height: 21rem; } .terminal-card dl { grid-template-columns: 1fr; } .terminal-card dl > div + div { margin-top: .5rem; } .demo-metrics { grid-template-columns: 1fr 1fr; } .demo-metrics > div:last-child { grid-column: 1 / -1; } .run-result { align-items: flex-start; flex-direction: column; gap: .25rem; } .event-log li { grid-template-columns: 3rem 1fr; } .event-log li span { grid-column: 1 / -1; } }
</style>
