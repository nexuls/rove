import { createRoot } from "@opentui/react";
import { createCliRenderer } from "@opentui/core";
import { useMemo, useState } from "react";
import { dirname } from "node:path";
import { FileTree } from "./components/file-tree";
import { registerGrammars } from "./grammars";
import { useTerminalColors } from "./lib/hooks";
import { indexOfChild, readDir, statFile } from "./lib/utils";
import { Palette } from "./components/palette";
import { Preview } from "./components/preview";
import { Shortcuts } from "./components/shortcuts";
import { StatusBar } from "./components/statusbar";
import { useSettings } from "./lib/use-settings";

function App({ rootDir }: { rootDir: string }) {
	const c = useTerminalColors();
	const { settings } = useSettings();

	const [currentDir, setCurrentDir] = useState(rootDir);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const parentDir = useMemo(() => dirname(currentDir), [currentDir]);
	const isAtRoot = parentDir === currentDir;

	const readOptions = useMemo(
		() => ({
			showHidden: settings.showHidden,
			respectGitignore: settings.respectGitignore,
			sortDirsFirst: settings.sortDirsFirst,
		}),
		[settings.showHidden, settings.respectGitignore, settings.sortDirsFirst],
	);

	const parentNodes = useMemo(
		() => (isAtRoot ? [] : readDir(parentDir, readOptions)),
		[parentDir, isAtRoot, readOptions],
	);
	const currentNodes = useMemo(
		() => readDir(currentDir, readOptions),
		[currentDir, readOptions],
	);

	const clampedIndex = Math.min(
		selectedIndex,
		Math.max(0, currentNodes.length - 1),
	);
	const selected = currentNodes[clampedIndex];

	const childNodes = useMemo(
		() => (selected?.isDirectory ? readDir(selected.path, readOptions) : []),
		[selected, readOptions],
	);

	const meta = useMemo(
		() => (selected ? statFile(selected.path) : null),
		[selected],
	);

	const parentSelectedIndex = useMemo(
		() => indexOfChild(parentNodes, currentDir),
		[parentNodes, currentDir],
	);

	function goToParent() {
		if (isAtRoot) return;
		const idx = indexOfChild(parentNodes, currentDir);
		setCurrentDir(parentDir);
		setSelectedIndex(idx);
	}

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
						active
						nodes={currentNodes}
						selectedIndex={clampedIndex}
						showMeta={settings.showMeta}
						onSelect={(_node, index) => setSelectedIndex(index)}
						onNavigate={setSelectedIndex}
						onEnter={(node) => {
							if (node.isDirectory) {
								setCurrentDir(node.path);
								setSelectedIndex(0);
							}
						}}
						onBack={goToParent}
					/>
				</Column>
				<Column divider>
					{settings.showPreview && selected && !selected.isDirectory ? (
						<Preview node={selected} />
					) : (
						<FileTree
							nodes={childNodes}
							showMeta={settings.showMeta}
							onSelect={(node) => {
								setCurrentDir(dirname(node.path));
								setSelectedIndex(0);
							}}
						/>
					)}
				</Column>
			</box>

			<StatusBar
				meta={meta}
				totalItems={currentNodes.length}
				currentIndex={clampedIndex}
			/>
			<Palette />
			<Shortcuts settings={settings} />
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
			height="100%"
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

// Boot the TUI in `rootDir`. Registers the bundled tree-sitter grammars before
// the renderer spins up its TreeSitterClient (so file previews can highlight
// them), then mounts the React tree.
export async function start(rootDir: string): Promise<void> {
	registerGrammars();

	const renderer = await createCliRenderer({
		exitOnCtrlC: true,
		screenMode: "alternate-screen",
		clearOnShutdown: false,
	});
	createRoot(renderer).render(<App rootDir={rootDir} />);

	renderer.keyInput.on("keypress", (key) => {
		if (key.ctrl && key.name === "`") {
			renderer.console.toggle();
		}
	});
}

if (import.meta.main) {
	const rootDir = process.argv[2] ?? process.cwd();
	await start(rootDir);
}
