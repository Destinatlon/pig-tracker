# Pig Tracker — Phase 2 Statistics and Goal Ranges Agent Specification

## 1. Purpose and authority

This document is the implementation specification for the Phase 2 user-facing statistics feature and the goal-range changes it requires.

It supplements:

- `offline_calorie_tracker_phase1_ai_agent_spec.md`
- `offline_calorie_tracker_phase1_design_ai_agent_spec.md`
- `CLAUDE.md`

For the work described here, this document explicitly overrides the Phase 1 statements that charts, analytics, and day/week/month diagrams are out of scope. All other Phase 1 rules remain in force unless this document explicitly changes them.

The feature is fully local and offline. "Statistics" means nutrition-history statistics shown to the user. It does not mean telemetry, remote product analytics, or uploading nutrition data.

---

## 2. Agreed product scope

Implement:

- One new `Statistics` drawer destination.
- One Statistics screen with `Week` and `Month` tabs.
- Calendar-based periods.
- A daily column chart that fits the whole selected period on screen.
- A selectable metric: Calories, Protein, Carbohydrates, or Fat.
- Historical goal boundaries drawn over the chart.
- Status colors for below range, within range, above range, and incomplete macro data.
- A compact detail popup when a day column is selected.
- A route from that popup to the full Day screen for the selected date.
- Period statistics: average intake, average goal boundaries, logged-day coverage, status counts, highest day, and lowest day.
- Lower and upper goal boundaries for calories and every macro.
- Corresponding changes to Settings -> Goals, goal history, the goal estimator application flow, and the compact Day summary.

Do not implement in this phase:

- Body-weight history or body-weight charts.
- Meal grouping.
- Remote analytics, accounts, cloud sync, or network services.
- Persisted/cached aggregate-statistics tables.
- Export, sharing, coaching, predictions, correlations, or medical recommendations.
- A separate Day tab inside Statistics. The existing Day screen is the full single-day view.
- Rolling 7-day or rolling 30-day modes.

Body-weight history is intended for a later phase and must eventually use its own dated table. Do not repurpose the current goal-estimation profile weight as history.

---

## 3. Terminology

Use the following meanings consistently in domain code and UI copy:

- **Logged day**: a date containing at least one day entry.
- **Empty day**: a date with no day entries. This is missing tracking data, not zero intake.
- **Completed day**: a date strictly before the current local calendar date.
- **Today**: the current local calendar date. Its values are "so far."
- **Future day**: a date after today.
- **Complete macro day**: a logged day on which every entry has a known value for the selected macro.
- **Incomplete macro day**: a logged day on which at least one entry has `null` for the selected macro.
- **Goal range**: optional lower and upper boundaries for a nutrient. Either boundary may be absent.
- **Assessed day**: a completed, logged day with complete data for the selected metric and at least one applicable goal boundary.

Calories are always complete on a logged day because every entry requires calories. Protein, carbohydrates, and fat may be incomplete. Unknown values remain `null` and must never be converted to zero.

---

## 4. Goal-range model

### 4.1 Domain shape

Replace each single point target with a range:

```ts
export type NutrientKey = 'calories' | 'protein' | 'carbs' | 'fat';

export interface GoalRange {
  minimum: number | null;
  maximum: number | null;
}

export interface GoalSettings {
  id: number;
  calories: GoalRange;
  protein: GoalRange;
  carbs: GoalRange;
  fat: GoalRange;
  effectiveFrom: DateKey;
  createdAt: string;
}
```

Equivalent naming is acceptable if it remains strongly typed and generic calculations do not duplicate logic four times.

Rules:

- Calories must have at least one boundary.
- A macro is disabled when both its boundaries are `null`.
- A macro is enabled when at least one boundary is non-null.
- All entered boundaries must be finite and non-negative.
- When both boundaries exist, `minimum <= maximum`.
- Equality with either boundary counts as within range.
- Do not silently swap an invalid minimum and maximum; show validation errors.
- Store full-precision numeric values. Round only for display.

This model supports all of these cases:

```text
Protein: no less than 120 g       -> minimum 120, maximum null
Fat: no more than 80 g            -> minimum null, maximum 80
Calories: from 1800 to 2200 kcal  -> minimum 1800, maximum 2200
Carbohydrates disabled            -> minimum null, maximum null
```

### 4.2 Goal history

Goal history remains effective-dated.

