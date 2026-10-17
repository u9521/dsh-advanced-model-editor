/**
 * The plugin's mark, as SVG path data.
 *
 * One geometry serves both places the plugin draws itself: the package icon
 * (`icon.svg`, stroke gradient) and the settings nav glyph, which is stroked
 * with `currentColor` so the shell's own text colour decides the tint. Keeping
 * the path here — rather than duplicating it into the nav code — means the two
 * cannot drift.
 */
export const MARK_PATH =
  'M12 11.65L9.58 10.25M2.25 9.19L2.25 8.06C2.25 6.93 2.25 6.36 2.51 5.9C2.78 5.44 3.27 5.16 4.25 4.6L5.05 4.13M2.25 13.89L2.25 15.02C2.25 16.14 2.25 16.71 2.51 17.17C2.78 17.64 3.27 17.92 4.25 18.48L5.05 18.94M21.75 9.19L21.75 8.06C21.75 6.93 21.75 6.36 21.49 5.9C21.22 5.44 20.73 5.16 19.75 4.6L18.95 4.13M14.89 2.68L13.91 2.12C12.93 1.55 12.44 1.27 11.91 1.27C11.37 1.27 10.88 1.55 9.91 2.12L9.1 2.58M14.89 21.05L13.91 21.62C12.93 22.18 12.44 22.46 11.91 22.46C11.37 22.46 10.88 22.18 9.91 21.62L9.11 21.16M21.75 13.89L21.75 15.02C21.75 16.14 21.75 16.71 21.49 17.17C21.22 17.64 20.73 17.92 19.75 18.48L18.95 18.94M5.43 7.75L2.73 6.2M5.43 15.24L2.73 16.8M18.57 7.75L21.27 6.19M18.57 15.24L21.27 16.8M12 11.65L14.42 10.25M12 14.2L12 11.65M12 4.85L12 1.73M12 21.82L12 18.71'

/** Stroke width the mark is drawn at, in its own 24-unit view box. */
export const MARK_STROKE = 2.1
