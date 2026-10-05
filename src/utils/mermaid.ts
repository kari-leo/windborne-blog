let mermaidModule: Promise<typeof import("mermaid")> | undefined;
let renderQueue = Promise.resolve();
let diagramId = 0;

function currentTheme() {
	return document.documentElement.classList.contains("dark")
		? "dark"
		: "default";
}

class MermaidDiagram extends HTMLElement {
	connectedCallback() {
		this.scheduleRender();
	}

	scheduleRender() {
		// Mermaid has global configuration, so serialize rendering and theme changes.
		renderQueue = renderQueue
			.then(() => this.renderDiagram())
			.catch((error) => {
				console.error("Unable to load Mermaid", error);
				this.showError();
			});
	}

	private showError() {
		this.classList.remove("mermaid-rendered");
		this.querySelector(".mermaid-output")?.remove();
		if (this.querySelector(".mermaid-error")) return;
		const message = document.createElement("p");
		message.className = "mermaid-error";
		message.setAttribute("role", "status");
		message.textContent = "Mermaid 图表渲染失败，请检查下方源码。";
		this.prepend(message);
	}

	private async renderDiagram() {
		if (!this.isConnected) return;
		const theme = currentTheme();
		if (this.dataset.renderedTheme === theme) return;
		const source = this.querySelector(".mermaid-source")?.textContent;
		if (!source) return;

		mermaidModule ??= import("mermaid");
		const { default: mermaid } = await mermaidModule;
		await document.fonts.ready;
		if (!this.isConnected) return;

		mermaid.initialize({
			startOnLoad: false,
			securityLevel: "strict",
			suppressErrorRendering: true,
			theme,
			fontFamily: "Geist Variable, sans-serif",
		});

		let output = this.querySelector<HTMLElement>(".mermaid-output");
		if (!output) {
			output = document.createElement("div");
			output.className = "mermaid-output";
			this.append(output);
		}

		try {
			const { svg, bindFunctions } = await mermaid.render(
				`mermaid-${++diagramId}`,
				source,
				output,
			);
			if (!this.isConnected) return;
			output.innerHTML = svg;
			// Keep wide diagrams readable; the surrounding card scrolls horizontally.
			const renderedSvg = output.querySelector("svg");
			if (renderedSvg && renderedSvg.viewBox.baseVal.width > 0) {
				renderedSvg.setAttribute(
					"width",
					String(renderedSvg.viewBox.baseVal.width),
				);
			}
			bindFunctions?.(output);
			this.querySelector(".mermaid-error")?.remove();
			this.classList.add("mermaid-rendered");
		} catch (error) {
			console.error("Unable to render Mermaid diagram", error);
			this.showError();
		}
		this.dataset.renderedTheme = theme;
	}
}

// Custom elements reconnect automatically when Swup inserts a new page or
// restores cached content, including navigation from a page without diagrams.
if (!customElements.get("mermaid-diagram")) {
	customElements.define("mermaid-diagram", MermaidDiagram);
	let theme = currentTheme();
	new MutationObserver(() => {
		const nextTheme = currentTheme();
		if (nextTheme === theme) return;
		theme = nextTheme;
		for (const diagram of document.querySelectorAll<MermaidDiagram>(
			"mermaid-diagram",
		)) {
			diagram.scheduleRender();
		}
	}).observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class"],
	});
}
