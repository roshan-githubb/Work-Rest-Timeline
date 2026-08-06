import { describe, expect, it } from 'vitest';
import {
  BLOCKS_PER_DAY,
  applyStroke,
  beginStroke,
  blocksToChanges,
  changesToBlocks,
  createEmptyDay,
  formatDuration,
  summarise,
} from './timeline';

const DAY = { date: '2025-08-12', utcOffset: '+10:00' };

const at = (hours, minutes = 0) => hours * 4 + minutes / 15;

function workDay(...ranges) {
  const blocks = createEmptyDay();
  for (const [start, end] of ranges) {
    for (let i = start; i < end; i++) blocks[i] = 'Work';
  }
  return blocks;
}

describe('the day', () => {
  it('is 96 blocks of 15 minutes', () => {
    expect(BLOCKS_PER_DAY).toBe(96);
    expect(createEmptyDay()).toHaveLength(96);
  });

  it('defaults to Rest', () => {
    expect(createEmptyDay().every((block) => block === 'Rest')).toBe(true);
  });
});

describe('blocks -> changes (saving)', () => {
  it('sends an empty list for a day with no work', () => {
    expect(blocksToChanges(createEmptyDay(), DAY)).toEqual([]);
  });

  it('sends one change for a day that is entirely work', () => {
    expect(blocksToChanges(workDay([0, 96]), DAY)).toEqual([
      { startTime: '2025-08-12T00:00:00+10:00', eventType: 'Work' },
    ]);
  });

  it('handles a day that starts in Work', () => {
    expect(blocksToChanges(workDay([0, at(6)]), DAY)).toEqual([
      { startTime: '2025-08-12T00:00:00+10:00', eventType: 'Work' },
      { startTime: '2025-08-12T06:00:00+10:00', eventType: 'Rest' },
    ]);
  });

  it('handles work in the very last block (23:45)', () => {
    expect(blocksToChanges(workDay([95, 96]), DAY)).toEqual([
      { startTime: '2025-08-12T23:45:00+10:00', eventType: 'Work' },
    ]);
  });

  it('records only the changes, not every block', () => {
    const blocks = workDay([at(7), at(14, 15)]);
    expect(blocksToChanges(blocks, DAY)).toEqual([
      { startTime: '2025-08-12T07:00:00+10:00', eventType: 'Work' },
      { startTime: '2025-08-12T14:15:00+10:00', eventType: 'Rest' },
    ]);
  });
});

describe('changes -> blocks (loading)', () => {
  it('gives an all-Rest day for an empty list', () => {
    expect(changesToBlocks([], DAY)).toEqual(createEmptyDay());
  });

  it('paints each change forward until a later one replaces it', () => {
    const changes = [
      { startTime: '2025-08-12T07:00:00+10:00', eventType: 'Work' },
      { startTime: '2025-08-12T14:15:00+10:00', eventType: 'Rest' },
    ];
    expect(changesToBlocks(changes, DAY)).toEqual(workDay([at(7), at(14, 15)]));
  });

  it('does not depend on the order they arrive in', () => {
    const inOrder = [
      { startTime: '2025-08-12T07:00:00+10:00', eventType: 'Work' },
      { startTime: '2025-08-12T14:15:00+10:00', eventType: 'Rest' },
    ];
    const shuffled = [inOrder[1], inOrder[0]];
    expect(changesToBlocks(shuffled, DAY)).toEqual(changesToBlocks(inOrder, DAY));
  });
});

describe('rounding to the 15-minute grid', () => {
  it('rounds a time that is not on a boundary up to the next block', () => {
    const blocks = changesToBlocks(
      [{ startTime: '2025-08-12T07:10:00+10:00', eventType: 'Work' }],
      DAY,
    );
    expect(blocks[at(7, 15)]).toBe('Work');
    expect(blocks[at(7)]).toBe('Rest');
  });

  it('rounds both ends of a period the same way', () => {
    const blocks = changesToBlocks(
      [
        { startTime: '2025-08-12T07:10:00+10:00', eventType: 'Work' },
        { startTime: '2025-08-12T14:20:00+10:00', eventType: 'Rest' },
      ],
      DAY,
    );
    expect(summarise(blocks).workMinutes).toBe(7 * 60 + 15);
  });

  it('leaves times that are already on the grid alone', () => {
    const changes = [{ startTime: '2025-08-12T07:00:00+10:00', eventType: 'Work' }];
    expect(changesToBlocks(changes, DAY)[at(7)]).toBe('Work');
  });
});

