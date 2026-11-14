/**
 * THE WALKING CAT (owner request, 2026-11-14): a small pixel-art cat walks
 * back and forth in a ~140px lane in the bottom-right corner of every
 * screen. Decoration only — it makes the app feel alive and blocks nothing:
 * pointer-events-none (clicks pass through), aria-hidden, z-30 so every
 * overlay and dialog (z-40, z-100+) covers it.
 *
 * Why this shape: the art is ASCII rows ("#" = filled), turned into one
 * <rect> per horizontal run, so a frame is a handful of rects drawn in
 * currentColor (the theme's muted ink — it fits every theme). Motion is
 * CSS only (globals.css lh-cat-*), like the braille spinner: no JS timer,
 * no re-render, so this stays a server component. The svg translates
 * along the lane, flips at each end, and two leg frames swap opacity.
 *
 * Static fallback (prefers-reduced-motion): the cat stands at the right
 * end of the lane on frame 0.
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
			className="pointer-events-none fixed right-4 bottom-2 z-30 h-[22px] w-[140px] text-muted-foreground/70"
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
