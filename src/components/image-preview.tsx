import {
	type BoxRenderable,
	CliRenderEvents,
	type OptimizedBuffer,
	Renderable,
	type RenderableOptions,
	type RenderContext,
	RGBA,
} from "@opentui/core";
import { extend, useRenderer } from "@opentui/react";
import { createElement, useEffect, useRef, useState } from "react";
import { useTerminalColors } from "../lib/hooks";
import { iconFor } from "../lib/icons";
import {
	type DecodedImage,
	kittyDelete,
	kittyPut,
	kittyTransmit,
	loadImage,
	pickProtocol,
} from "../lib/image";
import type { FileNode } from "../lib/types";

// ---------------------------------------------------------------------------
// Half-block fallback renderable (Option A)
//
// Renders the image into normal terminal cells using the upper-half-block glyph
// "▀": the foreground color is the top pixel, the background the bottom pixel,
// so each cell shows two stacked pixels. Works on any truecolor terminal and is
// drawn by OpenTUI itself, so it composites cleanly with the rest of the UI.
// The image is expected to be pre-scaled to (cols) x (rows*2) pixels.
// ---------------------------------------------------------------------------
class HalfBlockImageRenderable extends Renderable {
	private _image: DecodedImage | null;

	constructor(
		ctx: RenderContext,
		options: RenderableOptions & { image?: DecodedImage | null },
	) {
		super(ctx, options);
		this._image = options.image ?? null;
	}

	set image(value: DecodedImage | null) {
		this._image = value;
		this.requestRender();
	}

	protected override renderSelf(buffer: OptimizedBuffer): void {
		const img = this._image;
		if (!img) return;

		const cellRows = Math.ceil(img.height / 2);
		const offsetX =
			this.x + Math.max(0, Math.floor((this.width - img.width) / 2));
		const offsetY =
			this.y + Math.max(0, Math.floor((this.height - cellRows) / 2));

		for (let cy = 0; cy < cellRows; cy++) {
			const topY = cy * 2;
			const botY = Math.min(topY + 1, img.height - 1);
			for (let cx = 0; cx < img.width; cx++) {
				const top = (topY * img.width + cx) * 4;
				const bot = (botY * img.width + cx) * 4;
				const fg = RGBA.fromInts(
					img.rgba[top] ?? 0,
					img.rgba[top + 1] ?? 0,
					img.rgba[top + 2] ?? 0,
					255,
				);
				const bg = RGBA.fromInts(
					img.rgba[bot] ?? 0,
					img.rgba[bot + 1] ?? 0,
					img.rgba[bot + 2] ?? 0,
					255,
				);
				buffer.setCell(offsetX + cx, offsetY + cy, "▀", fg, bg);
			}
		}
	}
}

extend({ halfBlockImage: HalfBlockImageRenderable });

function HalfBlockImage({ image }: { image: DecodedImage }) {
	// Custom intrinsic registered via extend(); cast past the JSX typing.
	return createElement("halfBlockImage" as never, {
		image,
		flexGrow: 1,
		height: "100%",
	});
}

// Approximate pixel size of one terminal cell, from the terminal's reported
// pixel resolution. Falls back to a typical 8x16 cell when unknown.
function cellPixels(renderer: ReturnType<typeof useRenderer>): {
	w: number;
	h: number;
} {
	const res = renderer.resolution;
	const cols = renderer.width;
	const rows = renderer.height;
	if (res && cols > 0 && rows > 0) {
		return {
			w: Math.max(1, Math.floor(res.width / cols)),
			h: Math.max(1, Math.floor(res.height / rows)),
		};
	}
	return { w: 8, h: 16 };
}

type Cells = { cols: number; rows: number };

// OpenTUI writes every frame through its own serialized output path
// (renderer.writeOut → native lib.writeOut). Writing kitty escapes via
// process.stdout instead races that path at the byte level and the sequence
// can arrive interleaved/corrupt — the image then intermittently fails to
// show. Route our escapes through the same path so they can't interleave.
// `writeOut` is internal (not in the public typings) but is the method the
// renderer uses for all of its own output.
type RawWriter = { writeOut(chunk: string): void };