- Saving goal settings creates or replaces the row effective from today.
- Historical entries are never rewritten.
- A statistic for a date must use the latest goal row whose `effective_from` is on or before that date.
- A change during a displayed week or month may therefore change the goal band partway through the chart.
- Keep a baseline goal row so every date has a calorie goal.

### 4.3 Database migration

Add a new migration; never edit a shipped migration.

The new `goal_settings` storage must contain lower and upper fields for all four nutrients, with database checks matching the domain rules. Rebuilding the table inside the migration is acceptable and preferable to leaving obsolete point-target columns as a second source of truth.

Migrate each existing non-null point target to an explicit +/-10% range:

```text
minimum = old target * 0.90
maximum = old target * 1.10
```

An old null macro remains disabled with both boundaries null. Preserve row IDs, `effective_from`, and `created_at`. A zero target migrates to `[0, 0]`.

The +/-10% calculation is a migration/defaulting rule only. Once ranges exist, classification uses the stored boundaries exactly and does not apply another hidden tolerance.

Migration tests must cover the baseline row, several historical rows, null macros, zero, and preservation of effective dates.

### 4.4 Goal repository

Update the repository API and row mappers for ranges. Preserve these behaviors:

- `getGoalForDate(date)` returns the historical range in force for that date.
- `saveGoalEffectiveFrom(today, input)` does not alter earlier history.
- Same-day saves replace the same effective row rather than creating duplicates.

Do not query today's goal and apply it retroactively to a historical chart.

---

## 5. Settings -> Goals design

Each nutrient has a compact range editor with two numeric fields:

```text
Calories
No less than   [ 1800 ] kcal
No more than   [ 2200 ] kcal

Protein                                      [enabled]
No less than   [ 120 ] g
No more than   [ 160 ] g
```

Requirements:

- Calories remain always enabled; at least one calorie boundary is required.
- Protein, carbohydrates, and fat keep an enable/disable switch.
- When a macro is enabled, show both optional boundary fields and require at least one of them.
- Disabling a macro saves both boundaries as `null`.
- Use explicit localized labels equivalent to `No less than` and `No more than`; do not rely on mathematical symbols alone.
- Explain briefly that values between the configured boundaries are treated as the normal range.
- Validate all fields before saving and show field-level errors.
- If both fields exist and the lower value exceeds the upper value, show a range validation error.
- Continue using explicit Save behavior.
- Continue showing the effective-from/history note.

Update English and Ukrainian translations and preserve the i18n key-parity test.

### 5.1 Goal estimator

The estimator may continue calculating a central calorie and protein suggestion. When applying an estimated point value, convert it to an explicit +/-10% range before saving. Preserve full precision in storage.

- Estimated calorie target -> calorie minimum 90%, maximum 110%.
- Estimated protein target -> protein minimum 90%, maximum 110%.
- Disabled or manually configured carbohydrates/fat remain unchanged unless the user edits them.
- Clearly present the resulting range before or immediately after applying the estimate.
- Keep all existing language that estimates are suggestions, not guarantees or medical advice.

Do not move estimation formulas into screen components.

### 5.2 Day summary compatibility

Update the compact Day summary to display goal ranges without turning it into a dashboard.

Examples:

```text
1840 / 1800-2200 kcal
P 142/120-160 · C 190/<=250 · F 61/—
```

Localized formatting may use words or symbols as space permits, but accessibility labels must say the relationship explicitly. Preserve the existing incomplete-macro warning and edit flow.

---

## 6. Statistics navigation and period model

### 6.1 Drawer

Add `Statistics` to the existing navigation drawer between `Day` and library-management destinations. Use a suitable Material Community icon if drawer items gain icons; keep all drawer items stylistically consistent.

Do not add bottom navigation.

### 6.2 Period tabs

The Statistics screen has exactly two top-level tabs:

- `Week`
- `Month`

Use the existing compact segmented-tab design unless it cannot satisfy accessibility requirements.

### 6.3 Calendar periods

Week:

- Always Monday through Sunday.
- This is independent of device-region first-day-of-week settings.
- Display all seven dates.

Month:

- Always the named calendar month.
- Display all 28, 29, 30, or 31 dates.
- All date columns must fit within the available portrait width.
- The chart must not require horizontal scrolling.

Period navigation:

- Center the current period label between previous and next controls.
- Previous and next move by one calendar week or one calendar month according to the active tab.
- Switching tabs selects the week/month containing the currently selected date.
- Do not navigate beyond the period containing today.
- Future dates within the current week/month may occupy chart positions but contain no analytic values and are excluded from all statistics.

