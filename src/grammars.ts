import { addDefaultParsers } from "@opentui/core";
import { join } from "node:path";

// Extra tree-sitter grammars we ship under ./grammars/<filetype>/, each holding
// a grammar.wasm + highlights.scm. They're added to OpenTUI's default parser set
// so <code filetype=...> highlights them. The four grammars OpenTUI bundles
// itself (typescript, javascript, markdown, zig) are intentionally not listed.
const GRAMMARS = [
	"bash",
	"c",
	"cpp",
	"csharp",
	"css",
	"dart",
	"elixir",
	"go",
	"html",
	"java",
	"json",
	"kotlin",
	"lua",
	"python",
	"ruby",
	"rust",
	"scala",
	"swift",
	"toml",
];

let registered = false;

// Register our bundled grammars. Must run before the renderer creates its
// TreeSitterClient (i.e. before createCliRenderer).
export function registerGrammars(): void {
	if (registered) return;
	registered = true;

	const dir = join(import.meta.dirname, "grammars");
	addDefaultParsers(
		GRAMMARS.map((filetype) => ({
			filetype,
			queries: { highlights: [join(dir, filetype, "highlights.scm")] },
			wasm: join(dir, filetype, "grammar.wasm"),
		})),
	);
}
