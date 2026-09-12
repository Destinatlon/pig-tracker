import { summarizeWeights, weeklyWeightPoints, weightPointBounds, WeightEntry } from '../src/domain/weight/trend';

const entry = (date: string, weightKg: number): WeightEntry => ({ date, weightKg });

describe('weight trend over a period', () => {
  it('reports the first and last measurement and the change between them', () => {
    const trend = summarizeWeights([entry('2026-09-07', 82.4), entry('2026-09-21', 81.1), entry('2026-09-14', 81.8)]);
    expect(trend.start).toEqual(entry('2026-09-07', 82.4));
    expect(trend.end).toEqual(entry('2026-09-21', 81.1));
    expect(trend.changeKg).toBeCloseTo(-1.3, 6);
    expect(trend.count).toBe(3);
  });

  it('has no change to report from a single measurement', () => {
    const trend = summarizeWeights([entry('2026-09-07', 82.4)]);
    expect(trend.start).toEqual(trend.end);
    expect(trend.changeKg).toBeNull();
    expect(trend.count).toBe(1);
  });

  it('reports nothing at all for a period without measurements', () => {
    expect(summarizeWeights([])).toEqual({ start: null, end: null, changeKg: null, count: 0 });
  });

  it('reports a gain as a positive change', () => {
    expect(summarizeWeights([entry('2026-09-07', 80), entry('2026-09-14', 80.9)]).changeKg).toBeCloseTo(0.9, 6);
  });
});

describe('weekly points for the month diagram', () => {
  it('groups measurements into Monday-started weeks, in calendar order', () => {
    // 2026-09-07 and -09-13 are the same week (Mon..Sun); -09-14 starts the next.
    const points = weeklyWeightPoints([entry('2026-09-14', 81.5), entry('2026-09-07', 82.4), entry('2026-09-13', 82.0)]);
    expect(points.map((point) => point.weekStart)).toEqual(['2026-09-07', '2026-09-14']);
    expect(points[0].weightKg).toBeCloseTo(82.2, 6);
    expect(points[0].count).toBe(2);
    expect(points[1].weightKg).toBe(81.5);
  });

  it('leaves a week without a weighing out rather than interpolating it', () => {
    const points = weeklyWeightPoints([entry('2026-09-07', 82), entry('2026-09-21', 81)]);
    expect(points.map((point) => point.weekStart)).toEqual(['2026-09-07', '2026-09-21']);
  });

  it('has no points without measurements', () => {
    expect(weeklyWeightPoints([])).toEqual([]);
    expect(weightPointBounds([])).toBeNull();
  });

  it('bounds the diagram by the lowest and highest point', () => {
    const points = weeklyWeightPoints([entry('2026-09-07', 82.4), entry('2026-09-14', 81.1), entry('2026-09-21', 81.9)]);
    expect(weightPointBounds(points)).toEqual({ min: 81.1, max: 82.4 });
  });
});
