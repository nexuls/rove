import type { ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useRef, useState } from "react";
import type { FileNode } from "./types";
import { formatSize } from "./utils";
import { useTerminalColors } from "./hooks";

// Width budget consumed before the file name on each row.
const ROW_PADDING = 2; // box paddingLeft + paddingRight
const NAME_PREFIX = 3; // emoji (2 cells) + trailing space

// Truncate at the end with an ellipsis, e.g. "very-long-na…".
function truncateEnd(text: string, max: number): string {
	if (max <= 0) return "";
	if (text.length <= max) return text;
	if (max === 1) return "…";
	return `${text.slice(0, max - 1)}…`;
}

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
	const c = useTerminalColors();

	const scrollRef = useRef<ScrollBoxRenderable>(null);
	const [width, setWidth] = useState(0);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const update = () => setWidth(el.width);
		update();
		el.on("resized", update);
		return () => {
			el.off("resized", update);
		};
	}, []);

	return (
		<scrollbox
			ref={scrollRef}
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
					const meta = showMeta
						? `  ${node.isDirectory ? "" : `${formatSize(node.size)}  `}${node.mode}`
						: "";
					const nameBudget =
						width - ROW_PADDING - NAME_PREFIX - meta.length;
					const name =
						width > 0 ? truncateEnd(node.name, nameBudget) : node.name;
					return (
						<box
							key={node.path}
							flexDirection="row"
							flexWrap="no-wrap"
							alignItems="center"
							justifyContent="space-between"
							paddingLeft={1}
							paddingRight={1}
							backgroundColor={isSel ? c[4] : undefined}
							onMouseDown={() => onSelect?.(node, i)}
						>
							<text
								key={node.path}
								fg={isSel ? c[0] : node.isDirectory ? c[6] : c[15]}
								wrapMode="none"
								selectable={false}
							>
								{node.isDirectory ? "📁" : "📄"} {name}
							</text>
							{showMeta && (
								<text
									fg={isSel ? c[0] : c[8]}
									wrapMode="none"
									flexShrink={0}
								>
									{meta}
								</text>
							)}
						</box>
					);
				})
			)}
		</scrollbox>
	);
}
