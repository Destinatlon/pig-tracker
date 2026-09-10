# Offline Android Calorie Tracker — Phase 1 Design & React Native Rules

## Purpose

This document defines the agreed Phase 1 UI/UX for the offline Android calorie tracker and the code-quality rules an AI coding agent should follow.

It complements the separate technical/data specification. Phase 1 is logging-first, compact, fully offline, and Android-focused. Analytics/charts remain Phase 2.

---

## 1. Design principles

- The Day screen is product-first, not dashboard-first.
- The product list should occupy most of the screen.
- Daily totals stay visible but compact.
- Manual food entry is the default add flow because it is often faster than searching.
- Prefer explicit Save/Discard behavior over hidden auto-save.
- Keep the visual style between utilitarian and modern: clean, compact, lightly rounded, polished, and not decorative.
- Avoid oversized fitness-dashboard cards, hero statistics, excessive whitespace, and unnecessary animation.
- All important actions must remain understandable without relying on color alone.

---

## 2. Theme

Default theme: `System`.

Settings options:

- System
- Light
- Dark

Use centralized semantic theme tokens rather than hard-coded colors throughout the app.

Suggested tokens:

- background
- surface
- textPrimary
- textSecondary
- divider
- accent
- warning
- danger
- disabled
- bulkEditBackground

---

## 3. Main navigation

Use a standard left-side hamburger drawer.

Phase 1 destinations:

- Day
- Products
- Settings

Phase 2 later adds:

- Analytics

The active drawer item should be subtly highlighted.

Do not use bottom navigation.

---

## 4. Day screen

### Structure

1. Top navigation/date area
2. Fixed daily summary
3. Scrollable product list
4. Floating `+` button

The summary should occupy roughly 10–15% of screen height. The list gets the rest.

### Date header

- Hamburger icon on far left.
- Date centered.
- Previous/next arrows around the date.
- Full format, e.g. `Thursday, 10 September`.
- Tap date → standard Android date picker.
- Swipe left/right on Day screen → next/previous day.
- Arrow buttons also move one day.

All dates, including past/future dates, are fully editable.

### Fixed daily summary

Numbers only. No progress bars or circular progress.

Example:

```text
1840 / 2500 kcal
P 142/180 · C 190/250 · F 61/80
```

Macro order in normal UI:

```text
P → C → F
```

If a macro target is disabled, keep consumed amount visible and use `—`:

```text
P 142/— · C 190/250 · F 61/—
```

If calories exceed the target, keep the layout the same but visually emphasize the consumed calorie number.

### Missing macro warning

Use both:

- `?`/warning on each affected macro
- a general warning indicator for the day

Tapping the general warning opens a small bottom sheet listing affected entries and missing fields.

Each affected entry has a small explicit `Edit` button.

---

## 5. Normal day-entry rows

Target row height: approximately 48–56 dp.

Example:

```text
Milk — Company A
250 g · 130 kcal · P 8 · C 12 · F 6
```

Missing macro example:

```text
Milk — Company A
250 g · 130 kcal · P 8 · C ? · F 6   ⚠
```

Behavior:

- Tap row → entry edit bottom sheet.
- Time is not shown in the row.
- Entry time may appear in the detail sheet.
- Swipe left → Delete.
- Swipe right → no action.
- Dedicated drag handle → reorder.

Duplicate-entry functionality is explicitly removed.

### Swipe delete

As the row moves left, reveal a clear trash icon.

Once the delete threshold is crossed:

- delete immediately
- show snackbar with `Undo`

Do not show a confirmation dialog for normal day-entry swipe deletion.

---

## 6. Floating Add button

Use a standard circular Android FAB in the bottom-right.

Tap:

```text
Open Add Product screen
```

Hold for about 2 seconds:

```text
Enter bulk edit mode
```

When bulk edit activates, provide short haptic feedback.

No visible hold-progress animation is required.

---

## 7. Empty day

Show useful quick actions:

```text
Nothing logged for this day

[ Add product ]
[ Copy another day ]
```

The FAB remains visible.

`Copy another day` should:

- suggest the previous calendar day initially
- allow choosing any source date
- use the standard Android date picker
- copy the entire source day
- not show per-entry selection before copying

