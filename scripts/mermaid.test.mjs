import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { remarkMermaid } from "../src/plugins/remark-mermaid.js";

// Use Astro's own Markdown processor so this exercises the actual rendering
// pipeline, including the code highlighter that used to consume these fences.
const astroRequire = createRequire(import.meta.resolve("astro"));
const { createMarkdownProcessor } = await import(
	pathToFileURL(astroRequire.resolve("@astrojs/markdown-remark")).href
);
const expressiveRequire = createRequire(
	import.meta.resolve("astro-expressive-code"),
);
const { default: rehypeExpressiveCode } = await import(
	pathToFileURL(expressiveRequire.resolve("rehype-expressive-code")).href
);
const processor = await createMarkdownProcessor({
	syntaxHighlight: false,
	remarkPlugins: [remarkMermaid],
	rehypePlugins: [rehypeExpressiveCode],
});

test("Mermaid fences bypass highlighting and safely preserve diagram source", async () => {
	const { code } = await processor.render(
		[
			"```mermaid",
			'flowchart LR\n  A["中文 & <script>alert(1)</script>"] --> B[结束]',
			"```",
			"",
			"```js",
			"const ordinaryCode = 1;",
			"```",
		].join("\n"),
	);
	assert.equal((code.match(/<mermaid-diagram\b/g) ?? []).length, 1);
	assert.match(code, /class="mermaid-source"/);
	assert.match(
		code,
		/中文 (?:&amp;|&#x26;) &#x3C;script>alert\(1\)&#x3C;\/script>/,
	);
	assert.doesNotMatch(code, /<script>alert\(1\)<\/script>/);
	assert.equal((code.match(/class="expressive-code"/g) ?? []).length, 1);
});

test("nested and uppercase Mermaid fences also become diagrams", async () => {
	const { code } = await processor.render(
		"> ```MERMAID\n> sequenceDiagram\n>   Alice->>Bob: Hello\n> ```",
	);
	assert.match(code, /<blockquote>\s*<mermaid-diagram/);
	assert.match(code, /Alice->>Bob: Hello/);
	assert.doesNotMatch(code, /class="expressive-code"/);
});
