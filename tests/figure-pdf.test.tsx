/**
 * Figure PDF export (2026-11-14): the fullscreen figure popup saves the
 * figure as a raster PDF. Two seams: the pure page/bitmap layout, and the
 * popup header button (figure mode only). The browser rasterization path
 * needs a real canvas and runs on click only; it is not covered here.
 * tsx note: classic JSX transform - the React global shim below provides React.
 */

import React from "react";
(globalThis as Record<string, unknown>).React = React;

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup as renderMarkup } from "react-dom/server";
import { InteractionLayersProvider } from "../components/interaction-layers.tsx";
import { MermaidOverlay } from "../components/session-overlay.tsx";
import { figurePdfLayout } from "../components/artifacts/figure-pdf.ts";

const renderToStaticMarkup = (node: React.ReactNode) => renderMarkup(<InteractionLayersProvider>{node}</InteractionLayersProvider>);

const FIGURE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><text x="10" y="20">Zażółć gęślą jaźń</text></svg>';

describe("figure pdf - layout", () => {
	it("800x600 px gives a 600x450 pt landscape page and a 2400x1800 bitmap", () => {
		assert.deepEqual(figurePdfLayout({ w: 800, h: 600 }), {
			page: { w: 600, h: 450 },
			orientation: "landscape",
			bitmap: { w: 2400, h: 1800 },
		});
	});

	it("caps the longer bitmap side at 4096 px and keeps the aspect", () => {
		const { page, orientation, bitmap } = figurePdfLayout({ w: 3000, h: 1000 });
		assert.deepEqual(page, { w: 2250, h: 750 });
		assert.equal(orientation, "landscape");
		assert.equal(bitmap.w, 4096);
		assert.equal(bitmap.h, 1365);
	});

	it("a taller-than-wide figure is portrait", () => {
		const layout = figurePdfLayout({ w: 300, h: 500 });
		assert.equal(layout.orientation, "portrait");
		assert.deepEqual(layout.page, { w: 225, h: 375 });
		assert.deepEqual(layout.bitmap, { w: 900, h: 1500 });
	});

	it("a degenerate size gives no zero and no NaN", () => {
		for (const size of [{ w: 0, h: 0 }, { w: -5, h: 10 }, { w: Number.NaN, h: 0 }]) {
			const { page, bitmap } = figurePdfLayout(size);
			for (const n of [page.w, page.h, bitmap.w, bitmap.h]) {
				assert.ok(Number.isFinite(n) && n > 0, `${JSON.stringify(size)} -> ${n}`);
			}
			assert.ok(bitmap.w >= 1 && bitmap.h >= 1);
		}
	});
});

describe("figure pdf - popup button", () => {
	it("figure mode (svg) shows the PDF button left of the close X", () => {
		const html = renderToStaticMarkup(<MermaidOverlay svg={FIGURE} onClose={() => {}} />);
		assert.ok(html.includes('data-testid="figure-pdf-download"'), "the PDF button renders");
		assert.ok(html.includes('aria-label="Download as PDF"'), "the button is labelled");
		assert.ok(
			html.indexOf('data-testid="figure-pdf-download"') < html.indexOf('data-testid="mermaid-overlay-close"'),
			"the PDF button sits before (left of) the X",
		);
	});

	it("mermaid mode (chart) has no PDF button", () => {
		const html = renderToStaticMarkup(<MermaidOverlay chart={"graph TD\nA --> B"} onClose={() => {}} />);
		assert.ok(html.includes('data-testid="mermaid-overlay-close"'), "the overlay shell rendered");
		assert.ok(!html.includes("figure-pdf-download"));
	});

	it("raster image mode has no PDF button", () => {
		const html = renderToStaticMarkup(<MermaidOverlay image={{ src: "data:image/png;base64,AA==", width: 10, height: 10 }} onClose={() => {}} />);
		assert.ok(html.includes('data-testid="mermaid-overlay-close"'), "the overlay shell rendered");
		assert.ok(!html.includes("figure-pdf-download"));
	});
});