---

## 8. Entry edit bottom sheet

Tap a day entry → open a bottom sheet.

It is editable immediately; there is no separate View/Edit mode.

Editable fields:

- Name / variant display name
- Weight
- kcal
- Protein
- Carbohydrates
- Fat

Use a fixed bottom action bar:

```text
[ Discard ]   [ Save ]
```

Do not auto-save.

If there are unsaved changes, tapping outside/back must not silently dismiss the editor. The user must Save or Discard.

Secondary actions live in `⋮`:

- Copy to date
- Delete

`Copy to date`:

1. Open Android date picker
2. Choose destination
3. Copy immediately using the entry snapshot

---

## 9. Bulk edit mode

Triggered by holding the Day FAB for ~2 seconds.

This is a full-day direct edit mode, not multi-select.

Distinguish the mode using a subtle tinted editable-area background. Do not replace the normal date header with a completely different screen title.

Conceptual row:

```text
Milk Company A      weight 70 g
kcal 334
P 18   C 12   F 6
```

Missing values:

```text
Milk Company A      weight 70 g
kcal 334
P 12   C 12   F ?
```

New blank row:

```text
?                   weight ? g
kcal ?
P ?   C ?   F ?
```

### Editing interaction

- Values look like compact text until tapped.
- Tap numeric value → inline input + numeric keyboard.
- Tap name → inline text input.
- Editable: name, weight, kcal, P, C, F.
- Negative numbers should not be accepted by the input UI.
- Optional P/C/F may remain missing.
- Weight and kcal are required for a valid consumed entry.

### Adding/deleting

A small Add Entry button stays fixed just above the bottom action bar.

Delete is available for rows.

No duplicate action.

### Draft behavior

Treat the whole bulk session as one draft.

Do not persist field-by-field.

Only `Save changes` commits.

`Discard` restores the pre-edit day.

Fixed bottom bar:

```text
[ Discard ]   [ Save changes ]
```

Both buttons have equal visual weight.

If Back is pressed with unsaved changes, show:

```text
Discard unsaved changes?
```

with options to stay or discard.

---

## 10. Add Product screen

Tap the normal Day FAB → full-screen Add Product page.

Use fixed tabs:

```text
Manual | Saved
```

Tabs remain visible while content scrolls.

Every time this screen opens, default to:

```text
Manual
```

Do not remember the previous tab.

---

## 11. Manual tab

Manual is the primary/default logging workflow.

Always show fields immediately in this order:

1. Name
2. Weight
3. kcal
4. Protein
5. Carbohydrates
6. Fat

Do not collapse optional macros.

Weight and kcal are required. P/C/F are optional.

Do not ask for category during manual day entry.

If the entered name matches a saved product, show a subtle suggestion underneath. The user may tap it to use the saved-product flow or ignore it.

Do not auto-fill saved macros into manual input.

Use a fixed bottom `Add` button.

After successful add, show snackbar:

```text
Added to today    [ Save as product ]
```

If ignored:

- the manual entry remains only in day history
- it does not become a reusable suggestion
- do not create hidden manual-history suggestions

If accepted, open Save as Product with normalized per-100-g values prefilled and editable.

---

## 12. Saved tab

Structure:

1. Search field
2. Horizontal category chips
3. Recently used
4. Matching products

Example chips:

```text
All · Dairy · Meat · Grains · Drinks · ...
```

Among relevant text matches, prioritize recently used products.

Selecting a category filters the visible saved library/search.

Tap saved product → small add bottom sheet.

The small sheet includes:

- product/variant
- blank weight input
- calculated kcal/macros
- Add action
- `Edit macros` link

Never prefill last-used weight.

If saved macros are missing, show `?` and allow adding immediately.

### Override macros

`Edit macros` expands the small sheet so the user can enter nutritional values for the consumed amount.

Add the day entry first.

Afterward, if values differed from the saved variant, show a lightweight prompt/snackbar offering to save those values as a new variant.

If accepted:

- calculate per-100-g values
- allow variant name editing
- allow correction of all calculated values

---

## 13. Products / food library screen

Use a search-first flat list.

Do not use category folders or visual grouping by base product.

Example rows:

