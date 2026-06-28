import { createRoot, useKeyboard } from "@opentui/react";
import { createCliRenderer } from "@opentui/core";
import { useMemo, useState } from "react";
import { dirname } from "node:path";
import { FileTree } from "./file-tree";
import { useTerminalColors } from "./hooks";
import { indexOfChild, readDir, statFile } from "./utils";
import { Palette } from "./palette";
import { StatusBar } from "./statusbar";

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
