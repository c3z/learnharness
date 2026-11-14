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

export interface FigurePdfLayout {
	/** Page size in pt: the figure's natural size. */
	page: { w: number; h: number };
	orientation: "landscape" | "portrait";
	/** Canvas size in px: 3x oversampled, longer side capped at 4096. */
	bitmap: { w: number; h: number };
}

/** The page and bitmap for a figure of natural size `size` (css px, from
 *  `chartSize`). A degenerate side (0, negative, NaN) counts as 1 px, so
 *  nothing downstream sees a zero or NaN. Pure. */
export function figurePdfLayout(size: { w: number; h: number }): FigurePdfLayout {
	const w = Number.isFinite(size.w) && size.w >= 1 ? size.w : 1;
	const h = Number.isFinite(size.h) && size.h >= 1 ? size.h : 1;
	const scale = Math.min(OVERSAMPLE, MAX_BITMAP_SIDE / Math.max(w, h));
	return {
		page: { w: w * PT_PER_PX, h: h * PT_PER_PX },
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

/** Rasterize the figure svg (natural size `size`) and download it as
 *  `figure.pdf`. Browser only; rejects on any failure (the caller shows it). */
export async function downloadFigurePdf(svg: string, size: { w: number; h: number }): Promise<void> {
	const layout = figurePdfLayout(size);
	const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgImageSource(svg))}`);

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
