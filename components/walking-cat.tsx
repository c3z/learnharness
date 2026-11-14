/**
 * THE WALKING CAT (owner request, 2026-11-14): a small pixel-art cat walks
 * back and forth in a ~140px lane on the bottom edge, in the right corner
 * of the content column. Decoration only — it makes the app feel alive and
 * blocks nothing: pointer-events-none (clicks pass through), aria-hidden.
 *
 * Layers: AppShell mounts the cat INSIDE the content column (the <main> of
 * FilePathDropZone, which is `isolate`), the same stacking context as the
 * session overlays (figure/mermaid, plan, chain table: absolute, z-40 or
 * z 100+). The cat's z-30 ranks below all of them; body-level dialogs
 * (z 100+ above <main>) and the side thread (fixed, z 60) cover it too.
 * Mounted in <body> instead, the cat would paint above the whole column.
 *
 * Hidden below 1280px (owner decision, 2026-11-14): in narrower windows
 * the lane runs over the composer's bottom row (Dictate, model, thinking).
 *
 * Why this shape: the art is ASCII rows ("#" = filled), turned into one
 * <rect> per horizontal run, so a frame is a handful of rects drawn in
 * currentColor (the theme's muted ink — it fits every theme). Motion is
 * CSS only (globals.css lh-cat-*), like the braille spinner: no JS timer,
 * no hooks, no re-render. The svg translates along the lane, flips at each
 * end, and two leg frames swap opacity.
 *
 * Reduced motion: the cat walks anyway (owner decision, 2026-11-14 — the
 * owner runs Reduce Motion and wants to see the cat walk).
 */

/** One art pixel = this many screen px. */
const PX = 2;

/** The art grid: columns × rows. Every frame row has CAT_W chars, every frame CAT_H rows. */
export const CAT_W = 18;
export const CAT_H = 11;

type CatFrame = ReadonlyArray<string>;

/** Two leg frames, cat facing right. Same CAT_W×CAT_H grid; only the legs differ. */
export const CAT_FRAMES: readonly [CatFrame, CatFrame] = [
	[
		"............#...#.",
		"#...........##.##.",
		"#...........#####.",
		".#..........#.#.#.",
		".#..........#####.",
		"..###############.",
		"..##############..",
		"..##############..",
		"...#.#......#.#...",
		"...#.#......#.#...",
		"..##.##....##.##..",
	],
	[
		"............#...#.",
		"#...........##.##.",
		"#...........#####.",
		".#..........#.#.#.",
		".#..........#####.",
		"..###############.",
		"..##############..",
		"..##############..",
		"..#...#....#...#..",
		".#.....#..#.....#.",
		"##.....##.##.....#",
	],
];

export type ArtRect = { x: number; y: number; w: number };

/** Rows of art ("#" filled, anything else empty) → one rect per horizontal run of filled pixels. */
export function artRects(rows: ReadonlyArray<string>): ArtRect[] {
	const rects: ArtRect[] = [];
	rows.forEach((row, y) => {
		let start = -1;
		for (let x = 0; x <= row.length; x++) {
			const filled = row[x] === "#";
			if (filled && start < 0) start = x;
			if (!filled && start >= 0) {
				rects.push({ x: start, y, w: x - start });
				start = -1;
			}
		}
	});
	return rects;
}

export function WalkingCat() {
	return (
		<div
			aria-hidden="true"
			data-testid="walking-cat"
			className="pointer-events-none fixed right-4 bottom-0 z-30 hidden h-[22px] w-[140px] text-muted-foreground/70 min-[1280px]:block"
		>
			<svg
				viewBox={`0 0 ${CAT_W} ${CAT_H}`}
				width={CAT_W * PX}
				height={CAT_H * PX}
				shapeRendering="crispEdges"
				className="lh-cat absolute right-0 bottom-0"
			>
				{CAT_FRAMES.map((frame, k) => (
					<g key={k} className="lh-cat-frame" data-frame={k} fill="currentColor">
						{artRects(frame).map((r) => (
							<rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} />
						))}
					</g>
				))}
			</svg>
		</div>
	);
}
