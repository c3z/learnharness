/**
 * The walking cat (owner request, 2026-11-14): a pixel-art decoration in the
 * bottom-right corner. Pure geometry + static markup — the walk itself is
 * CSS (globals.css lh-cat-*), so the tests read the art, the markup and the
 * stylesheet. tsx note: classic JSX transform — the React global shim below
 * provides React.
 */

import React from "react";
(globalThis as Record<string, unknown>).React = React;

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CAT_FRAMES, CAT_H, CAT_W, WalkingCat, artRects } from "../components/walking-cat.tsx";

describe("walking cat — art", () => {
	it("joins each run of filled pixels in a row into one rect", () => {
		assert.deepEqual(artRects(["##.#"]), [
			{ x: 0, y: 0, w: 2 },
			{ x: 3, y: 0, w: 1 },
		]);
	});

	it("keeps the row index as y and skips empty rows", () => {
		assert.deepEqual(artRects(["....", ".##.", "#..#"]), [
			{ x: 1, y: 1, w: 2 },
			{ x: 0, y: 2, w: 1 },
			{ x: 3, y: 2, w: 1 },
		]);
	});

	it("has two leg frames on one rectangular grid of the same size", () => {
		assert.equal(CAT_FRAMES.length, 2);
		const [a, b] = CAT_FRAMES;
		assert.equal(a.length, CAT_H, "frame 0 has the grid height");
		assert.equal(b.length, CAT_H, "frame 1 has the grid height");
		for (const row of [...a, ...b]) assert.equal(row.length, CAT_W, `row "${row}" has the grid width`);
		assert.notDeepEqual(a, b, "the frames differ (the legs step)");
	});
});

describe("walking cat — markup", () => {
	const html = renderToStaticMarkup(<WalkingCat />);

	it("is hidden from assistive tech and lets clicks through", () => {
		assert.match(html, /aria-hidden="true"/);
		assert.match(html, /\bpointer-events-none\b/);
	});

	it("is fixed in the bottom-right corner, under the app's overlays", () => {
		assert.match(html, /\bfixed\b/);
		assert.match(html, /\bright-\d/);
		assert.match(html, /\bbottom-\d/);
		assert.match(html, /\bz-30\b/);
	});

	it("draws two frame groups in currentColor with crisp pixels", () => {
		assert.equal(html.match(/<g [^>]*class="lh-cat-frame"/g)?.length, 2);
		assert.match(html, /data-frame="0"/);
		assert.match(html, /data-frame="1"/);
		assert.match(html, /fill="currentColor"/);
		assert.match(html, /shape-rendering="crispEdges"/);
	});

	it("sizes the svg at 2 screen px per art pixel", () => {
		assert.match(html, new RegExp(`viewBox="0 0 ${CAT_W} ${CAT_H}"`));
		assert.match(html, new RegExp(`width="${CAT_W * 2}"`));
		assert.match(html, new RegExp(`height="${CAT_H * 2}"`));
	});
});

describe("walking cat — stylesheet", () => {
	const css = readFileSync("app/globals.css", "utf8");

	it("animates the walk and the steps in CSS", () => {
		assert.match(css, /@keyframes lh-cat-walk\b/);
		assert.match(css, /@keyframes lh-cat-turn\b/);
		assert.match(css, /@keyframes lh-cat-step\b/);
	});

	it("stands still on reduced motion", () => {
		const blocks = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g)].map((m) => m[1] ?? "");
		const cat = blocks.find((b) => b.includes(".lh-cat-"));
		assert.ok(cat, "a reduced-motion block covers the cat");
		assert.match(cat, /animation: none/);
	});
});