Use local calendar dates and the existing noon-based date helpers so week/month arithmetic is stable across DST transitions.

---

## 7. Metric selector

Below the period controls, show a compact selector in this order:

```text
Calories | Protein | Carbs | Fat
```

Only one metric is graphed at a time because calories and grams use different scales.

- Default to Calories when the screen first opens.
- Preserve the chosen metric while switching Week/Month and navigating periods during the mounted session.
- Show `kcal` for calories and `g` for macros.
- If the chosen macro goal is disabled on some or all dates, its intake may still be charted; unassessed days must not be labeled normal.

---

## 8. Daily data and status classification

### 8.1 Daily totals

For each date in the selected calendar period, derive:

- Entry count.
- Total calories.
- Known total protein, carbohydrates, and fat.
- Per-macro completeness flags.
- Historical goal range in force for that date.

Reuse or extract the established nutrition math. Never calculate analytics from current library product values; day-entry snapshots are authoritative.

### 8.2 Statuses

Define a pure, exhaustive status type such as:

```ts
type StatisticStatus =
  | 'noData'
  | 'future'
  | 'incomplete'
  | 'noGoal'
  | 'below'
  | 'normal'
  | 'above';
```

Classify in this precedence order:

1. Future date -> `future`.
2. No entries -> `noData`.
3. Selected macro is incomplete -> `incomplete`.
4. No lower or upper boundary for the metric -> `noGoal`.
5. Value is lower than a configured minimum -> `below`.
6. Value is higher than a configured maximum -> `above`.
7. Otherwise -> `normal`.

An incomplete macro day is brown regardless of whether its known partial sum appears below or above a boundary. Never classify a partial macro total as adherence or non-adherence.

### 8.3 Colors

Add semantic light- and dark-theme tokens rather than hard-coding chart colors:

- `statisticsNormal`: blue.
- `statisticsBelow`: yellow.
- `statisticsAbove`: red.
- `statisticsIncomplete`: brown.
- `statisticsNoGoal`: neutral grey.
- `statisticsGoalLine` and `statisticsGoalBand`.
- Any additional chart axis/grid color should reuse or extend semantic tokens.

Meanings:

- Blue: within the configured range.
- Yellow: below the configured minimum.
- Red: above the configured maximum.
- Brown: macro data is incomplete or was not recorded for one or more entries.
- Grey/empty: no goal, no entry data, or future, as distinguished by text in the detail view.

Choose theme variants with adequate contrast. Color must not be the only carrier of meaning: include a visible legend, textual statuses in details, accessible labels, and non-color selected-state treatment.

---

## 9. Chart design

### 9.1 General

Use vertical columns with historical goal boundaries overlaid.

- Week: seven wider columns, with a localized short weekday label under each.
- Month: 28-31 narrow columns fitted into the chart width.
- Month labels should be selective (for example 1, 5, 10, 15, 20, 25, and the last day) so they do not overlap.
- Reserve approximately 180-220 dp for the plot; adapt to available width rather than using device-specific dimensions.
- Start the numeric Y scale at zero.
- Derive the upper scale from the largest visible intake or goal boundary and add modest headroom.
- Handle an all-zero period without division by zero.
- Do not horizontally scroll or require landscape orientation.
- Do not animate every chart on initial render. If transitions are used, keep them short and respect reduced-motion/accessibility settings.

### 9.2 Goal visualization

When both boundaries exist for a date:

- Draw lower and upper boundary lines.
- Lightly shade the region between them.

When only one boundary exists:

- Draw one boundary line.
- Do not invent the missing boundary.

Goal boundaries are per date. If goals change within the selected period, display a stepped/segmented line or band that changes at the correct date. Do not average goal history into one misleading horizontal line in the chart.

The shaded band must remain subtle enough that status-colored columns dominate.

### 9.3 Today, empty days, and future days

- Show today's column using its current "so far" value and status color.
- Add a small non-color indication that today is in progress.
- Empty dates have no filled bar. Do not draw a zero-height normal bar.
- Future positions in the current period remain visually quiet and are not selectable as analytic days.
- A logged zero-calorie day is valid data and must remain distinguishable from an empty day through selection/accessibility.

### 9.4 Interaction

Tapping or selecting the plot chooses the nearest eligible date column and opens a compact detail popup. Month bars are too narrow for independent 44 dp hit targets, so a full-chart gesture surface may map the touch X coordinate to a date index.

