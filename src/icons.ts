import type { FileNode } from "./types";

// Nerd Font glyphs (requires a patched "Nerd Font" terminal font, v3+).
// Each glyph is a single cell wide.

export interface Icon {
  glyph: string;
  color: string;
}

export const BASE_ICONS = {
  round_l: "", // nf-custom-round_left
  round_r: "", // nf-custom-round_right
}

const FOLDER: Icon = { glyph: "", color: "#7aa2f7" }; // nf-fa-folder
const FOLDER_OPEN: Icon = { glyph: "", color: "#7aa2f7" }; // nf-fa-folder_open
const FILE: Icon = { glyph: "", color: "#9aa5ce" }; // nf-fa-file

// Folders that get a distinctive icon by name.
const FOLDER_NAMES: Record<string, Icon> = {
  ".git": { glyph: "", color: "#f1502f" }, // nf-custom-folder_git
  ".github": { glyph: "", color: "#9aa5ce" }, // nf-custom-folder_github
  node_modules: { glyph: "", color: "#8cc84b" }, // nf-custom-folder_npm
  src: { glyph: "", color: "#7aa2f7" }, // nf-custom-folder_config
  ".vscode": { glyph: "", color: "#0098ff" }, // nf-dev-visualstudio
};

// Exact filename matches (checked before extension).
const FILE_NAMES: Record<string, Icon> = {
  "package.json": { glyph: "", color: "#cb3837" }, // nf-dev-npm
  "package-lock.json": { glyph: "", color: "#cb3837" },
  "bun.lock": { glyph: "", color: "#fbf0df" }, // nf-dev-bun-ish
  "bun.lockb": { glyph: "", color: "#fbf0df" },
  "tsconfig.json": { glyph: "", color: "#3178c6" }, // nf-seti-typescript
  "biome.json": { glyph: "", color: "#60a5fa" }, // nf-seti-config
  dockerfile: { glyph: "", color: "#2496ed" }, // nf-linux-docker
  ".gitignore": { glyph: "", color: "#f1502f" }, // nf-dev-git
  ".gitattributes": { glyph: "", color: "#f1502f" },
  ".env": { glyph: "", color: "#faf743" }, // nf-oct-gear-ish
  license: { glyph: "", color: "#cbcb41" }, // nf-fa-book
  makefile: { glyph: "", color: "#9aa5ce" }, // nf-dev-gnu
};

// Extension -> icon (lowercase, without the dot).
const EXTENSIONS: Record<string, Icon> = {
  ts: { glyph: "", color: "#3178c6" }, // nf-seti-typescript
  tsx: { glyph: "", color: "#61dafb" }, // nf-seti-react
  js: { glyph: "", color: "#f1e05a" }, // nf-seti-javascript
  jsx: { glyph: "", color: "#61dafb" },
  mjs: { glyph: "", color: "#f1e05a" },
  cjs: { glyph: "", color: "#f1e05a" },
  json: { glyph: "", color: "#cbcb41" }, // nf-seti-json
  jsonc: { glyph: "", color: "#cbcb41" },
  md: { glyph: "", color: "#9aa5ce" }, // nf-oct-markdown
  mdx: { glyph: "", color: "#9aa5ce" },
  html: { glyph: "", color: "#e34c26" }, // nf-dev-html5
  css: { glyph: "", color: "#563d7c" }, // nf-seti-css
  scss: { glyph: "", color: "#cf649a" },
  sass: { glyph: "", color: "#cf649a" },
  py: { glyph: "", color: "#3572a5" }, // nf-seti-python
  rs: { glyph: "", color: "#dea584" }, // nf-seti-rust
  go: { glyph: "", color: "#00add8" }, // nf-seti-go
  c: { glyph: "", color: "#599eff" }, // nf-custom-c
  h: { glyph: "", color: "#599eff" },
  cpp: { glyph: "", color: "#f34b7d" }, // nf-custom-cpp
  hpp: { glyph: "", color: "#f34b7d" },
  java: { glyph: "", color: "#cc3e44" }, // nf-dev-java
  rb: { glyph: "", color: "#701516" }, // nf-dev-ruby
  php: { glyph: "", color: "#a074c4" }, // nf-dev-php
  sh: { glyph: "", color: "#89e051" }, // nf-oct-terminal
  bash: { glyph: "", color: "#89e051" },
  zsh: { glyph: "", color: "#89e051" },
  fish: { glyph: "", color: "#89e051" },
  yml: { glyph: "", color: "#cb171e" }, // nf-seti-config
  yaml: { glyph: "", color: "#cb171e" },
  toml: { glyph: "", color: "#9c4221" },
  ini: { glyph: "", color: "#6d8086" },
  conf: { glyph: "", color: "#6d8086" },
  lock: { glyph: "", color: "#9aa5ce" }, // nf-fa-lock
  txt: { glyph: "", color: "#9aa5ce" }, // nf-fa-file_text
  pdf: { glyph: "", color: "#e5252a" }, // nf-fa-file_pdf
  zip: { glyph: "", color: "#f59e0b" }, // nf-oct-file_zip
  tar: { glyph: "", color: "#f59e0b" },
  gz: { glyph: "", color: "#f59e0b" },
  png: { glyph: "", color: "#a074c4" }, // nf-fa-file_image
  jpg: { glyph: "", color: "#a074c4" },
  jpeg: { glyph: "", color: "#a074c4" },
  gif: { glyph: "", color: "#a074c4" },
  svg: { glyph: "", color: "#ffb13b" },
  webp: { glyph: "", color: "#a074c4" },
  ico: { glyph: "", color: "#a074c4" },
};

export function iconFor(node: FileNode, isOpen = false): Icon {
  const lower = node.name.toLowerCase();

  if (node.isDirectory) {
    let F = FOLDER;
    if (FOLDER_NAMES[lower]) F = FOLDER_NAMES[lower];
    return isOpen ? FOLDER_OPEN : F;
  }

  if (FILE_NAMES[lower]) return FILE_NAMES[lower];

  const dot = lower.lastIndexOf(".");
  if (dot > 0) {
    const ext = lower.slice(dot + 1);
    if (EXTENSIONS[ext]) return EXTENSIONS[ext];
  }

  return FILE;
}
