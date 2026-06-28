import { createRoot, useKeyboard } from "@opentui/react";
import { createCliRenderer } from "@opentui/core";
import { useMemo, useState } from "react";
import { dirname } from "node:path";
import { FileTree } from "./file-tree";
import type { FileMeta } from "./types";
import { useTerminalColors } from "./hooks";
import { formatSize, indexOfChild, readDir, statFile } from "./utils";
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

			<StatusBar meta={meta} />
			<Palette />
		</box>
	);
}

function StatusBar({ meta }: { meta: FileMeta | null }) {
	const c = useTerminalColors();

	return (
		<box flexDirection="row" paddingLeft={1} paddingRight={1}>
			{meta ? (
				<text fg={c[8]} wrapMode="none">
					<span fg={meta.isDirectory ? c[6] : c[15]}>{meta.name}</span>
					{"  "}
					{meta.isDirectory ? "dir" : "file"}
					{meta.isSymlink ? " ↪" : ""}
					{"  "}
					{meta.mode}
					{"  "}
					{formatSize(meta.size)}
					{"  modified "}
					{meta.modified.toLocaleString()}
				</text>
			) : (
				<text fg={c[8]}>(no selection)</text>
			)}
		</box>
	);
}

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
			paddingLeft={1}
			paddingRight={1}
			border={divider ? ["left", "bottom"] : ["bottom"]}
			borderColor={c[8]}
		>
			{children}
		</box>
	);
}

const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);

renderer.keyInput.on("keypress", (key) => {
	if (key.ctrl && key.name === "`") {
		renderer.console.toggle();
	}
});