function writeRaw(renderer: ReturnType<typeof useRenderer>, seq: string): void {
	(renderer as unknown as RawWriter).writeOut(seq);
}

export function ImagePreview({ node }: { node: FileNode }) {
	const renderer = useRenderer();
	const containerRef = useRef<BoxRenderable>(null);
	const [cells, setCells] = useState<Cells | null>(null);
	const [image, setImage] = useState<DecodedImage | null>(null);
	const [failed, setFailed] = useState(false);

	const protocol = pickProtocol(renderer.capabilities);

	// Measure the preview pane (in cells) once layout settles, and keep it in
	// sync with resizes. Layout isn't known until OpenTUI runs its frame, so we
	// sample on the FRAME event rather than in a layout-effect.
	useEffect(() => {
		const onFrame = () => {
			const box = containerRef.current;
			if (!box || box.width <= 0 || box.height <= 0) return;
			setCells((prev) =>
				prev && prev.cols === box.width && prev.rows === box.height
					? prev
					: { cols: box.width, rows: box.height },
			);
		};
		renderer.on(CliRenderEvents.FRAME, onFrame);
		return () => {
			renderer.off(CliRenderEvents.FRAME, onFrame);
		};
	}, [renderer]);

	// Decode + downscale to fit the pane. Kitty wants real pixels; the half-block
	// fallback wants (cols) x (rows*2) pixels.
	useEffect(() => {
		if (!cells || protocol === "none") return;
		let cancelled = false;
		setFailed(false);

		const fit =
			protocol === "kitty"
				? (() => {
						const px = cellPixels(renderer);
						return { width: cells.cols * px.w, height: cells.rows * px.h };
					})()
				: { width: cells.cols, height: cells.rows * 2 };

		loadImage(node.path, fit).then((img) => {
			if (cancelled) return;
			setImage(img);
			setFailed(img === null);
		});

		return () => {
			cancelled = true;
		};
	}, [node.path, cells, protocol, renderer]);

	// Kitty path: transmit the pixels once, display the placement immediately, and
	// keep the placement in sync as the pane moves. Cleanup deletes the image so
	// it doesn't linger when switching files or unmounting.
	useEffect(() => {
		if (protocol !== "kitty" || !image) return;
		const { id, sequence } = kittyTransmit(image);
		writeRaw(renderer, sequence);

		const place = () => {
			const box = containerRef.current;
			if (!box || box.width <= 0 || box.height <= 0) return;
			// Save cursor, jump to the pane's top-left (1-based), place, restore.
			writeRaw(
				renderer,
				`\x1b7\x1b[${box.y + 1};${box.x + 1}H${kittyPut(id)}\x1b8`,
			);
		};

		// Display it now — layout has already settled (the pane was measured before
		// we got here), so the geometry is valid. We must NOT rely on a FRAME event
		// to show it: OpenTUI renders on demand and stays idle once the pane
		// settles, so a frame often never arrives and the image would never appear.
		// Redrawn cells don't erase kitty images, so one placement keeps it visible;
		// the FRAME listener only re-places when the pane moves (scroll/resize),
		// which do trigger renders.
		place();
		renderer.on(CliRenderEvents.FRAME, place);
		return () => {
			renderer.off(CliRenderEvents.FRAME, place);
			writeRaw(renderer, kittyDelete(id));
		};
	}, [protocol, image, renderer]);

	const c = useTerminalColors();
	const icon = iconFor(node);

	return (
		<box
			ref={containerRef}
			height="100%"
			flexGrow={1}
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
		>
			{protocol === "none" || failed ? (
				<>
					<text fg={c[15]} selectable={false}>
						<span fg={icon.color}>{`${icon.glyph} `}</span>
						{node.name}
					</text>
					<text fg={c[8]} selectable={false}>
						{protocol === "none"
							? "Terminal can't display images"
							: "Unable to decode image"}
					</text>
				</>
			) : protocol === "halfblock" && image ? (
				<HalfBlockImage image={image} />
			) : null}
		</box>
	);
}
