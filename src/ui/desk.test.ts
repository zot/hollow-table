// CRC: crc-Desk.md | Test: test-Desk.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { release, type Let } from './desk.ts';

test('what letting go means', () => {
  // R513-R516: from the move, the pigeonhole, a drag out and touch.
  const l = (o: Partial<Let>): Let => ({ moved: true, onDesk: false, hole: null, imageOut: false, touch: false, open: false, ...o });
  assert.equal(release(l({ moved: false, onDesk: true })), 'open', 'a click on the desk opens it');
  assert.equal(release(l({ moved: false, onDesk: true, open: true })), 'close', 'and, open, closes it');
  assert.equal(release(l({ hole: 'sticky' })), 'loose', 'let go in a pigeonhole: carried loose');
  assert.equal(release(l({ hole: 'sticky', touch: true })), 'below', 'on touch: just below the strip');
  assert.equal(release(l({ hole: 'sticky', moved: false })), 'loose', 'a click on a pigeonhole of the open desk');
  assert.equal(release(l({ hole: 'image' })), 'picker', 'the image pigeonhole opens the picker');
  assert.equal(release(l({ imageOut: true })), 'picker', 'and so does the image dragged out');
  assert.equal(release(l({ onDesk: true })), 'close', 'moved and let go on the desk: nothing');
  assert.equal(release(l({})), 'close', 'let go off the strip with nothing held');
});