```text
Milk — Company A
52 kcal · P 3.1 · C 4.7 · F 2.5

Milk — Company B
41 kcal · P 3.3 · C 4.8 · F 1.0

Chicken breast
110 kcal · P 23 · C 0 · F 2
```

Missing values display `?`.

The library values are per 100 g.

### Interaction

- Tap row → product/variant edit bottom sheet.
- No swipe delete on library rows.
- No row-level overflow menu.
- No permanent inline actions.

Use a standard FAB for creating a product.

---

## 14. Creating/editing products

Creating a product from Products screen:

- Product name
- Category
- kcal / 100 g
- Protein / 100 g
- Carbohydrates / 100 g
- Fat / 100 g

Create Product + hidden default variant in one form.

Do not first ask whether the product has variants.

Editing opens a bottom sheet and requires explicit Save.

Deleting a reusable product/variant requires confirmation.

Simple product delete copy:

```text
Delete this product and all its variants?
Historical day entries will remain.
```

Do not require typing the product name.

---

## 15. Variants

Support Add Variant:

- from the product edit sheet
- via a quick `+ variant` action where appropriate in the Products context

Add Variant uses a compact bottom sheet containing only:

- Variant name
- kcal / 100 g
- P / 100 g
- C / 100 g
- F / 100 g

Base product/category are inherited.

If a product has only a hidden default variant and the first named variant is added, keep the default variant. Do not convert it.

---

## 16. Categories

Categories are managed inside the Products screen.

No separate Categories screen.

Normal tap on category chip:

```text
Filter products
```

Long-press category chip:

```text
Open category management
```

Category management supports:

- Add
- Rename
- Delete
- Move up
- Move down

Use explicit Up/Down controls for ordering, not drag-and-drop.

---

## 17. Settings

Use tabs:

```text
Goals | Reminder | App
```

### Goals

Calories are always active.

P/C/F each have:

- enable/disable toggle
- numeric target

Disabled macro target still appears in daily summary as `/—`.

### Reminder

Only:

```text
Daily reminder [ON/OFF]
Time [21:00]
[Test notification]
```

No weekday selection.
No custom schedule per day.
No custom reminder text.

### App

Phase 1 only:

- Theme
- App version

---

## 18. Snackbar vs dialog rules

Use snackbars for lightweight reversible/follow-up actions:

- Day entry deleted → Undo
- Manual entry added → Save as product?

Use dialogs only for meaningful destructive/draft-loss actions:

- Delete reusable product/variant
- Discard unsaved bulk changes on Back

Avoid unnecessary confirmations.

---

## 19. Interaction map

```text
Tap Day row
→ edit bottom sheet

Swipe Day row left
→ delete + Undo

Drag Day-row handle
→ reorder

Tap Day FAB
→ Add Product full-screen

Hold Day FAB ~2 sec
→ bulk edit

Tap Products row
→ product/variant edit bottom sheet

Tap Products FAB
→ create product bottom sheet

Tap category chip
→ filter

Long-press category chip
→ category management

Tap date
→ Android date picker
```

---

## 20. Explicitly rejected UI behaviors

Do not implement unless requirements change:

- Duplicate day entry
- Swipe-right duplicate
- Meal grouping
- Notes
- Bottom navigation
- Full-screen entry editor
- Category folders
- Separate Categories screen
- Charts in Phase 1
- Progress bars/circles
- Last-used weight autofill
- Auto-save entry edits
- Auto-save product edits
- Category required for manual day entry
- Remembering unsaved manual items as suggestions
- Remembering last Add Product tab
- Custom calendar
- Advanced reminder scheduling

---

# 21. React Native coding rules for AI agents

These rules are based on current official React Native and React guidance.

Reviewed official references:

- React Native — Using TypeScript: https://reactnative.dev/docs/typescript
- React Native — FlatList: https://reactnative.dev/docs/flatlist
- React Native — Optimizing FlatList Configuration: https://reactnative.dev/docs/optimizing-flatlist-configuration
- React Native — Pressable: https://reactnative.dev/docs/pressable
- React Native — Improving User Experience: https://reactnative.dev/docs/improvingux
- React Native — View / accessibility APIs: https://reactnative.dev/docs/view
- React Native — Performance Overview: https://reactnative.dev/docs/performance
- React — Rules of React: https://react.dev/reference/rules
- React — Components and Hooks must be pure: https://react.dev/reference/rules/components-and-hooks-must-be-pure

