import { type Dirent, lstatSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import type { FileMeta, FileNode } from "./types";

// Read a single directory level — no nested children.
export function readDir(dir: string): FileNode[] {
	let entries: Dirent[];
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return [];
	}

	return entries
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
			// directories first, then alphabetical
			if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
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
