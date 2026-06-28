import { readdirSync } from "node:fs";
import type { FileNode } from "./types";
import { join } from "node:path";

// Read a single directory level — no nested children.
export function readDir(dir: string): FileNode[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .map((entry) => ({
      name: entry.name,
      path: join(dir, entry.name),
      isDirectory: entry.isDirectory(),
    }))
    .sort((a, b) => {
      // directories first, then alphabetical
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function indexOfChild(nodes: FileNode[], path: string): number {
  const i = nodes.findIndex((n) => n.path === path);
  return i === -1 ? 0 : i;
}