describe('midnight boundaries', () => {
  it('keeps an overnight shift that started yesterday', () => {
    const blocks = changesToBlocks(
      [
        { startTime: '2025-08-11T22:00:00+10:00', eventType: 'Work' },
        { startTime: '2025-08-12T06:00:00+10:00', eventType: 'Rest' },
      ],
      DAY,
    );
    expect(blocks).toEqual(workDay([0, at(6)]));
  });

  it('ignores a change that belongs to tomorrow', () => {
    const blocks = changesToBlocks(
      [
        { startTime: '2025-08-12T07:00:00+10:00', eventType: 'Work' },
        { startTime: '2025-08-13T02:00:00+10:00', eventType: 'Rest' },
      ],
      DAY,
    );
    expect(blocks).toEqual(workDay([at(7), 96]));
  });

  it('ignores a change at exactly 24:00', () => {
    const blocks = changesToBlocks(
      [{ startTime: '2025-08-13T00:00:00+10:00', eventType: 'Work' }],
      DAY,
    );
    expect(blocks).toEqual(createEmptyDay());
  });
});

describe('round trip', () => {
  it('survives blocks -> changes -> blocks', () => {
    const cases = [
      createEmptyDay(),
      workDay([0, 96]),
      workDay([0, 1]),
      workDay([95, 96]),
      workDay([at(7), at(14, 15)], [at(15, 30), at(18, 15)]),
    ];
    for (const blocks of cases) {
      expect(changesToBlocks(blocksToChanges(blocks, DAY), DAY)).toEqual(blocks);
    }
  });
});

describe('dragging', () => {
  it('paints the opposite of the block it started on', () => {
    const blocks = workDay([at(7), at(9)]);
    expect(beginStroke(blocks, at(12)).value).toBe('Work'); // started on Rest
    expect(beginStroke(blocks, at(8)).value).toBe('Rest'); // started on Work
  });

  it('fills the same columns whichever direction you drag', () => {
    const blocks = createEmptyDay();
    const forwards = applyStroke(blocks, { anchor: 10, head: 20, value: 'Work' });
    const backwards = applyStroke(blocks, { anchor: 20, head: 10, value: 'Work' });
    expect(forwards).toEqual(backwards);
    expect(forwards).toEqual(workDay([10, 21]));
  });

  it('shrinks when you drag back toward where you started', () => {
    const blocks = createEmptyDay();
    const wide = applyStroke(blocks, { anchor: 10, head: 30, value: 'Work' });
    const narrow = applyStroke(blocks, { anchor: 10, head: 15, value: 'Work' });
    expect(wide[25]).toBe('Work');
    expect(narrow[25]).toBe('Rest'); // released, not left behind
  });

  it('does not flicker when you cross the same column twice', () => {
    const blocks = createEmptyDay();
    const stroke = beginStroke(blocks, 10);
    const once = applyStroke(blocks, { ...stroke, head: 20 });
    const twice = applyStroke(once, { ...stroke, head: 20 });
    expect(twice).toEqual(once);
  });

  it('paints across a mixed stretch evenly instead of toggling each column', () => {
    const blocks = workDay([10, 15]);
    const painted = applyStroke(blocks, { anchor: 12, head: 20, value: 'Work' });
    expect(painted.slice(12, 21).every((block) => block === 'Work')).toBe(true);
  });

  it('treats a click with no movement as a single block', () => {
    const blocks = createEmptyDay();
    const clicked = applyStroke(blocks, beginStroke(blocks, 40));
    expect(clicked).toEqual(workDay([40, 41]));
    expect(applyStroke(clicked, beginStroke(clicked, 40))).toEqual(createEmptyDay());
  });

  it('does not change the saved blocks until the drag is applied', () => {
    const blocks = createEmptyDay();
    applyStroke(blocks, { anchor: 0, head: 95, value: 'Work' });
    expect(blocks).toEqual(createEmptyDay());
  });
});

describe('totals', () => {
  it('adds up work and rest', () => {
    const blocks = workDay([at(7), at(14, 15)]);
    expect(summarise(blocks)).toEqual({
      workMinutes: 7 * 60 + 15,
      restMinutes: 24 * 60 - (7 * 60 + 15),
    });
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(0)).toBe('0 hr 0 min');
    expect(formatDuration(810)).toBe('13 hr 30 min');
  });
});
