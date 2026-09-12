import { createSlots, DaySlot, recycleSlots, repointSlots } from '../src/screens/day/pagerRing';

const pages = (slots: DaySlot[]) => slots.map((slot) => slot.page);
const dates = (slots: DaySlot[]) => slots.map((slot) => slot.date);

describe('day pager ring', () => {
  it('mounts the centred day and both neighbours', () => {
    const slots = createSlots('2026-09-11');
    expect(pages(slots)).toEqual([-1, 0, 1]);
    expect(dates(slots)).toEqual(['2026-09-10', '2026-09-11', '2026-09-12']);
  });

  it('recycles only the slot two pages away and keeps the others identical', () => {
    const slots = createSlots('2026-09-11');
    const next = recycleSlots(slots, 1);
    expect(pages(next)).toEqual([2, 0, 1]);
    expect(dates(next)).toEqual(['2026-09-13', '2026-09-11', '2026-09-12']);
    // The two panels still on screen must not be re-rendered with new content.
    expect(next[1]).toBe(slots[1]);
    expect(next[2]).toBe(slots[2]);
  });

  it('recycles backwards as well', () => {
    const next = recycleSlots(createSlots('2026-09-11'), -1);
    expect(pages(next)).toEqual([-1, 0, -2]);
    expect(dates(next)).toEqual(['2026-09-10', '2026-09-11', '2026-09-09']);
  });

  it('always keeps three consecutive pages around the centre while paging', () => {
    let slots = createSlots('2026-09-11');
    for (let page = 1; page <= 5; page += 1) {
      slots = recycleSlots(slots, page);
      expect(pages(slots).slice().sort((a, b) => a - b)).toEqual([page - 1, page, page + 1]);
      expect(slots.find((slot) => slot.page === page)?.date).toBe(`2026-09-${11 + page}`);
    }
    for (let page = 4; page >= 0; page -= 1) {
      slots = recycleSlots(slots, page);
      expect(slots.find((slot) => slot.page === page)?.date).toBe(`2026-09-${11 + page}`);
    }
    expect(dates(slots)).toEqual(expect.arrayContaining(['2026-09-10', '2026-09-11', '2026-09-12']));
  });

  it('leaves the ring untouched when the target page is not mounted', () => {
    const slots = createSlots('2026-09-11');
    expect(recycleSlots(slots, 7)).toBe(slots);
  });

  it('repoints every slot at a date that is not mounted, keeping the page numbering', () => {
    const slots = recycleSlots(createSlots('2026-09-11'), 1);
    const next = repointSlots(slots, 1, '2026-12-25');
    expect(pages(next)).toEqual(pages(slots));
    expect(dates(next)).toEqual(['2026-12-26', '2026-12-24', '2026-12-25']);
  });
});
