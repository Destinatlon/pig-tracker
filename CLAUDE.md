# Pig Tracker — offline Android calorie tracker (Phase 1 + recipes)

Specs: `docs/phase1-data-and-behaviour.md` (data/behaviour) and
`docs/phase1-design.md` (UI/UX + RN coding rules). Read both before changing behaviour.
`docs/phase2-statistics.md` covers the Statistics screen and goal ranges; for that work it
overrides the Phase 1 "charts and analytics are out of scope" statements.
The recipe system is listed as out of scope in the Phase 1 spec; the project owner has since moved it into scope,
so the spec's section 25 no longer applies to it. Everything else in that list still does.

## Stack
- Expo SDK 57 / React Native 0.86, TypeScript strict, no Redux.
- SQLite via `expo-sqlite` (`src/db`), versioned migrations in `src/db/migrations` (append, never edit shipped ones).
- Local notifications via `expo-notifications`; navigation via React Navigation drawer + native stack.
- Bottom sheets and snackbars are small in-house components (`src/components`), not third-party.

## Layout
```
src/domain      models, nutrition math (calculations/draft/format), numeric parsing, dates, goals/ (Mifflin–St Jeor estimator + tunable constants, goal-range validation, effective-dated lookup), recipes/ (totals + editor draft), statistics/ (calendar periods, classification, period summaries), weight/ (body-weight trend) — pure, unit-tested
src/db          database.ts (connection + migrations), repositories/* (all SQL lives here), seed/ (preset product list)
src/screens     day/, add/, products/, recipes/, statistics/, settings/ — screens own drafts, call repositories on explicit Save
src/components  shared primitives (Button, TextField/NumberField, BottomSheet, Snackbar, Chip, Fab, ...)
src/theme       semantic colour tokens + ThemeProvider (system/light/dark)
src/i18n        en.ts (source of truth) + uk.ts dictionaries, I18nProvider/useI18n, plural rules; a test enforces key parity
src/notifications  daily log + weekly weighing reminder scheduling
```

## Non-negotiable rules
- Day entries are historical snapshots; never recompute them from the library. Library edits/deletes must not touch them.
- Unknown macros are `null`, never `0`. Totals sum known values and flag incompleteness.
- Values typed by users are for the consumed amount; normalize to per-100 g via the draft `basis` (`src/domain/nutrition/draft.ts`) so repeated weight edits do not accumulate rounding.
- Explicit Save/Discard; no auto-save, no duplicate-entry action, no meal grouping, no bottom navigation.
- Everything must work in airplane mode.
- Goal estimation is a suggestion only: constants live in `src/domain/goals/constants.ts`, formulas in `estimation.ts`, never in screens; results keep full precision and are rounded only for display. Applying an estimate goes through `saveGoalEffectiveFrom(today)` like a manual save. Never word it as guaranteed or medically exact.
- Goals are ranges (`GoalRange`: optional `minimum`/`maximum`), not point targets. Equality with a boundary is within range. A statistic for a date uses the goal row in force on that date — never today's goal applied retroactively.
- Every goal is a single number. Calories are one required daily target (`GoalSettings.calories: number`) — storage never holds a calorie range. A macro goal is one value plus a `GoalBound` direction (`no less than` / `no more than`): one field and a radio pair, never two fields; a macro with both boundaries `null` is disabled.
- The ±10% tolerance around the calorie target exists **only** in statistics, in `goalRangeFor` — it is how a day is coloured, never something stored or re-applied on save. A macro is compared against its one boundary exactly as entered, with no tolerance.
- Statistics are derived, never stored: no cached aggregate tables. Empty days are missing data, not zero intake; today is charted but excluded from averages, status counts and highest/lowest; a macro day with any unknown entry is `incomplete` and is never classified as adherence.
- The chart's value axis uses fixed gridlines (`CALORIE_AXIS` 1500–4000 by 500, `MACRO_AXIS` 50–500 by 50) so the same intake sits at the same height in every period; `chartScaleMax` rounds up to one of them.
- Body weight is history in its own dated table (`body_weights`, one measurement per date), never the estimation profile's `weightKg`, which is configuration. Statistics show start/end/change for the period and, for a month, one averaged point per week; a week without a weighing is left out, not interpolated.
- Recipes are a library concept, not a day concept. A recipe's ingredients are snapshots like day entries; the
  product link is kept only so the user can explicitly refresh one. Per-100-g values assume an evenly mixed dish
  and must always be presented as approximate. A macro any ingredient leaves unknown stays `null` for the whole
  recipe — never a partial sum passed off as complete. Logging a recipe writes an ordinary `day_entries` snapshot.
- Free-text search matches word by word, in any order, via `src/domain/search.ts` — not in SQL. SQLite's `LIKE` only folds ASCII case, so it would match `капуста` inside "Квашена капуста" but miss "Капуста білокачанна"; matching in JS gets Unicode case folding and any-order terms for free. Repositories still do the bounded fetching and the exact filters (category, ids).
- No hard-coded user-facing strings: add a key to `src/i18n/en.ts` and `uk.ts`, use `t('key')` (or `tn` for plurals). Validation returns error codes; `fieldError(label, code)` renders them. Dates go through `longDate`/`shortDate`/`relativeDate` from `useI18n`.

## Commands
- `npm test` — jest (domain logic), `npm run typecheck` — tsc.
- `npm run android` — debug build on a connected device/emulator (needs Metro). `npm run android:release` — release build for offline device testing.
- `android/` is generated by `expo prebuild` and git-ignored; regenerate after changing `app.json`.
