import { addDays, describeDate, EN_DATE_NAMES, formatLongDate, formatShortDate, isValidDateKey, parseDateKey, toDateKey } from '../src/domain/dates';

describe('dates', () => {
  it('round-trips keys', () => {
    expect(toDateKey(parseDateKey('2025-09-10'))).toBe('2025-09-10');
    expect(isValidDateKey('2025-02-30')).toBe(false);
    expect(isValidDateKey('2024-02-29')).toBe(true);
  });
  it('adds days across month and year boundaries', () => {
    expect(addDays('2025-09-30', 1)).toBe('2025-10-01');
    expect(addDays('2025-01-01', -1)).toBe('2024-12-31');
  });
  it('formats the long date as in the design spec', () => {
    expect(formatLongDate('2026-09-10')).toBe('Thursday, 10 September');
    expect(formatShortDate('2025-09-10', EN_DATE_NAMES, new Date(2025, 0, 1))).toBe('10 Sep');
    expect(formatShortDate('2024-09-10', EN_DATE_NAMES, new Date(2025, 0, 1))).toBe('10 Sep 2024');
  });
  it('describes relative dates', () => {
    const now = new Date(2025, 8, 10, 12);
    expect(describeDate('2025-09-10', EN_DATE_NAMES, now)).toBe('today');
    expect(describeDate('2025-09-09', EN_DATE_NAMES, now)).toBe('yesterday');
    expect(describeDate('2025-09-11', EN_DATE_NAMES, now)).toBe('tomorrow');
    expect(describeDate('2025-09-01', EN_DATE_NAMES, now)).toBe('1 Sep');
  });
});

describe('localised dates', () => {
  const UK = {
    weekdays: ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота'],
    months: ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'],
    monthsShort: ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд'],
    monthsStandalone: ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'],
    today: 'сьогодні',
    yesterday: 'вчора',
    tomorrow: 'завтра',
  };
  it('renders Ukrainian names', () => {
    expect(formatLongDate('2026-09-10', UK)).toBe('Четвер, 10 вересня');
    expect(describeDate('2025-09-01', UK, new Date(2025, 8, 10))).toBe('1 вер');
    expect(describeDate('2025-09-09', UK, new Date(2025, 8, 10))).toBe('вчора');
  });
});
