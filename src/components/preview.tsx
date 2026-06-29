import {
	type CodeRenderable,
	type MouseEvent,
	SyntaxStyle,
} from "@opentui/core";
import { useEffect, useMemo, useRef } from "react";
import { useTerminalColors } from "../lib/hooks";
import { iconFor } from "../lib/icons";
import type { FileNode } from "../lib/types";
import { readFilePreview } from "../lib/utils";

// Map file extensions onto tree-sitter grammars. typescript/javascript/markdown/
// zig ship with OpenTUI; the rest are registered from src/grammars (see grammars.ts).
// Unmapped types still render (as plain text) — they just aren't highlighted.
const FILETYPES: Record<string, string> = {
	// Bundled with OpenTUI.
	ts: "typescript",
	tsx: "typescript",
	mts: "typescript",
	cts: "typescript",
	js: "javascript",
	jsx: "javascript",
	mjs: "javascript",
	cjs: "javascript",
	md: "markdown",
	mdx: "markdown",
	zig: "zig",
	zon: "zig",
	// Registered from src/grammars.
	sh: "bash",
	bash: "bash",
	zsh: "bash",
	ksh: "bash",
	c: "c",
	h: "c",
	cpp: "cpp",
	cc: "cpp",
	cxx: "cpp",
	"c++": "cpp",
	hpp: "cpp",
	hh: "cpp",
	hxx: "cpp",
	"h++": "cpp",
	cs: "csharp",
	css: "css",
	dart: "dart",
	ex: "elixir",
	exs: "elixir",
	go: "go",
	html: "html",
	htm: "html",
	java: "java",
	json: "json",
	jsonc: "json",
	kt: "kotlin",
	kts: "kotlin",
	lua: "lua",
	py: "python",
	pyi: "python",
	pyw: "python",
	rb: "ruby",
	rake: "ruby",
	gemspec: "ruby",
	rs: "rust",
	scala: "scala",
	sc: "scala",
	swift: "swift",
	toml: "toml",
};

function filetypeFor(name: string): string | undefined {
	const dot = name.lastIndexOf(".");
	if (dot <= 0) return undefined;
	return FILETYPES[name.slice(dot + 1).toLowerCase()];
}

// Maps tree-sitter capture scopes to colors (Tokyo Night-ish, matching icons).
const THEME = [
	{
		scope: [
			"keyword",
			"keyword.return",
			"keyword.function",
			"keyword.import",
			"keyword.conditional",
			"keyword.repeat",
			"keyword.exception",
			"keyword.operator",
		],
		style: { foreground: "#bb9af7" },
	},
	{
		scope: ["string", "string.escape", "string.regexp"],
		style: { foreground: "#9ece6a" },
	},
	{
		scope: ["number", "boolean", "constant", "constant.builtin"],
		style: { foreground: "#ff9e64" },
	},
	{
		scope: ["comment", "comment.documentation"],
		style: { foreground: "#565f89", italic: true },
	},
	{
		scope: [
			"function",
			"function.call",
			"function.method",
			"function.builtin",
			"constructor",
		],
		style: { foreground: "#7aa2f7" },
	},
	{ scope: ["type", "type.builtin"], style: { foreground: "#2ac3de" } },
	{ scope: ["variable.member", "property"], style: { foreground: "#7dcfff" } },
	{
		scope: ["variable", "variable.parameter"],
		style: { foreground: "#c0caf5" },
	},
	{
		scope: [
			"operator",
			"punctuation.delimiter",
			"punctuation.bracket",
			"punctuation.special",
		],
		style: { foreground: "#89ddff" },
	},
	{ scope: ["attribute", "tag", "label"], style: { foreground: "#f7768e" } },
	{ scope: ["module", "module.builtin"], style: { foreground: "#7aa2f7" } },
];

// Lazily built once — SyntaxStyle needs the native render lib initialized,
// which only happens after the renderer is created.
let sharedStyle: SyntaxStyle | null = null;
function syntaxStyle(): SyntaxStyle {
	if (!sharedStyle) sharedStyle = SyntaxStyle.fromTheme(THEME);
	return sharedStyle;
}

export function Preview({ node }: { node: FileNode }) {
	const preview = useMemo(() => readFilePreview(node.path), [node.path]);

	if (preview.kind === "text") {
		return (
			<CodePreview
				text={preview.lines.join("\n")}
				filetype={filetypeFor(node.name)}
			/>
		);
	}

	const message =
		preview.kind === "empty"
			? "(empty file)"
			: preview.kind === "binary"
				? "No preview for binary files"
				: "Unable to read file";

	return <Placeholder node={node} message={message} />;
}

// Syntax-highlighted code with a line-number gutter, both from OpenTUI core.
function CodePreview({ text, filetype }: { text: string; filetype?: string }) {
	const c = useTerminalColors();
	const codeRef = useRef<CodeRenderable>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: No need to re-run on every render, just when the text or filetype changes.
	useEffect(() => {
		const code = codeRef.current;
		if (!code) return;
		code.scrollY = 0;
	}, [text, filetype]);

	const onScroll = (event: MouseEvent) => {
		const code = codeRef.current;
		if (!code || !event.scroll) return;
		const step =
			event.scroll.direction === "up"
				? -event.scroll.delta
				: event.scroll.delta;
		code.scrollY = Math.max(0, Math.min(code.maxScrollY, code.scrollY + step));
	};

	return (
		<line-number
			height="100%"
			flexGrow={1}
			overflow="hidden"
			fg={c[8]}
			onMouseScroll={onScroll}
		>
			<code
				ref={codeRef}
				height="100%"
				flexGrow={1}
				content={`${text}\n\n\n`}
				filetype={filetype}
				syntaxStyle={syntaxStyle()}
				wrapMode="none"
			/>
		</line-number>
	);
}

// Centered icon + name + message for files we can't render as text.
function Placeholder({ node, message }: { node: FileNode; message: string }) {
	const c = useTerminalColors();
	const icon = iconFor(node);

	return (
		<box
			height="100%"
			flexGrow={1}
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
		>
			<text fg={icon.color} selectable={false}>
				{icon.glyph}
			</text>
			<text fg={c[15]} selectable={false}>
				{node.name}
			</text>
			<text fg={c[8]} selectable={false}>
				{message}
			</text>
		</box>
	);
}
