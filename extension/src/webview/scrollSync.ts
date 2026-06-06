// Pure scroll→active-index logic, factored out of the webview DOM glue so it can
// be unit-tested. This single function encodes the user's requirement: "keep the
// last reference/diagram in place until a different one scrolls into view — same
// going up." Determinism makes that fall out for both scroll directions.

/**
 * Given the offsetTop of each anchor within the scroll container, the current
 * scrollTop, and the viewport height, return the index of the anchor that should
 * be "active" — the last anchor whose top has crossed an activation line one
 * third of the way down the viewport.
 *
 * - Returns -1 when there are no anchors.
 * - Clamps to the first anchor when scrolled above all of them, so something is
 *   always shown rather than flicking to empty at the top.
 * - Being purely a function of scrollTop, it is symmetric for up and down and
 *   naturally "sticky": the active index only changes when a different anchor
 *   crosses the line.
 */
export function activeIndex(offsets: number[], scrollTop: number, viewportHeight: number): number {
  if (offsets.length === 0) return -1;
  const line = scrollTop + viewportHeight / 3;
  let active = 0;
  for (let i = 0; i < offsets.length; i++) {
    if (offsets[i] <= line) active = i;
    else break; // offsets are in document order; once past the line, stop
  }
  return active;
}
