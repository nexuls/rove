import type { FileNode } from "./types";

export function FileTree({
  nodes,
  selectedIndex,
}: {
  nodes: FileNode[];
  selectedIndex?: number;
}) {
  return (
    <box flexDirection="column" height="100%" flexGrow={1}>
      {nodes.length === 0 ? (
        <text fg="gray">(empty)</text>
      ) : (
        nodes.map((node, i) => {
          const isSel = i === selectedIndex;
          return (
            <text
              key={node.path}
              fg={isSel ? "black" : node.isDirectory ? "cyan" : "white"}
              bg={isSel ? "cyan" : undefined}
            >
              {node.isDirectory ? "📁" : "📄"} {node.name}
            </text>
          );
        })
      )}
    </box>
  );
}
