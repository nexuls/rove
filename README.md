# rove

A fast, keyboard-driven terminal file manager — miller columns, live syntax-highlighted previews, and a UI that paints itself in your terminal's own colors.

Built with [OpenTUI](https://git.new/create-tui) + React, running on [Bun](https://bun.sh).

![rove](assets/screenshot.png)

## What it does

rove gives you the ranger/lf/yazi-style three-pane view: **parent directory** on the left, **current directory** in the middle, **preview** on the right. Move through the tree with the keyboard and the panes shift with you, so you always have context about where you are and what's inside whatever you've got selected.

## Features

- **Miller columns** — parent / current / child layout that follows your cursor as you move.
- **Live file previews** — text files open in the right pane with a line-number gutter; directories show their contents.
- **Syntax highlighting** — tree-sitter powered, with **23 languages** bundled out of the box: TypeScript, JavaScript, Markdown, Zig (via OpenTUI) plus Bash, C, C++, C#, CSS, Dart, Elixir, Go, HTML, Java, JSON, Kotlin, Lua, Python, Ruby, Rust, Scala, Swift and TOML. Unrecognized text still previews as plain text.
- **Smart reads** — only the first 128 KB of a file is read for previews, binary files are detected (and skipped) instead of garbling the screen, and tabs are expanded for stable rendering.
- **Filetype icons** — every entry gets a glyph (Nerd Font recommended).
- **Status bar** — selected file's icon, name, human-readable size, colored `rwxr-xr-x` permission bits, symlink indicator, and your scroll position (`TOP` / `BOT` / `42%`).
- **Terminal-native theming** — rove reads your terminal's color palette and *re-reads it live* when your color scheme changes (via DEC mode 2031, with a polling fallback). Switch your terminal from light to dark and rove follows.
- **Mouse scroll** in the preview pane.

## Getting started

Requires [Bun](https://bun.sh) and, ideally, a [Nerd Font](https://www.nerdfonts.com/) for the icons.

```bash
bun install
bun dev
```

rove opens in the directory you launch it from.

## Keybindings

| Key | Action |
| --- | --- |
| `↑` / `k` | Move selection up |
| `↓` / `j` | Move selection down |
| `←` / `h` | Go to parent directory |
| `→` / `l` / `Enter` | Enter directory |
| `Ctrl+P` | Toggle the terminal palette inspector |
| `` Ctrl+` `` | Toggle the OpenTUI debug console |
| `Ctrl+C` | Quit |

## Project layout

| File | Responsibility |
| --- | --- |
| `src/index.tsx` | App entry — layout, navigation state, keybindings |
| `src/file-tree.tsx` | Renders a column of directory entries |
| `src/preview.tsx` | File previews, syntax theme, filetype → grammar mapping |
| `src/statusbar.tsx` | Bottom status bar |
| `src/palette.tsx` | Terminal palette inspector overlay |
| `src/hooks.ts` | `useTerminalColors` — live terminal palette tracking |
| `src/utils.ts` | Directory reads, stat/permission formatting, preview reads |
| `src/icons.ts` | Filetype → icon/color mapping |
| `src/grammars.ts` | Registers the bundled tree-sitter grammars |
| `src/grammars/` | Bundled `grammar.wasm` + `highlights.scm` per language |

## Development

```bash
bun dev        # run with hot reload
bun run lint   # biome lint
bun run format # biome format --write
bun run check  # biome check --write
```

## Tech

[OpenTUI](https://git.new/create-tui) (core + React renderer) · React 19 · Bun · tree-sitter · Biome.

Scaffolded with `bun create tui`.
