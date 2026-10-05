import { visit } from "unist-util-visit";

// Convert Mermaid fences before code highlighting, keeping an escaped source
// block available when JavaScript is disabled or a diagram cannot be rendered.
export function remarkMermaid() {
	return (tree) => {
		visit(tree, "code", (node, index, parent) => {
			if (node.lang?.toLowerCase() !== "mermaid" || !parent) return;
			parent.children[index] = {
				type: "paragraph",
				data: {
					hName: "mermaid-diagram",
					hProperties: { className: ["mermaid-diagram", "not-prose"] },
					hChildren: [
						{
							type: "element",
							tagName: "pre",
							properties: { className: ["mermaid-source"] },
							children: [{ type: "text", value: node.value }],
						},
					],
				},
				children: [{ type: "text", value: node.value }],
			};
		});
	};
}
