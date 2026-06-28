import type { ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useRef, useState } from "react";
import type { FileNode } from "./types";
import { formatSize } from "./utils";
import { useTerminalColors } from "./hooks";
import { iconFor } from "./icons";

// Width budget consumed before the file name on each row.
const ROW_PADDING = 0; // box paddingLeft + paddingRight
// left cap (1) + icon (1) + space (1) + name's trailing space (1) + right cap (1)
const NAME_PREFIX = 5;

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
					const nameBudget = width - ROW_PADDING - NAME_PREFIX - meta.length;
					const name =
						width > 0 ? truncateEnd(node.name, nameBudget) : node.name;
					const icon = iconFor(node, node.isDirectory && isSel);
					return (
						<box
							key={node.path}
							flexDirection="row"
							flexWrap="no-wrap"
							onMouseDown={() => onSelect?.(node, i)}
						>
							<text fg={c[4]}>{isSel ? "" : " "}</text>
							<box
								flexDirection="row"
								flexGrow={1}
								flexWrap="no-wrap"
								alignItems="center"
								justifyContent="space-between"
								backgroundColor={isSel ? c[4] : undefined}
							>
								<text key={node.path} wrapMode="none" selectable={false}>
									<span fg={isSel ? c[0] : icon.color}>{`${icon.glyph} `}</span>
									<span fg={isSel ? c[0] : node.isDirectory ? c[6] : c[15]}>
										{`${name} `}
									</span>
								</text>
								{showMeta && (
									<text fg={isSel ? c[0] : c[8]} wrapMode="none" flexShrink={0}>
										{meta}
									</text>
								)}
							</box>
							<text fg={c[4]} flexShrink={0}>
								{isSel ? "" : " "}
							</text>
						</box>
					);
				})
			)}
		</scrollbox>
	);
}
