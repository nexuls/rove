import { createRoot, useKeyboard } from "@opentui/react";
import { createCliRenderer } from "@opentui/core";
import { useMemo, useState } from "react";
import { dirname } from "node:path";
import { FileTree } from "./file-tree";
import type { FileMeta } from "./types";
import { useTerminalColors } from "./hooks";
import { colorizeMode, formatSize, indexOfChild, readDir, statFile } from "./utils";
import { BASE_ICONS, iconFor } from "./icons";
import { Palette } from "./palette";

function App() {
	const c = useTerminalColors();

	const rootDir = process.cwd();
	const [currentDir, setCurrentDir] = useState(rootDir);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const parentDir = useMemo(() => dirname(currentDir), [currentDir]);
	const isAtRoot = parentDir === currentDir;

	const parentNodes = useMemo(
		() => (isAtRoot ? [] : readDir(parentDir)),
		[parentDir, isAtRoot],
	);
	const currentNodes = useMemo(() => readDir(currentDir), [currentDir]);

	const clampedIndex = Math.min(
		selectedIndex,
		Math.max(0, currentNodes.length - 1),
	);
	const selected = currentNodes[clampedIndex];

	const childNodes = useMemo(
		() => (selected?.isDirectory ? readDir(selected.path) : []),
		[selected],
	);

	const meta = useMemo(
		() => (selected ? statFile(selected.path) : null),
		[selected],
	);

	const parentSelectedIndex = useMemo(
		() => indexOfChild(parentNodes, currentDir),
		[parentNodes, currentDir],
	);

	function enter() {
		if (selected?.isDirectory) {
			setCurrentDir(selected.path);
			setSelectedIndex(0);
		}
	}

	function goToParent() {
		if (isAtRoot) return;
		const idx = indexOfChild(parentNodes, currentDir);
		setCurrentDir(parentDir);
		setSelectedIndex(idx);
	}

	useKeyboard((key) => {
		switch (key.name) {
			case "up":
			case "k":
				setSelectedIndex((i) =>
					Math.max(0, Math.min(i, currentNodes.length - 1) - 1),
				);
				break;
			case "down":
			case "j":
				setSelectedIndex((i) => Math.min(currentNodes.length - 1, i + 1));
				break;
			case "left":
			case "h":
				goToParent();
				break;
			case "right":
			case "l":
			case "return":
				enter();
				break;
		}
	});

	return (
		<box height="100%" flexGrow={1} flexDirection="column">
			<text fg={c[4]}>{currentDir}</text>

			<box height="100%" flexGrow={1} flexDirection="row">
				<Column active size={0.3}>
					<FileTree
						nodes={parentNodes}
						selectedIndex={parentSelectedIndex}
						showMeta={false}
						onSelect={(node, index) => {
							setCurrentDir(dirname(node.path));
							setSelectedIndex(index);
						}}
					/>
				</Column>
				<Column active divider>
					<FileTree
						nodes={currentNodes}
						selectedIndex={clampedIndex}
						onSelect={(_node, index) => setSelectedIndex(index)}
					/>
				</Column>
				<Column divider>
					<FileTree
						nodes={childNodes}
						onSelect={(node) => {
							setCurrentDir(dirname(node.path));
							setSelectedIndex(0);
						}}
					/>
				</Column>
			</box>

			<StatusBar
				meta={meta}
				totalItems={currentNodes.length}
				currentIndex={clampedIndex}
			/>
			<Palette />
		</box>
	);
}

function StatusBar({
	meta,
	totalItems,
	currentIndex,
}: {
	meta: FileMeta | null;
	totalItems: number;
	currentIndex: number;
}) {
	const c = useTerminalColors();

	if (!meta) return <text fg={c[8]}>(no selection)</text>;

	const icon = iconFor({
		name: meta.name,
		path: meta.path,
		isDirectory: meta.isDirectory,
		size: meta.size,
		mode: meta.mode,
	});

	const currentPercent =
		currentIndex === 0
			? "TOP"
			: currentIndex === totalItems - 1
				? "BOT"
				: `${(((currentIndex + 1) / totalItems) * 100).toFixed(0)}%`;

	return (
		<box flexDirection="row" paddingLeft={1} paddingRight={1}>
			<box flexDirection="row" alignItems="center">
				<text fg={c[4]} flexShrink={0} selectable={false}>
					{BASE_ICONS.round_l}
				</text>
				<text fg={c[4]} bg={c[4]} flexShrink={0} selectable={false}>
					<span fg={c[5]}>{`${icon.glyph} `}</span>
					<span fg={meta.isDirectory ? c[15] : c[15]}>{meta.name}</span>
				</text>
				<text fg={c[4]} bg={c[15]} flexShrink={0} selectable={false}>
					{BASE_ICONS.round_r}
				</text>
				<text fg={c[5]} bg={c[15]} flexShrink={0} selectable={false}>
					{` ${formatSize(meta.size)}`}
				</text>
				<text fg={c[15]} flexShrink={0} selectable={false}>
					{BASE_ICONS.round_r}
				</text>
			</box>

			<box flexGrow={1} />

			<text fg={c[8]} wrapMode="none" selectable={false}>
				{meta.isSymlink ? " ↪ " : ""}
				{colorizeMode(meta.mode).map((seg) => (
					<span key={seg.key} fg={c[seg.color]}>
						{seg.char}
					</span>
				))}
				{" "}
			</text>

			<box flexDirection="row" alignItems="center">
				<text fg={c[15]} flexShrink={0} selectable={false}>
					{BASE_ICONS.round_l}
				</text>
				<text fg={c[5]} bg={c[15]} flexShrink={0} selectable={false}>
					<span fg={c[0]}>{`${currentPercent} `}</span>
				</text>
				<text fg={c[4]} bg={c[15]} flexShrink={0} selectable={false}>
					{BASE_ICONS.round_l}
				</text>
				<text fg={c[5]} bg={c[4]} flexShrink={0} selectable={false}>
					{`${currentIndex + 1} / ${totalItems}`}
				</text>
				<text fg={c[4]} flexShrink={0} selectable={false}>
					{BASE_ICONS.round_r}
				</text>
			</box>
		</box>
	);
}

const borderChars = {
	topLeft: "┬",
	topRight: "",
	bottomLeft: "┴",
	bottomRight: "",
	horizontal: "─",
	vertical: "│",
	topT: "",
	bottomT: "",
	leftT: "",
	rightT: "",
	cross: "",
};

function Column({
	children,
	divider,
	size,
}: {
	active?: boolean;
	divider?: boolean;
	size?: number;
	children?: React.ReactNode;
}) {
	const c = useTerminalColors();

	return (
		<box
			flexGrow={size ?? 1}
			flexBasis={1}
			flexDirection="column"
			border={divider ? ["left", "bottom", "top"] : ["bottom", "top"]}
			borderColor={c[8]}
			customBorderChars={borderChars}
		>
			{children}
		</box>
	);
}

const renderer = await createCliRenderer({
	exitOnCtrlC: true,
	screenMode: "alternate-screen",
	clearOnShutdown: false,
});
createRoot(renderer).render(<App />);

renderer.keyInput.on("keypress", (key) => {
	if (key.ctrl && key.name === "`") {
		renderer.console.toggle();
	}
});
