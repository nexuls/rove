import type { FileNode } from "./types";
import { formatSize } from "./utils";

export function FileTree({
	nodes,
	selectedIndex,
	showMeta = true,
	onSelect,
}: {
	nodes: FileNode[];
	selectedIndex?: number;
	showMeta?: boolean;
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
						<box
							key={node.path}
							flexDirection="row"
							flexWrap="no-wrap"
							alignItems="center"
							justifyContent="space-between"
							paddingLeft={1}
							paddingRight={1}
							backgroundColor={isSel ? "cyan" : undefined}
							onMouseDown={() => onSelect?.(node, i)}
						>
							<text
								key={node.path}
								fg={isSel ? "black" : node.isDirectory ? "cyan" : "white"}
								truncate
								wrapMode="none"
								selectable={false}
							>
								{node.isDirectory ? "📁" : "📄"} {node.name}
							</text>
							{showMeta && (
								<text fg={isSel ? "black" : "gray"} wrapMode="none" truncate>
									{"  "}
									{node.isDirectory ? "" : `${formatSize(node.size)}  `}
									{node.mode}
								</text>
							)}
						</box>
					);
				})
			)}
		</scrollbox>
	);
}
