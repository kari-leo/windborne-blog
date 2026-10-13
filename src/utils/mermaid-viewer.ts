let viewerId = 0;

// A viewer moves the existing SVG into a modal rather than cloning it, so SVG
// marker IDs stay unique and diagram bindings survive opening and closing.
export function attachMermaidViewer(
	host: HTMLElement,
	output: HTMLElement,
): () => void {
	const rendered = output.querySelector("svg");
	if (!rendered || rendered.viewBox.baseVal.width <= 0) return () => {};
	const svg: SVGSVGElement = rendered;
	host.querySelector(".mermaid-controls")?.remove();
	host.querySelector(".mermaid-viewer")?.remove();
	const abort = new AbortController();
	const signal = abort.signal;
	const viewport =
		host.querySelector<HTMLElement>(".mermaid-viewport") ??
		document.createElement("div");
	viewport.className = "mermaid-viewport";
	viewport.tabIndex = 0;
	viewport.setAttribute("aria-label", "Mermaid 图表，可在放大后滚动查看");
	viewport.append(output);
	host.append(viewport);
	const controls = document.createElement("div");
	controls.className = "mermaid-controls";
	controls.setAttribute("role", "group");
	controls.setAttribute("aria-label", "图表尺寸控制");
	const value = document.createElement("output");
	value.className = "mermaid-scale";
	value.setAttribute("aria-live", "polite");
	let scale = 1;
	let fitMode = true;
	const natural = {
		width: svg.viewBox.baseVal.width,
		height: svg.viewBox.baseVal.height,
	};
	function button(
		text: string,
		label: string,
		action: () => void,
	): HTMLButtonElement {
		const el = document.createElement("button");
		el.type = "button";
		el.textContent = text;
		el.setAttribute("aria-label", label);
		el.addEventListener("click", action, { signal });
		controls.append(el);
		return el;
	}
	function applyScale(next: number, fit = false): void {
		const old = scale;
		const anchorX = (viewport.scrollLeft + viewport.clientWidth / 2) / old;
		const anchorY = (viewport.scrollTop + viewport.clientHeight / 2) / old;
		scale = next;
		fitMode = fit;
		svg.style.maxWidth = "none";
		svg.style.width = `${natural.width * scale}px`;
		svg.style.height = `${natural.height * scale}px`;
		output.style.width = `${natural.width * scale}px`;
		value.textContent = `${Math.round(scale * 100)}%`;
		value.setAttribute("aria-label", `图表缩放 ${Math.round(scale * 100)}%`);
		minus.disabled = scale <= 0.1;
		plus.disabled = scale >= 4;
		fitButton.setAttribute("aria-pressed", String(fitMode));
		if (fit) {
			viewport.scrollLeft = 0;
			viewport.scrollTop = 0;
		} else {
			viewport.scrollLeft = anchorX * scale - viewport.clientWidth / 2;
			viewport.scrollTop = anchorY * scale - viewport.clientHeight / 2;
		}
	}
	function fitWidth(): void {
		if (viewport.clientWidth > 0)
			applyScale(Math.min(1, viewport.clientWidth / natural.width), true);
	}
	const fitButton = button("适应宽度", "适应图表宽度", fitWidth);
	const minus = button("−", "缩小图表", () =>
		applyScale(Math.max(0.1, scale / 1.25)),
	);
	controls.append(value);
	const plus = button("＋", "放大图表", () =>
		applyScale(Math.min(4, Math.max(0.1, scale * 1.25))),
	);
	button("100%", "图表原始尺寸", () => applyScale(1));
	const expand = button("展开查看", "展开图表查看", () => {
		dialog.append(controls, viewport);
		dialog.showModal();
		fitWidth();
		close.focus();
	});
	host.insertBefore(controls, viewport);
	const dialog = document.createElement("dialog");
	dialog.className = "mermaid-viewer";
	dialog.setAttribute("aria-labelledby", `mermaid-viewer-title-${++viewerId}`);
	const header = document.createElement("div");
	header.className = "mermaid-viewer-header";
	const title = document.createElement("h2");
	title.id = `mermaid-viewer-title-${viewerId}`;
	title.textContent = "图表放大查看";
	const close = document.createElement("button");
	close.type = "button";
	close.textContent = "关闭";
	close.setAttribute("aria-label", "关闭图表查看");
	close.addEventListener("click", () => dialog.close(), { signal });
	header.append(title, close);
	dialog.append(header);
	host.append(dialog);
	function restore(): void {
		host.insertBefore(controls, dialog);
		host.insertBefore(viewport, dialog);
		fitWidth();
	}
	dialog.addEventListener(
		"close",
		() => {
			restore();
			if (host.isConnected) expand.focus();
		},
		{ signal },
	);
	viewport.addEventListener(
		"keydown",
		(event) => {
			if (event.key === "+" || event.key === "=") {
				event.preventDefault();
				plus.click();
			}
			if (event.key === "-") {
				event.preventDefault();
				minus.click();
			}
			if (event.key === "0") {
				event.preventDefault();
				fitWidth();
			}
		},
		{ signal },
	);
	let lastWidth = 0;
	const observer = new ResizeObserver(() => {
		if (fitMode && lastWidth !== viewport.clientWidth) {
			lastWidth = viewport.clientWidth;
			fitWidth();
		}
	});
	observer.observe(viewport);
	fitWidth();
	return () => {
		observer.disconnect();
		abort.abort();
		if (dialog.open) {
			dialog.close();
			restore();
		}
		dialog.remove();
	};
}
