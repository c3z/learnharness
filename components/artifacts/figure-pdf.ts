/**
 * Figure PDF export (2026-11-14): the fullscreen figure popup saves the
 * figure as `figure.pdf`, for print and for sending on.
 *
 * WHY RASTER: the vector path (svg2pdf) has to embed a Unicode font for
 * Polish (and any non-Latin-1) text, and it does not draw `foreignObject`.
 * A figure is an agent-written svg that may use both. So the svg goes
 * through the same display boundary as the card (`svgImageSource`) into an
 * `<img>`, is drawn on a white `<canvas>` at 3x oversampling, and that
 * bitmap fills one PDF page of the figure's natural size. Original colors:
 * the popup's invert is display only, like the SVG download.
 *
 * `jspdf` loads on click (dynamic import), outside the main bundle.
 */

import { svgImageSource } from "@/lib/svg-image-source";
import { downloadFile } from "@/components/artifacts/download";

/** 1 css px = 0.75 pt (96 dpi vs 72 dpi). */
const PT_PER_PX = 0.75;
const OVERSAMPLE = 3;
const MAX_BITMAP_SIDE = 4096;
/** jsPDF's page limit (PDF user units, 14400 pt per side). */
const MAX_PAGE_SIDE_PT = 14400;

export interface FigurePdfLayout {
	/** Page size in pt: the figure's natural size, scaled down (same aspect)
	 *  when its longer side passes 14400 pt. */
	page: { w: number; h: number };
	orientation: "landscape" | "portrait";
	/** Canvas size in px: 3x oversampled, longer side capped at 4096. */
	bitmap: { w: number; h: number };
}

/** The size the popup shows a figure at, in css px: the box width
 *  (`chartSize`) with the loaded image's aspect, because the popup draws the
 *  `<img>` at the box width with `h-auto`. Only the aspect of the natural size
 *  is used: Chrome gives a viewBox-only svg its aspect at a default height
 *  (viewBox 800x600 loads as 200x150). A natural side that is 0 or not finite
 *  falls back to the box. Pure. */
export function figureDisplaySize(box: { w: number; h: number }, natural: { w: number; h: number }): { w: number; h: number } {
	const ok = (n: number) => Number.isFinite(n) && n > 0;
	if (!ok(natural.w) || !ok(natural.h) || !ok(box.w)) return box;
	return { w: box.w, h: (box.w * natural.h) / natural.w };
}

/** The page and bitmap for a figure shown at `size` (css px, from
 *  `figureDisplaySize`). A degenerate side (0, negative, NaN) counts as 1 px, so
 *  nothing downstream sees a zero or NaN. Pure. */
export function figurePdfLayout(size: { w: number; h: number }): FigurePdfLayout {
	const w = Number.isFinite(size.w) && size.w >= 1 ? size.w : 1;
	const h = Number.isFinite(size.h) && size.h >= 1 ? size.h : 1;
	const scale = Math.min(OVERSAMPLE, MAX_BITMAP_SIDE / Math.max(w, h));
	const pageScale = Math.min(PT_PER_PX, MAX_PAGE_SIDE_PT / Math.max(w, h));
	return {
		page: { w: w * pageScale, h: h * pageScale },
		orientation: w > h ? "landscape" : "portrait",
		bitmap: {
			w: Math.max(1, Math.min(MAX_BITMAP_SIDE, Math.round(w * scale))),
			h: Math.max(1, Math.min(MAX_BITMAP_SIDE, Math.round(h * scale))),
		},
	};
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("figure svg failed to load as an image"));
		img.src = src;
	});
}

/** Rasterize the figure svg and download it as `figure.pdf`. `box` is the
 *  popup's box (`chartSize`); the page takes its aspect from the loaded
 *  image, like the popup does. Browser only; rejects on any failure (the
 *  caller shows it). */
export async function downloadFigurePdf(svg: string, box: { w: number; h: number }): Promise<void> {
	const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgImageSource(svg))}`);
	const layout = figurePdfLayout(figureDisplaySize(box, { w: img.naturalWidth, h: img.naturalHeight }));

	const canvas = document.createElement("canvas");
	canvas.width = layout.bitmap.w;
	canvas.height = layout.bitmap.h;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("canvas 2d context unavailable");
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

	const { jsPDF } = await import("jspdf");
	const pdf = new jsPDF({ unit: "pt", format: [layout.page.w, layout.page.h], orientation: layout.orientation });
	pdf.addImage(canvas, "PNG", 0, 0, layout.page.w, layout.page.h, "figure", "FAST");
	downloadFile("figure.pdf", new Uint8Array(pdf.output("arraybuffer")), "application/pdf");
}
