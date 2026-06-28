import type { ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useRef, useState } from "react";
import type { FileNode } from "./types";
import { colorizeMode, formatSize } from "./utils";
import { useTerminalColors } from "./hooks";
import { BASE_ICONS, iconFor } from "./icons";

const ICON_PREFIX = 2; // icon glyph (1 cell) + trailing space
const CAPS = 2; // left + right rounded caps

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
		el.on("resize", update);
		return () => {
			el.off("resize", update);
		};
	}, []);

	return (
		<scrollbox
			ref={scrollRef}
			flexDirection="column"
			height="100%"
			flexGrow={1}
			scrollbarOptions={{
				visible: false,
				width: 0,
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
					// Leading text before the color-coded mode (spacing + size).
					const metaPrefix = showMeta
						? `  ${node.isDirectory ? "" : `${formatSize(node.size)}  `}`
						: "";
					const meta = showMeta ? `${metaPrefix}${node.mode}` : "";
					const icon = iconFor(node, node.isDirectory && isSel);

					// The pill body fills exactly the column width minus the two caps,
					// so the rounded caps always sit flush against the edges.
					const innerW = Math.max(0, width - CAPS);
					const nameBudget = innerW - ICON_PREFIX - meta.length;
					const name =
						width > 0 ? truncateEnd(node.name, nameBudget) : node.name;
					const pad =
						width > 0
							? Math.max(0, innerW - ICON_PREFIX - name.length - meta.length)
							: 0;

					return (
						<box
							key={node.path}
							flexDirection="row"
							flexWrap="no-wrap"
							alignItems="center"
							onMouseDown={() => onSelect?.(node, i)}
						>
							{/* left rounded cap */}
							<text fg={c[4]} flexShrink={0}>
								{isSel ? BASE_ICONS.round_l : " "}
							</text>
							{/* pill body: icon + name + padding + meta, exactly innerW cells */}
							<box flexShrink={0} backgroundColor={isSel ? c[4] : undefined}>
								<text wrapMode="none" selectable={false}>
									<span fg={isSel ? c[0] : icon.color}>{`${icon.glyph} `}</span>
									<span fg={isSel ? c[0] : node.isDirectory ? c[6] : c[15]}>
										{name}
									</span>
									<span>{" ".repeat(pad)}</span>
									{showMeta && (
										<>
											<span fg={isSel ? c[0] : c[8]}>{metaPrefix}</span>
											{colorizeMode(node.mode).map((seg) => (
												<span key={seg.key} fg={isSel ? c[0] : c[seg.color]}>
													{seg.char}
												</span>
											))}
										</>
									)}
								</text>
							</box>
							{/* right rounded cap */}
							<text fg={c[4]} flexShrink={0}>
								{isSel ? BASE_ICONS.round_r : " "}
							</text>
						</box>
					);
				})
			)}
		</scrollbox>
	);
}
