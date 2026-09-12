import { addDays } from '../../domain/dates';
import { DateKey } from '../../domain/models';

/** One mounted day panel. */
export interface DaySlot {
  /** Signed page number; the three slots always hold three consecutive pages. */
  page: number;
  date: DateKey;
}

/**
 * Slot bookkeeping for the day pager. Three panels stay mounted — the centred day and both
 * neighbours — and are recycled rather than remounted as the user pages, so the array order is
 * fixed and each slot keeps its React identity.
 */
export function createSlots(date: DateKey, centrePage = 0): DaySlot[] {
  return [-1, 0, 1].map((offset) => ({ page: centrePage + offset, date: addDays(date, offset) }));
}

/**
 * Re-points the slot that is now two pages away from the centre so it becomes the new far
 * neighbour. Called only once a slide has settled, when that slot sits a full viewport off screen.
 */
export function recycleSlots(slots: DaySlot[], target: number): DaySlot[] {
  const centre = slots.find((slot) => slot.page === target);
  if (!centre) return slots;
  return slots.map((slot) => {
    if (Math.abs(slot.page - target) <= 1) return slot;
    const page = slot.page < target ? target + 1 : target - 1;
    return { page, date: addDays(centre.date, page - target) };
  });
}

/** Points the whole ring at a date that is not mounted, leaving the page numbering untouched. */
export function repointSlots(slots: DaySlot[], centrePage: number, date: DateKey): DaySlot[] {
  return slots.map((slot) => ({ page: slot.page, date: addDays(date, slot.page - centrePage) }));
}