The selected day must also have a visible outline, marker, or other non-color treatment.

The chart implementation may use a small Expo-compatible vector/SVG dependency when needed for goal lines and the band. Do not add a large general dashboard package solely for this chart. Keep aggregation and classification independent of the rendering library.

---

## 10. Day detail popup

Use a compact modal/bottom sheet consistent with existing app components. It contains:

- Full localized date.
- Consumed amount and unit for the selected metric.
- Applicable lower/upper goal boundaries.
- Text status: Below range, Within range, Above range, Incomplete data, No goal, or No entries.
- An explanation when macro data is incomplete.
- `Open full day` action.
- Close behavior consistent with existing sheets.

`Open full day` closes the popup and navigates to the existing Day screen positioned on that exact date. Extend navigation params/state deliberately; do not introduce a second read-only day-detail implementation.

Today must be labeled as "so far" in the detail popup.

---

## 11. Period summary statistics

Place a compact summary near the chart. Avoid oversized fitness-dashboard cards.

Show for the selected metric:

- Average intake.
- Average applicable minimum and maximum goals.
- Logged-day coverage.
- Counts of Below, Normal, and Above assessed days.
- Highest intake day.
- Lowest intake day.

### 11.1 Eligible values

Average intake:

- Use completed logged days only.
- Exclude today, even though today appears in the chart.
- For a macro, include only complete macro days.
- Exclude empty and future days.
- Display the coverage used, such as `Average from 5 complete days`.

Average goal boundaries:

- Resolve the historical goal separately for every included day.
- Average a minimum only across included days that have a minimum.
- Average a maximum only across included days that have a maximum.
- If no included day has a given boundary, display an em dash for it.

Logged-day coverage:

- Numerator: dates with at least one entry through today in the visible period.
- Denominator: calendar dates through today in the visible period.
- In a past period, the denominator is the entire week/month.
- This value describes tracking coverage; it does not treat unlogged days as zero.

Status counts:

- Count only completed assessed days.
- Exclude today, incomplete days, no-goal days, empty days, and future days.
- When zero days are assessable, explain why rather than showing a misleading 0% adherence score.

Highest/lowest:

- Use the same eligible intake set as the average.
- Return both date and value.
- If only one eligible day exists, it may be both highest and lowest, but the UI should present it once as the only complete day.
- Ties should resolve to the earliest date for deterministic behavior.

Do not create one opaque "adherence score." The explicit Below/Normal/Above counts are more transparent.

---

## 12. Data access and architecture

Recommended separation:

```text
src/domain/statistics/
  periods.ts          calendar period generation/navigation
  calculations.ts     classification and period summaries
  types.ts            daily and period view-domain types

src/db/repositories/
  statisticsRepo.ts   bounded aggregate SQL and historical goals

src/screens/statistics/
  StatisticsScreen.tsx
  StatisticsChart.tsx
  StatisticsSummary.tsx
  DayStatisticSheet.tsx
```

Exact filenames may follow existing conventions.

Requirements:

- Keep SQL in repositories.
- Keep period generation, classification, and summary formulas pure and unit-tested.
- Screens own selected tab, metric, period, and selected date state.
- Use one bounded grouped query for entries over the visible date range rather than loading every day separately.
- The existing `(date, sort_order)` day-entry index is sufficient for bounded date queries unless measurement proves otherwise.
- Do not persist derived daily or period totals in Phase 2.
- Do not calculate totals from recipes or the current product library. Logged day snapshots are the source of truth.
- Avoid N+1 goal queries. Load the relevant goal-history rows once and resolve the in-force row per date in domain/repository code, or use an equally clear bounded SQL solution.
- Protect against stale async responses when the user switches period or metric quickly.

A repository daily aggregate should retain enough information to distinguish:

- no row for an empty date;
- a real logged zero;
- known macro sum;
- count of entries missing each macro.

Calendar code must explicitly fill absent dates after querying so the chart always has exactly 7 or the exact number of month dates.

---

## 13. Loading, empty, and error states

- While loading, keep the screen structure stable and show a compact progress state.
- If the period has no logged days, show an empty-state message and a button to open the Day screen for a useful date (today for the current period, otherwise the first date in the selected period).
- If the selected macro has no complete days, explain that its entries are incomplete; do not show a zero average.
- If the selected metric has no configured goals, still show intake bars in the neutral no-goal color and explain that status counts require a goal range.
- Repository failures must not be rendered as an empty history. Show a retry action and log the underlying error locally for debugging.