Before using a version-specific API, verify behavior against the React Native version already installed in the project.

## 21.1 TypeScript first

Use `.ts` / `.tsx` for application code.

Define explicit domain/form types.

Avoid `any`; use `unknown` plus validation when a type is genuinely unknown.

Do not duplicate the same domain shape across multiple screens.

## 21.2 Pure components and hooks

Render code must be pure.

Never:

- write to SQLite during render
- schedule notifications during render
- mutate props/state
- modify global/module state during render
- cause navigation or other side effects during render

Put side effects in explicit event handlers or narrowly justified effects.

## 21.3 Immutable updates

Never mutate arrays/objects in React state directly.

Use immutable replacements (`map`, spread, etc.).

This is especially important for bulk-edit drafts.

## 21.4 Do not overuse `useEffect`

Do not use effects to derive state that can be calculated directly.

Prefer:

```text
Press Save
→ validate
→ repository write
→ update UI
```

over:

```text
field changes
→ effect
→ SQLite write
```

The agreed UX requires draft state and explicit Save.

## 21.5 Separate UI and persistence

Do not put large SQL queries inside screen components.

Use repositories/data-access functions.

Suggested flow:

```text
Screen
→ hook/application logic
→ repository
→ SQLite
```

Nutrition formulas should live in reusable helpers, e.g.:

- normalizeMacrosTo100g
- calculateConsumedMacros
- calculateDayTotals
- getMacroCompleteness

## 21.6 Use `FlatList` for growing lists

Use `FlatList` for:

- day entries
- product library results
- recent saved products
- other potentially large flat collections

Do not render large changing datasets by mapping everything inside a `ScrollView`.

## 21.7 Keep list rows light

Rows should contain minimal nesting and business logic.

Do not run DB queries from each row.

Good component candidates:

- DayEntryRow
- ProductLibraryRow
- IncompleteMacroRow

## 21.8 Stable keys

Use persisted IDs:

```tsx
keyExtractor={item => item.id}
```

Do not use array index as the normal key for reorderable/deletable lists.

## 21.9 Optimize deliberately

React Native recommends lightweight list items and provides list-specific optimizations.

Rules:

- Use `memo` for hot row components when profiling/actual rerenders justify it.
- Keep callbacks stable when it materially prevents row rerenders.
- Consider `getItemLayout` only if row height is truly fixed.
- Do not force fixed row height if text scaling/wrapping makes rows dynamic.
- Avoid adding `useMemo`, `useCallback`, and `memo` everywhere without evidence.

Readable, correct code comes first.

## 21.10 Measure performance in release builds

Development mode has substantial overhead.

Do not judge final interaction/list performance only in dev mode.

When performance matters, test an Android release build with realistic data volume.

## 21.11 Use `Pressable` for custom interactions

Prefer `Pressable` for:

- FAB
- category chips
- icon buttons
- custom row actions
- long-press behavior

For the bulk-edit FAB gesture, configure the long-press delay to approximately 2000 ms rather than relying on the default.

## 21.12 Touch targets

Interactive targets should be at least about 44×44 dp where feasible.

For visually small icons use padding and/or `hitSlop`.

Especially:

- drag handle
- hamburger
- date arrows
- warning Edit button
- overflow icon

Never make a tiny visual icon also have a tiny touch target.

## 21.13 Accessibility

Use meaningful:

- accessibilityLabel
- accessibilityRole
- accessibilityHint where needed

Examples:

```text
trash icon → "Delete entry"
drag handle → "Reorder entry"
warning icon → "Incomplete nutrition information"
date arrow → "Previous day" / "Next day"
```

Do not rely on icons or color alone.

## 21.14 Respect Android font scaling

Do not disable font scaling globally to preserve a compact screenshot.

Layouts must avoid clipping when text size increases.

Allow graceful row growth/wrapping where necessary.

## 21.15 Draft-based forms

Entry edit and bulk edit must use local draft state.

Flow:

