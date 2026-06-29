import {
	closeSync,
	type Dirent,
	lstatSync,
	openSync,
	readFileSync,
	readSync,
	readdirSync,
} from "node:fs";
import { basename, join } from "node:path";
import type { FileMeta, FileNode } from "./types";

// View options that influence which entries are listed and in what order.
// Mirrors the relevant fields of the `Settings` shape from use-settings.
export interface ReadDirOptions {
	showHidden?: boolean;
	respectGitignore?: boolean;
	sortDirsFirst?: boolean;
}

// Read a single directory level — no nested children. Filtering and ordering
// are driven by `options`; with no options every entry is returned sorted
// directories-first.
export function readDir(dir: string, options: ReadDirOptions = {}): FileNode[] {
	const {
		showHidden = true,
		respectGitignore = false,
		sortDirsFirst = true,
	} = options;

	let entries: Dirent[];
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return [];
	}

	const ignored = respectGitignore ? loadGitignore(dir) : null;

	return entries
		.filter((entry) => {
			if (!showHidden && entry.name.startsWith(".")) return false;
			// .git is noise in a file browser; always hide it when respecting
			// gitignore, even though it isn't usually listed in the file itself.
			if (respectGitignore && entry.name === ".git") return false;
			if (ignored?.(entry.name, entry.isDirectory())) return false;
			return true;
		})
		.map((entry) => {
			const path = join(dir, entry.name);
			let size = 0;
			let mode = "---------";
			try {
				const stat = lstatSync(path);
				size = stat.size;
				mode = formatMode(stat.mode);
			} catch {
				// keep defaults if the entry can't be stat'd
			}
			return {
				name: entry.name,
				path,
				isDirectory: entry.isDirectory(),
				size,
				mode,
			};
		})
		.sort((a, b) => {
			// optionally group directories first, then alphabetical
			if (sortDirsFirst && a.isDirectory !== b.isDirectory) {
				return a.isDirectory ? -1 : 1;
			}
			return a.name.localeCompare(b.name);
		});
}

// Build a matcher from the .gitignore in `dir` (if any). The returned function
// reports whether a given entry name should be hidden. This is a pragmatic
// subset of gitignore semantics: it matches a single directory's own patterns
// by basename with `*`/`?` wildcards — enough for the common cases (build dirs,
// lockfiles, logs) without pulling in a full ignore parser.
function loadGitignore(
	dir: string,
): ((name: string, isDir: boolean) => boolean) | null {
	let raw: string;
	try {
		raw = readFileSync(join(dir, ".gitignore"), "utf8");
	} catch {
		return null;
	}

	const rules = raw
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith("#"))
		.map((line) => {
			const negated = line.startsWith("!");
			const body = negated ? line.slice(1) : line;
			const dirOnly = body.endsWith("/");
			// Strip a trailing slash and any leading "/" anchor — we match by
			// basename, so the anchor doesn't change the outcome here.
			const pattern = body.replace(/\/$/, "").replace(/^\//, "");
			return { negated, dirOnly, regex: globToRegExp(pattern) };
		});

	if (rules.length === 0) return null;

	return (name, isDir) => {
		let ignored = false;
		for (const rule of rules) {
			if (rule.dirOnly && !isDir) continue;
			if (rule.regex.test(name)) ignored = !rule.negated;
		}
		return ignored;
	};
}

// Translate a gitignore-style glob (supporting `*` and `?`) into a RegExp
// anchored to the whole basename.
function globToRegExp(glob: string): RegExp {
	const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	const body = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
	return new RegExp(`^${body}$`);
}

// Format a numeric mode into an rwx-style permission string, e.g. "rwxr-xr-x".
function formatMode(mode: number): string {
	const perms = ["x", "w", "r"];
	let out = "";
	for (let i = 8; i >= 0; i--) {
		out += mode & (1 << i) ? perms[i % 3] : "-";
	}
	return out;
}

// Fetch detailed metadata for a single file or directory.
export function statFile(path: string): FileMeta | null {
	try {
		const stat = lstatSync(path);
		return {
			name: basename(path),
			path,
			isDirectory: stat.isDirectory(),
			isSymlink: stat.isSymbolicLink(),
			size: stat.size,
			mode: formatMode(stat.mode),
			modified: stat.mtime,
			created: stat.birthtime,
		};
	} catch {
		return null;
	}
}

// Human-readable byte size, e.g. "1.4 KB".
export function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes}  B`;
	const units = ["KB", "MB", "GB", "TB"];
	let size = bytes / 1024;
	let unit = 0;
	while (size >= 1024 && unit < units.length - 1) {
		size /= 1024;
		unit++;
	}
	return `${size.toFixed(1)} ${units[unit]}`;
}

// Map a single rwx-style permission character to a terminal palette index.
// r → yellow, w → red, x → green, anything else (e.g. "-") → dim gray.
export function modeColorIndex(char: string): number {
	switch (char) {
		case "r":
			return 3; // yellow
		case "w":
			return 1; // red
		case "x":
		case "s":
		case "t":
			return 2; // green
		default:
			return 8; // bright black / dim
	}
}

// Stable position labels for a 9-char rwx mode string (owner/group/other).
const MODE_SLOTS = [
	"owner-r",
	"owner-w",
	"owner-x",
	"group-r",
	"group-w",
	"group-x",
	"other-r",
	"other-w",
	"other-x",
];

// Split a mode string into colored segments ready for rendering, e.g.
// "rwxr-xr-x" → [{ key: "owner-r", char: "r", color: 3 }, ...].
export function colorizeMode(
	mode: string,
): { key: string; char: string; color: number }[] {
	return [...mode].map((char, i) => ({
		key: MODE_SLOTS[i] ?? `slot-${i}`,
		char,
		color: modeColorIndex(char),
	}));
}

export function indexOfChild(nodes: FileNode[], path: string): number {
	const i = nodes.findIndex((n) => n.path === path);
	return i === -1 ? 0 : i;
}

// Only read this many bytes for a preview — enough to fill a viewport without
// slurping huge files into memory.
const PREVIEW_BYTE_LIMIT = 128 * 1024;

export type FilePreview =
	| { kind: "text"; lines: string[]; truncated: boolean }
	| { kind: "binary" }
	| { kind: "empty" }
	| { kind: "error" };

// Read the head of a file for previewing. Detects binary content (NUL byte)
// and returns it split into lines, with tabs expanded for stable rendering.
export function readFilePreview(path: string): FilePreview {
	let fd: number;
	try {
		fd = openSync(path, "r");
	} catch {
		return { kind: "error" };
	}

	try {
		const buf = Buffer.alloc(PREVIEW_BYTE_LIMIT);
		const bytesRead = readSync(fd, buf, 0, PREVIEW_BYTE_LIMIT, 0);
		if (bytesRead === 0) return { kind: "empty" };

		const slice = buf.subarray(0, bytesRead);
		if (slice.includes(0)) return { kind: "binary" };

		const lines = slice
			.toString("utf8")
			.split("\n")
			.map((line) => line.replace(/\r$/, "").replace(/\t/g, "    "));
		return { kind: "text", lines, truncated: bytesRead === PREVIEW_BYTE_LIMIT };
	} catch {
		return { kind: "error" };
	} finally {
		closeSync(fd);
	}
}