---

## 14. Accessibility and localization

- All user-facing strings must use the i18n system in English and Ukrainian.
- Preserve translation key parity.
- Date labels and full dates go through the i18n/date helpers.
- Every control has a localized accessibility label and role.
- The chart has an overall accessible summary.
- Selected-day details expose the exact value, unit, goal boundaries, completeness, and textual status.
- Do not rely on blue/yellow/red/brown alone.
- Touch targets outside the dense chart remain at least 44 dp.
- Support light and dark themes.
- Support system font scaling without clipping summary values or controls. Allow wrapping where required.

---

## 15. Testing requirements

Add focused unit tests for at least:

### Goal ranges

- Minimum-only, maximum-only, two-boundary, and disabled ranges.
- Negative/non-finite rejection.
- Minimum greater than maximum rejection.
- Equality at lower and upper boundaries is normal.
- Effective-dated goal selection.
- Same-day goal replacement.
- Migration of existing point targets to +/-10% ranges.

### Calendar periods

- Monday-Sunday week generation.
- Month lengths of 28, 29, 30, and 31 days.
- Year transitions.
- DST transitions using local noon behavior.
- Tab switching keeps the period containing the selected date.

### Daily aggregation and completeness

- Snapshot values and weights produce correct totals.
- Empty date differs from logged zero.
- One null macro makes that day's selected macro incomplete.
- Known partial macro sums are retained for bar height but not treated as complete.

### Classification

- Future and no-data precedence.
- Incomplete precedence over range comparisons.
- No-goal handling.
- Below, normal, and above behavior for one- and two-sided ranges.

### Period summaries

- Empty days are excluded rather than counted as zero.
- Today is shown in daily results but excluded from average/status/high-low calculations.
- Future days are excluded.
- Macro averages use complete days only.
- Status counts use assessed days only.
- Historical goal changes are applied per date.
- Average goal boundaries use only days where that boundary exists.
- Highest/lowest tie behavior is deterministic.

Keep existing tests green. Run:

```bash
npm test
npm run typecheck
```

Also manually verify on Android in portrait orientation:

- Current and historical weeks/months.
- February and a 31-day month.
- A mid-period goal change.
- All status colors in both themes.
- Month columns fit without horizontal scrolling.
- Popup selection near the first and last month columns.
- Opening the selected full Day screen.
- Large font scaling and screen-reader labels.
- Airplane-mode behavior.

---

## 16. Acceptance criteria

The phase is complete when all of the following are true:

1. Statistics is reachable from the drawer and works entirely offline.
2. Week and Month show correct calendar periods and navigate by whole periods.
3. The user can graph Calories, Protein, Carbohydrates, or Fat one at a time.
4. All seven week columns and all month columns fit on screen without horizontal scrolling.
5. Goal ranges are drawn using the historical settings that applied to each date.
6. Columns are blue within range, yellow below, red above, and brown for incomplete macro data.
7. No-data, no-goal, and future states are not falsely presented as normal.
8. Today is visible as "so far" but excluded from averages, status counts, and highest/lowest statistics.
9. Empty days are never treated as zero consumption.
10. Macro incompleteness is never treated as a complete total or used for adherence classification.
11. Tapping a date opens details and can navigate to the full Day screen for that date.
12. Average intake, average goal boundaries, logged coverage, status counts, and high/low information follow the definitions in this specification.
13. Goal Settings supports optional lower and upper boundaries for every nutrient and preserves historical effective dates.
14. The estimator applies its point suggestions as visible +/-10% ranges.
15. Existing goal history migrates without loss.
16. The compact Day summary renders the new range model correctly.
17. English/Ukrainian translations, accessibility, light/dark themes, tests, and type checking pass.

---

## 17. Agent implementation order

Implement in dependency order:

1. Add pure goal-range types, validation, formatting, and tests.
2. Add and test the goal-settings database migration and row mappers.
3. Update goal repository APIs and all current callers.
4. Update Goals Settings, estimator application, Day summary, and translations.
5. Add pure calendar-period and statistics calculations with tests.
6. Add the bounded statistics repository query.
7. Add Statistics navigation, screen state, summary, chart, and detail popup.
8. Add exact-date navigation from Statistics to Day.
9. Complete accessibility and theme tokens.
10. Run the full automated suite and perform Android manual checks.

Do not start by building the chart against the old point-goal model. The range migration and pure statistics contracts must be settled first so the UI does not encode temporary semantics.
