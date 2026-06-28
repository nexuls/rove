import type { FileNode } from "./types";

export function FileTree({
	nodes,
	selectedIndex,
	onSelect,
}: {
	nodes: FileNode[];
	selectedIndex?: number;
	onSelect?: (node: FileNode, index: number) => void;
}) {
	return (
		<scrollbox
			flexDirection="row"
			height="100%"
			flexGrow={1}
			scrollbarOptions={{
				visible: false,
			}}
			viewportCulling
		>
			{nodes.length === 0 ? (
				<box
					height="100%"
					flexGrow={1}
					flexDirection="column"
					alignItems="center"
					justifyContent="center"
				>
					<text fg="gray">(empty)</text>
				</box>
			) : (
				nodes.map((node, i) => {
					const isSel = i === selectedIndex;
					return (
						<text
							key={node.path}
							fg={isSel ? "black" : node.isDirectory ? "cyan" : "white"}
							bg={isSel ? "cyan" : undefined}
							truncate
							wrapMode="none"
							selectable={false}
							onMouseDown={() => onSelect?.(node, i)}
						>
							{node.isDirectory ? "📁" : "📄"} {node.name}
						</text>
					);
				})
			)}
		</scrollbox>
	);
}
