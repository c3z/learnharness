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
	const wrapper = html.match(/<div [^>]*data-testid="walking-cat"[^>]*>/)?.[0] ?? "";
	const classes = new Set(wrapper.match(/class="([^"]*)"/)?.[1]?.split(/\s+/) ?? []);
	const has = (...names: string[]) => { for (const n of names) assert.ok(classes.has(n), `wrapper has class ${n} (got: ${[...classes].join(" ")})`); };

	it("is hidden from assistive tech and lets clicks through", () => {
		assert.match(wrapper, /aria-hidden="true"/);
		has("pointer-events-none");
	});

	it("sits fixed on the bottom edge, in the right corner, under the session overlays", () => {
		has("fixed", "bottom-0", "right-4", "z-30");
	});

	it("is hidden in windows narrower than 1280px", () => {
		has("hidden", "min-[1280px]:block");
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
		assert.match(html, /<svg [^>]*class="lh-cat[ "]/, "the svg carries the walk class");
	});
});

describe("walking cat — stylesheet", () => {
	const css = readFileSync("app/globals.css", "utf8");
	const rule = (selector: string) => css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.[\]"=]/g, "\\$&")}\\s*\\{([^}]*)\\}`))?.[1] ?? "";

	it("walks and turns the svg: .lh-cat runs lh-cat-walk and lh-cat-turn forever", () => {
		const walk = rule(".lh-cat");
		assert.match(walk, /animation:[^;]*\blh-cat-walk\b[^;]*infinite/);
		assert.match(walk, /animation:[^;]*\blh-cat-turn\b[^;]*infinite/);
		assert.match(css, /@keyframes lh-cat-walk\b/);
		assert.match(css, /@keyframes lh-cat-turn\b/);
	});

	it("steps the legs: .lh-cat-frame runs lh-cat-step forever", () => {
		assert.match(rule(".lh-cat-frame"), /animation:[^;]*\blh-cat-step\b[^;]*infinite/);
		assert.match(css, /@keyframes lh-cat-step\b/);
	});

	it("keeps walking on reduced motion (owner decision, 2026-11-14)", () => {
		const blocks = [...css.matchAll(/@media[^{]*prefers-reduced-motion[^{]*\{([\s\S]*?)\n\}/g)].map((m) => m[1] ?? "");
		assert.ok(blocks.length > 0, "the stylesheet still has reduced-motion blocks to search");
		for (const block of blocks) assert.doesNotMatch(block, /lh-cat/, "no reduced-motion block stops the cat");
	});
});

describe("walking cat — mount", () => {
	it("lives in the content column, in the same layer context as the session overlays", () => {
		const source = readFileSync("components/sidebar.tsx", "utf8");
		const shell = source.slice(source.indexOf("export function AppShell("));
		assert.match(shell, /<FilePathDropZone\b[^>]*>\{children\}<WalkingCat\s*\/><\/FilePathDropZone>/);
		assert.match(source, /import \{ WalkingCat \} from "@\/components\/walking-cat"/);
	});

	it("is not mounted in the body (above the content column's layers)", () => {
		assert.doesNotMatch(readFileSync("app/layout.tsx", "utf8"), /WalkingCat/);
	});
});
