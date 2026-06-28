import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard } from "@opentui/react";
import { FileTree } from "./file-tree";
import { useMemo, useState } from "react";
import type { FileNode } from "./types";
import { dirname } from "node:path";
import { indexOfChild, readDir } from "./utils";

function App() {
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
    <box height="100%" flexGrow={1} flexDirection="row">
      <Column active>
        <FileTree nodes={parentNodes} selectedIndex={parentSelectedIndex} />
      </Column>
      <Column active>
        <FileTree nodes={currentNodes} selectedIndex={clampedIndex} />
      </Column>
      <Column>
        <FileTree nodes={childNodes} />
      </Column>
    </box>
  );
}

function Column({
  children,
}: {
  active?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <box
      flexGrow={1}
      flexBasis={0}
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
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
