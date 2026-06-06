import assert from 'node:assert/strict';
import { activeIndex } from '../../src/webview/scrollSync';

describe('activeIndex', () => {
  // Three anchors at 0, 1000, 2000; viewport 600 -> activation line = scrollTop + 200.
  const offsets = [0, 1000, 2000];
  const vh = 600;

  it('returns -1 with no anchors', () => {
    assert.equal(activeIndex([], 0, vh), -1);
  });

  it('clamps to the first anchor at the very top', () => {
    assert.equal(activeIndex(offsets, 0, vh), 0);
  });

  it('keeps the first until the second crosses the activation line', () => {
    assert.equal(activeIndex(offsets, 700, vh), 0); // line 900 < 1000
    assert.equal(activeIndex(offsets, 800, vh), 1); // line 1000 >= 1000
  });

  it('is sticky: stays on the second across a range until the third crosses', () => {
    assert.equal(activeIndex(offsets, 1500, vh), 1); // line 1700 < 2000
    assert.equal(activeIndex(offsets, 1700, vh), 1); // line 1900 < 2000
    assert.equal(activeIndex(offsets, 1900, vh), 2); // line 2100 >= 2000
  });

  it('is symmetric scrolling back up (same scrollTop -> same index)', () => {
    // Going down then back up to the same position yields the same active index,
    // which is what "keep the last one until a different one scrolls in" requires.
    assert.equal(activeIndex(offsets, 800, vh), activeIndex(offsets, 800, vh));
    assert.equal(activeIndex(offsets, 1500, vh), 1);
    assert.equal(activeIndex(offsets, 850, vh), 1);
    assert.equal(activeIndex(offsets, 750, vh), 0);
  });
});
