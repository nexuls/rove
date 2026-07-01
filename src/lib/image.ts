import { deflateSync } from "node:zlib";
import { Jimp } from "jimp";
import type { TerminalCapabilities } from "@opentui/core";

// Raster formats Jimp can decode. Unlisted/unsupported types fall through to the
// binary placeholder in the preview pane.
const IMAGE_EXTENSIONS = new Set([
	"png",
	"jpg",
	"jpeg",
	"gif",
	"bmp",
	"tiff",
	"tif",
]);

export function isImage(name: string): boolean {
	const dot = name.lastIndexOf(".");
	if (dot <= 0) return false;
	return IMAGE_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}

// Decoded, already-downscaled RGBA pixels (4 bytes per pixel, row-major).
export interface DecodedImage {
	rgba: Uint8Array;
	width: number;
	height: number;
}

// Decode `path` and scale it to fit within `fit` (never upscaling), preserving
// aspect ratio. Returns null on any decode error so callers can show a
// placeholder. `fit` is in *pixels* for the GPU/terminal protocols and in
// half-block units for the cell fallback — the caller picks the right box.
export async function loadImage(
	path: string,
	fit: { width: number; height: number },
): Promise<DecodedImage | null> {
	try {
		const img = await Jimp.read(path);
		const { width: ow, height: oh } = img.bitmap;
		const scale = Math.min(fit.width / ow, fit.height / oh, 1);
		const w = Math.max(1, Math.round(ow * scale));
		const h = Math.max(1, Math.round(oh * scale));
		if (w !== ow || h !== oh) img.resize({ w, h });
		// Copy out of Jimp's buffer — the instance is about to be GC'd.
		return {
			rgba: new Uint8Array(img.bitmap.data),
			width: img.bitmap.width,
			height: img.bitmap.height,
		};
	} catch {
		return null;
	}
}

// Which rendering path the current terminal can handle, best first:
//  - "kitty":     true GPU image via the Kitty graphics protocol (high quality)
//  - "halfblock": truecolor ▀ half-block cells rendered by OpenTUI (fallback)
//  - "none":      neither — show a placeholder
//
// Sixel is intentionally excluded: it writes pixels straight into the grid, so
// OpenTUI's compositor erases it on the next frame. Honoring it would need
// per-frame re-emission (heavy flicker) or renderer-level passthrough support
// OpenTUI doesn't expose. Sixel terminals get the half-block fallback instead.
export type ImageProtocol = "kitty" | "halfblock" | "none";

export function pickProtocol(caps: TerminalCapabilities | null): ImageProtocol {
	if (caps?.kitty_graphics) return "kitty";
	// Default to the block fallback when truecolor is present or unknown.
	if (caps?.rgb ?? true) return "halfblock";
	return "none";
}

// ---------------------------------------------------------------------------
// Kitty graphics protocol
//
// Transmit and display are split into two steps so the display can be re-asserted
// cheaply every frame (see ImagePreview):
//   - kittyTransmit: send the raw RGBA (f=32), zlib-compressed (o=z), chunked into
//     4 KiB base64 payloads, stored under an image id (a=t) without displaying.
//   - kittyPut: create/replace a placement of that image (a=p) at the cursor,
//     without moving the cursor (C=1). Uses a fixed placement id (p=1) so
//     re-emitting it every frame replaces the placement in place rather than
//     stacking new ones. The caller positions the cursor over the pane first.
//
// Kitty draws the image above the cell background but below glyphs, so it shows
// through the pane's empty-space cells. Re-asserting the placement each frame
// makes it self-healing: any redraw/scroll that would otherwise clear it (e.g.
// the larger repaint when switching between two images) is immediately undone.
// ---------------------------------------------------------------------------

let nextKittyId = 1;

export interface KittyImage {
	id: number;
	sequence: string;
}

// Transmit (but don't display) an image, returning its id and the escape bytes.
export function kittyTransmit(img: DecodedImage): KittyImage {
	const id = nextKittyId++;
	const compressed = deflateSync(Buffer.from(img.rgba));
	const b64 = compressed.toString("base64");

	const CHUNK = 4096;
	const parts: string[] = [];
	for (let i = 0; i < b64.length; i += CHUNK) {
		const chunk = b64.slice(i, i + CHUNK);
		const first = i === 0;
		const last = i + CHUNK >= b64.length;
		const control = first
			? `a=t,f=32,o=z,i=${id},s=${img.width},v=${img.height},q=2,m=${last ? 0 : 1}`
			: `m=${last ? 0 : 1}`;
		parts.push(`\x1b_G${control};${chunk}\x1b\\`);
	}
	// An empty image (no data) still needs a terminator-free no-op; guard anyway.
	if (parts.length === 0) return { id, sequence: "" };
	return { id, sequence: parts.join("") };
}

// Create/replace the on-screen placement of a transmitted image at the cursor.
// Cheap (no pixel data) so it can be re-emitted every frame.
export function kittyPut(id: number): string {
	return `\x1b_Ga=p,i=${id},p=1,C=1,q=2\x1b\\`;
}

// Delete a previously transmitted image (and free its data) by id.
export function kittyDelete(id: number): string {
	return `\x1b_Ga=d,d=I,i=${id},q=2\x1b\\`;
}