```text
load persisted data
→ create draft
→ edit draft
→ validate
→ Save commits
→ Discard drops draft
```

Do not write SQLite on every keystroke.

## 21.16 Centralize numeric parsing

Use consistent helpers for numeric fields.

Rules:

- weight > 0
- kcal required
- optional P/C/F may be null
- negative numbers are not allowed
- empty optional field maps to `null`, never `0`
- decimals supported
- display rounding must not destroy persisted precision

Avoid duplicating ad hoc parsing in every screen.

## 21.17 Clear nutrition naming

Use names that encode units/context:

- caloriesPer100g
- proteinPer100g
- weightGrams
- consumedCalories
- consumedProtein

Avoid ambiguous names like `value`, `amount`, or `calories` where the unit/context is unclear.

## 21.18 Keep formulas outside JSX

Do not repeat nutrition formulas inline in multiple components.

Calculate via shared helpers and render the result.

## 21.19 Avoid unnecessary global state

Do not add Redux just because the app has multiple screens.

Prefer:

- local component state
- screen hooks
- small context where truly global
- SQLite as persistent source of truth

Add a larger state library only for a concrete need.

## 21.20 Keep styling semantic

Use `StyleSheet.create` and centralized theme/spacing/typography tokens.

Create reusable primitives only where repetition justifies them.

Do not build an elaborate design-system framework for a small app.

## 21.21 Keep files focused

Avoid giant screen files containing SQL, calculations, notification scheduling, form validation, and many unrelated components together.

A reasonable structure could be:

```text
src/
  screens/
    day/
    products/
    settings/
  components/
  db/
    migrations/
    repositories/
  domain/
    nutrition/
    models/
  notifications/
  navigation/
  theme/
  utils/
```

If an existing project structure already exists, follow it instead of reorganizing purely to match this example.

## 21.22 Offline-first rule

No normal UI behavior may depend on:

- remote APIs
- remote images/fonts
- remote config
- cloud database
- remote analytics
- network food database

The app must remain fully usable in airplane mode.

## 21.23 Safe async writes

For writes:

```text
Tap Save/Add
→ prevent duplicate submission
→ validate
→ perform repository write/transaction
→ update UI only after success
```

Do not close an editor before confirming persistence succeeded.

Guard write buttons against double taps.

## 21.24 Restrained animation

Animation should communicate state, not decorate.

Appropriate:

- bottom sheet
- drawer
- swipe action reveal
- snackbar
- row reorder movement

Avoid decorative counters, pulsing buttons, or unnecessary entrance animations.

---

## 22. AI-agent completion checklist

Before marking a feature complete, verify:

1. It matches this interaction specification.
2. It works without internet.
3. It works in Light and Dark themes.
4. Android Back behavior is correct.
5. Save/Discard semantics are preserved.
6. Missing macros remain nullable and visibly missing.
7. Small icons still have usable touch areas.
8. Interactive icons have accessibility labels/roles.
9. Growing lists use a virtualized list.
10. Historical snapshot rules from the technical spec remain intact.
11. Duplicate functionality has not been reintroduced.
12. No unnecessary backend/global state/dependency has been added.
13. Existing project conventions were checked before changing architecture.
14. Performance complaints are verified in a release build where relevant.

---

## 23. Phase 1 screen inventory

```text
Drawer
├── Day
│   ├── Fixed summary
│   ├── Product list
│   ├── Entry edit bottom sheet
│   ├── Incomplete-macro bottom sheet
│   ├── Bulk edit mode
│   ├── Android date picker
│   └── Add Product
│       ├── Manual tab
│       ├── Saved tab
│       └── Saved-product add bottom sheet
│
├── Products
│   ├── Search
│   ├── Category chips
│   ├── Flat product/variant list
│   ├── Product create/edit bottom sheet
│   ├── Variant create/edit bottom sheet
│   └── Category management
│
└── Settings
    ├── Goals tab
    ├── Reminder tab
    └── App tab
```

---

## 24. Phase 2 boundary

Charts/analytics remain Phase 2.

Likely future destination:

```text
Analytics
```

with:

```text
Day
Week
Month
```

Do not reserve major Phase 1 UI space for analytics and do not redesign the Day screen around future charts.

The Day screen remains logging-first.
