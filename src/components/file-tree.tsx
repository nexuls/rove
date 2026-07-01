import type { BoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import type { FileNode } from "../lib/types";
import { colorizeMode, formatSize } from "../lib/utils";
import { useTerminalColors } from "../lib/hooks";
import { BASE_ICONS, iconFor } from "../lib/icons";

const ICON_PREFIX = 2; // icon glyph (1 cell) + trailing space
const CAPS = 2; // left + right rounded caps
const SCROLL_MARGIN = 3; // rows kept visible above/below the selection

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

// Smallest scroll offset adjustment that keeps `index` inside the viewport with
// `margin` rows of context above/below it, starting from the current `prev`.
function marginOffset(
	prev: number,
	index: number,
	viewport: number,
	total: number,
	margin: number,
): number {
	let next = prev;
	if (index - margin < next) next = index - margin;
	if (index + margin > next + viewport - 1)
		next = index + margin - viewport + 1;
	return clamp(next, 0, Math.max(0, total - viewport));
}

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
	active = false,
	showMeta = true,
	scrollMargin = SCROLL_MARGIN,
	onSelect,
	onNavigate,
	onEnter,
	onBack,
}: {
	nodes: FileNode[];
	selectedIndex?: number;
	/** When true this tree owns keyboard + scroll-wheel navigation. */
	active?: boolean;
	showMeta?: boolean;
	scrollMargin?: number;
	/** Mouse click on a row. */
	onSelect?: (node: FileNode, index: number) => void;
	/** Selection moved via arrow keys or the scroll wheel (active only). */
	onNavigate?: (index: number) => void;
	/** right / l / return on the selection (active only). */
	onEnter?: (node: FileNode) => void;
	/** left / h (active only). */
	onBack?: () => void;
}) {
	const c = useTerminalColors();

	const boxRef = useRef<BoxRenderable>(null);
	const [size, setSize] = useState({ width: 0, height: 0 });
	// Index of the first row rendered inside the viewport.
	const [scrollOffset, setScrollOffset] = useState(0);

	const sel = selectedIndex ?? 0;

	// Track the box dimensions so we know the column width (for the pills) and
	// the number of rows that fit (for manual scrolling).
	useEffect(() => {
		const el = boxRef.current;
		if (!el) return;
		const update = () => setSize({ width: el.width, height: el.height });
		update();
		el.on("resize", update);
		return () => {
			el.off("resize", update);
		};
	}, []);

	// Catch up the viewport only when the selection is off-screen — parent-directory
	// navigation or index clamping on a directory change. If the selection is
	// already visible (as it always is right after a wheel scroll), leave the
	// offset alone so the viewport never snaps the row back to the margin.
	useEffect(() => {
		const viewport = size.height;
		if (!active || viewport <= 0) return;
		setScrollOffset((prev) => {
			const maxOffset = Math.max(0, nodes.length - viewport);
			if (sel >= prev && sel <= prev + viewport - 1) {
				return clamp(prev, 0, maxOffset);
			}
			return marginOffset(prev, sel, viewport, nodes.length, scrollMargin);
		});
	}, [active, sel, size.height, nodes.length, scrollMargin]);

	// Arrow-key navigation: move the selection and scroll the viewport together in
	// one batched render (with margin), so keyboard movement keeps its context.
	function select(target: number) {
		const viewport = size.height;
		if (viewport > 0) {
			setScrollOffset((prev) =>
				marginOffset(prev, target, viewport, nodes.length, scrollMargin),
			);
		}
		onNavigate?.(target);
	}

	useKeyboard((key) => {
		if (!active) return;
		switch (key.name) {
			case "up":
			case "k":
				select(Math.max(0, Math.min(sel, nodes.length - 1) - 1));
				break;
			case "down":
			case "j":
				select(Math.min(nodes.length - 1, sel + 1));
				break;
			case "left":
			case "h":
				onBack?.();
				break;
			case "right":
			case "l":
			case "return": {
				const node = nodes[sel];
				if (node) onEnter?.(node);
				break;
			}
		}
	});

	const { width, height } = size;
	// Before the first measure, render everything; the resize handler culls to the
	// viewport on the next frame.
	const base = height > 0 ? scrollOffset : 0;
	const visible = height > 0 ? nodes.slice(base, base + height) : nodes;

	return (
		<box
			ref={boxRef}
			flexDirection="column"
			height="100%"
			flexGrow={1}
			onMouseScroll={(event) => {
				if (!active) return;
				const dir = event.scroll?.direction;
				if (dir !== "up" && dir !== "down") return;

				const viewport = size.height;
				const delta = dir === "down" ? 1 : -1;
				// When everything fits, the wheel just moves the selection.
				if (viewport <= 0 || nodes.length <= viewport) {
					onNavigate?.(clamp(sel + delta, 0, nodes.length - 1));
					return;
				}

				const maxOffset = nodes.length - viewport;
				const next = clamp(scrollOffset + delta, 0, maxOffset);
				// Already at the end: nothing to scroll, so let the selection walk
				// toward that edge (this is how the very first/last rows get reached).
				if (next === scrollOffset) {
					onNavigate?.(clamp(sel + delta, 0, nodes.length - 1));
					return;
				}

				// Normal scroll: move the viewport by one row and leave the selection
				// where it is, unless it would fall outside the viewport entirely —
				// then pin it to the edge row (no margin, so the edge item can stay
				// selected instead of snapping inward).
				const newSel = clamp(sel, next, next + viewport - 1);

				// Offset + selection update together in one batched render so the
				// row never flashes out of the viewport.
				setScrollOffset(next);
				if (newSel !== sel) onNavigate?.(newSel);
			}}
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
				visible.map((node, idx) => {
					const i = base + idx;
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
							flexShrink={0}
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
		</box>
	);
}
