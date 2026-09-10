# Offline Android Calorie Tracker — Phase 1 Technical Specification

## 1. Purpose

Build a simple Android calorie-tracking application focused on fast, fully offline food logging.

The application must work without authentication, backend services, or internet access. All user data is stored locally on the device using SQLite.

This document defines the agreed Phase 1 technical behavior and data model. Detailed visual/UI design is intentionally out of scope for now and will be designed separately.

---

## 2. Core Technology and Architecture

Recommended stack:

- React Native
- Android as the initial target platform
- SQLite as the local persistent database
- Local Android notifications
- No backend
- No authentication
- No cloud sync
- No internet dependency
- No Redux unless implementation complexity later proves it necessary

Suggested application layering:

```text
UI / Screens
    ↓
Hooks / Application Logic
    ↓
Services / Repositories
    ↓
SQLite
```

SQLite is the source of truth.

Use database migrations from the beginning so future schema changes can be introduced safely.

---

## 3. Core Product Concept

The application tracks foods consumed on individual calendar dates.

Users maintain a reusable local food library consisting of:

- Categories
- Products
- Product variants

A product is the generic food concept.

Example:

```text
Milk
```

Variants represent specific versions of that product:

```text
Milk
├── Company A 2.5%
├── Company B 1%
└── Company C Lactose Free
```

Each variant has its own nutritional values.

Products that do not meaningfully need variants, such as banana, rice, or chicken breast, should internally have a default variant. The UI should hide the concept of the "default variant" from the user.

Example:

```text
Chicken breast
110 kcal / 100 g
```

Internally:

```text
Product: Chicken breast
Variant: Default
```

---

## 4. Units

Phase 1 supports only grams.

All reusable nutritional values are normalized to values per 100 grams.

Do not add ounces, portions, cups, milliliters, servings, or other units in Phase 1.

Weight may contain decimal values.

Example:

```text
127.5 g
```

---

## 5. Nutritional Fields

Every reusable food variant contains:

- Calories per 100 g — required
- Protein per 100 g — optional
- Carbohydrates per 100 g — optional
- Fat per 100 g — optional

Calories are always mandatory.

Protein, carbohydrates, and fat may be unknown.

Missing nutritional information must be stored as `NULL`, not `0`.

This distinction is important:

```text
fat = 0
```

means the food is known to contain zero fat.

```text
fat = NULL
```

means the fat value is unknown.

---

## 6. SQLite Data Model

Exact naming may be adjusted to project conventions, but preserve the semantics below.

### categories

```text
id
name
sort_order
created_at
updated_at
```

Requirements:

- Categories are user-editable.
- Users can create categories.
- Users can rename categories.
- Users can reorder categories.
- Users can delete categories.
- Keep an internal `Uncategorized` category.
- Deleting a category must not delete its products.
- Products from a deleted category should be moved to `Uncategorized` or another user-selected category.

---

### products

```text
id
category_id
name
created_at
updated_at
```

A product represents the generic food concept.

Example:

```text
Milk
Chicken breast
Rice
Yogurt
```

---

### product_variants

```text
id
product_id
name
is_default

calories_per_100g
protein_per_100g NULL
carbs_per_100g NULL
fat_per_100g NULL

created_at
updated_at
```

Requirements:

- `calories_per_100g` is required.
- Other macros are nullable.
- Products without meaningful variants receive an internal default variant.
- Default variants should normally be hidden from the UI.

---

### day_entries

```text
id
date

product_id NULL
variant_id NULL

product_name
variant_name NULL

weight_grams

calories_per_100g
protein_per_100g NULL
carbs_per_100g NULL
fat_per_100g NULL

created_at
updated_at
```

`day_entries` are historical snapshots.

The entry stores both:

1. Optional references to the reusable product/variant.
2. A complete snapshot of the name and nutritional values used when the entry was created.

This is critical.

Changing or deleting a reusable product or variant in the future must not modify historical days.

Example:

On September 10:

```text
Milk Company A
52 kcal / 100 g
```

If the user later changes that reusable variant to:

```text
55 kcal / 100 g
```

the September 10 entry must remain based on 52 kcal / 100 g.

Therefore calculations for existing day entries must always use the snapshot stored on the day entry.

---

### goal_settings

Recommended structure:

```text
id

calories
protein NULL
carbs NULL
fat NULL

effective_from
created_at
```

Daily targets are configurable through settings.

Calories are the primary target.

Macro targets are optional.

Goals should be historical rather than one mutable global value.

Example:

```text
September target: 2500 kcal
October target: 2200 kcal
```

Looking back at September should still show the September target.

Changing today's goal should not rewrite historical target comparisons.

---

### settings

A simple key/value table is sufficient for miscellaneous application settings.

Example:

```text
key
value
```

Possible settings include:

- daily reminder enabled
- daily reminder time

Do not store goal history here if `goal_settings` is used.

---

## 7. Day Model

There is no meal grouping in Phase 1.

Do not add:

- Breakfast
- Lunch
- Dinner
- Snacks

A day is simply a list of consumed products.

The same product may appear multiple times on the same day and each occurrence remains a separate entry.

Example:

```text
Milk — 100 g
Milk — 200 g
```

These should remain two separate `day_entries`.

Do not automatically merge them.

---

## 8. Date Management

Every calendar date must be fully editable.

Today is only the default date shown when the application opens.

Users must be able to:

- Navigate to previous dates
- Navigate to future dates
- Select any date through a calendar
- Add entries to any date
- Edit entries on any date
- Delete entries on any date
- Duplicate entries
- Copy entries to another date
- Copy an entire day to another date
- Clear a day

There should be no immutable historical dates.

---

## 9. Adding a Saved Product

When a reusable product or variant is selected, the application knows its macros per 100 g.

User enters weight in grams.

Example reusable variant:

```text
Milk Company A

Per 100 g:
Calories: 52
Protein: 3.1
Carbs: 4.7
Fat: 2.5
```

User enters:

```text
250 g
```

Calculated consumed values:

```text
Calories: 130
Protein: 7.75
Carbs: 11.75
Fat: 6.25
```

General formula:

```text
consumedValue = valuePer100g * weightGrams / 100
```

Do calculations with full available precision.

Round values only for display where appropriate.

Avoid repeatedly rounding stored nutritional data.

---

## 10. Manual Macro Override for a Day Entry

A user may select an existing product but consume a different version of it without wanting to create another reusable variant.

Example:

The reusable product is:

```text
Milk → Company A
```

But today the user has another milk.

They may use the existing product as a starting point and manually enter the nutritional values for the amount actually consumed.

Important decision:

Manual values are entered **for the consumed amount**, not per 100 g.

Example:

```text
Weight: 60 g

Calories: 38
Protein: 2
Carbs: 2.8
Fat: 1.9
```

The application normalizes these values internally to per-100-g values for the day entry:

```text
caloriesPer100g = 38 / 60 * 100
proteinPer100g  = 2 / 60 * 100
carbsPer100g    = 2.8 / 60 * 100
fatPer100g      = 1.9 / 60 * 100
```

This normalized snapshot allows later weight edits.

If the user changes:

```text
60 g → 120 g
```

the consumed values should become approximately:

```text
Calories: 76
Protein: 4
Carbs: 5.6
Fat: 3.8
```

The reusable source variant must remain unchanged.

---

## 11. Editing an Existing Day Entry

If a day entry uses saved or manually normalized per-100-g values, changing its weight must automatically recalculate its consumed nutritional totals.

Example:

```text
100 g
52 kcal
```

changed to:

```text
200 g
```

becomes:

```text
104 kcal
```

If the nutritional values on that specific day entry were previously overridden manually, use the overridden snapshot values as the basis of recalculation.

Do not re-fetch current product variant values when editing an old day entry.

---

## 12. Unknown / Unsaved Products

Users must be able to log a product even if it does not exist in the reusable food database.

Example:

```text
Random pizza
Weight: 350 g
Calories: 800
Protein: NULL
Carbs: NULL
Fat: NULL
```

This creates a `day_entry` with:

```text
product_id = NULL
variant_id = NULL
```

but still stores:

```text
product_name
weight_grams
normalized nutritional snapshot
```

The entry is valid because calories are known.

The user should then be offered an optional action to save this item for future reuse.

Do not force users to build the reusable library before logging food.

Fast logging is more important than library organization.

---

## 13. Saving a Manual Entry as a Reusable Product or Variant

After a manually entered food is added, the application may suggest:

```text
Save this food for future use?
```

There are two likely cases.

### New product

If no matching reusable product exists:

- Create a new `Product`.
- Create its default `ProductVariant`.

### New variant of an existing product

If the user used an existing product but manually changed nutritional values:

- Offer `Save as new variant`.
- Automatically calculate the per-100-g macros from the entered weight and macros.
- Allow the user to change the new variant name in the same flow.
- Allow the user to edit/correct the calculated per-100-g values before saving.

Example:

User entered:

```text
Milk
60 g

38 kcal
2 g protein
2.8 g carbs
1.9 g fat
```

Proposed reusable variant:

```text
Product:
Milk

Variant name:
[ editable ]

Per 100 g:
Calories: 63.33
Protein: 3.33
Carbs: 4.67
Fat: 3.17
```

All calculated values must remain editable before the variant is saved.

Use a database transaction when creating a product and default variant together.

Either all related records are successfully created or none are.

---

## 14. Missing Macros and Daily Results

Daily calories can always be calculated because every entry requires calories.

Protein, carbohydrate, and fat totals may be incomplete.

Example:

```text
Chocolate
Calories: known
Protein: NULL
Carbs: NULL
Fat: 12
```

The app should sum all known values.

Do not substitute missing values with zero.

If any day entry is missing a macro, notify the user that the displayed total for that macro is incomplete.

Possible display semantics:

```text
Protein: 135 g ⚠
Carbs: 210 g ⚠
Fat: 70 g
```

or technically more explicit:

```text
Protein: ≥135 g
Carbs: ≥210 g
Fat: 70 g
```

Exact visual treatment will be decided during the design phase.

Users should be able to understand which entries are responsible for incomplete macro data.

Example:

```text
Protein data missing from:
- Chocolate
- Restaurant pizza
```

---

## 15. Daily Goals

Goals are configurable from Settings.

Potential fields:

```text
Calories
Protein
Carbohydrates
Fat
```

Recommended behavior:

- Calories target is supported.
- Protein target is optional.
- Carbohydrate target is optional.
- Fat target is optional.
- Historical target changes are preserved using `effective_from`.

The daily screen can calculate:

```text
consumed calories
target calories
remaining calories
```

and corresponding macro target progress when targets exist.

---

## 16. Categories and Search

Categories exist primarily to make the reusable food library easier to browse and search.

Users can:

- Create categories
- Rename categories
- Reorder categories
- Delete categories

Initial default categories may be seeded, but none except internal `Uncategorized` should be treated as permanent.

Example defaults:

```text
Dairy
Meat
Fish
Grains
Vegetables
Fruit
Drinks
Snacks
Other
```

Search should remain simple in Phase 1.

SQLite search over product and variant names is sufficient.

Example concept:

```sql
WHERE product.name LIKE ?
   OR variant.name LIKE ?
```

Do not introduce full-text search, remote search infrastructure, Elasticsearch, or similar systems for Phase 1.

---

## 17. Recently Used Foods

Provide recently used products/variants to reduce repetitive searching.

A separate table is not required initially.

Recent foods may be derived from `day_entries`, for example by grouping reusable product/variant references and ordering by latest use.

Conceptually:

```text
GROUP BY product / variant
ORDER BY MAX(created_at) DESC
LIMIT N
```

Choose a small sensible limit such as 10.

Be careful with manually logged entries that have no reusable product reference.

---

## 18. Duplicate and Copy Behavior

### Duplicate entry

`Duplicate` creates a new independent `day_entry` on the same date using exactly the same snapshot values.

Do not merge it with the existing entry.

---

### Copy entry to another date

Create a new `day_entry` with:

- Same product/variant references where still applicable
- Same snapshot names
- Same weight
- Same nutritional snapshot
- New selected date
- New record ID/timestamps

Do not recalculate the copied entry from the current reusable product database.

---

### Copy entire day

Users can copy all entries from one date to another.

If the destination already contains entries, support at least:

- Add copied entries
- Replace existing entries

Default to **Add copied entries** because it is less destructive.

For replace behavior, delete destination entries and insert copied entries in a transaction.

---

## 19. Delete Semantics

Historical data must be protected from reusable-library maintenance.

Required behavior:

```text
Delete category
→ do not delete products
→ move products to Uncategorized or selected category

Delete product
→ reusable variants may be deleted
→ historical day entries remain untouched

Delete variant
→ historical day entries remain untouched
```

Do not configure cascading deletes that can remove historical day entries when products or variants are deleted.

References from `day_entries` may become null or point to deleted reusable records depending on schema strategy, but snapshot data must remain sufficient to render and calculate the entry.

Prefer safe foreign-key behavior such as `ON DELETE SET NULL` for historical references where appropriate.

---

## 20. Notifications

Phase 1 contains one local daily reminder.

No remote notification service is needed.

Settings:

```text
Daily reminder: enabled / disabled
Reminder time
Test notification
```

Requirements:

- User can enable/disable the reminder.
- User can select the reminder time.
- Notification is scheduled locally on Android.
- User can trigger a test notification immediately from Settings.
- No internet connection is required.
- No custom notification text is needed in Phase 1.

A simple message is enough, for example:

```text
Don't forget to finish today's food log.
```

Conditional reminders such as "only remind me if no food was logged" are out of scope for Phase 1.

---

## 21. Transactions

Use SQLite transactions for operations involving multiple related mutations.

Examples:

- Creating a product and its default variant
- Copying/replacing an entire day
- Moving products when a category is deleted
- Any future multi-table operation where a partial write would create invalid state

Avoid unnecessary transaction complexity for isolated single-row updates.

---

## 22. Numeric Handling

SQLite `REAL` values are acceptable for weight and nutritional values for this application.

Requirements:

- Preserve sufficient internal precision.
- Do not round normalized per-100-g values prematurely.
- Round values for UI display only.
- Calories may be displayed as whole numbers if the design chooses.
- Macros may typically be displayed to one decimal place.
- Weight may support decimal grams.

Handle invalid input such as:

- Negative weights
- Zero weight when normalization is required
- Negative nutritional values
- Empty calories

Calories must be present and non-negative.

Weight must be greater than zero for consumed entries.

---

## 23. Offline Requirement

Every Phase 1 feature must work with airplane mode enabled.

Do not make normal application behavior depend on:

- Remote APIs
- Authentication providers
- Cloud databases
- Internet-based food databases
- Analytics services
- Remote notification services

Internet integrations may be considered in later phases but must not be necessary to use the app.

---

## 24. Explicit Phase 1 Scope

Phase 1 includes:

- Fully offline Android app
- SQLite persistence
- Categories
- Products
- Product variants
- Hidden default variants
- Calories/macros per 100 g
- Calories required
- Optional protein/carbs/fat
- Grams only
- Day-based logging
- Any calendar date editable
- Separate repeated entries
- Saved-food logging
- Manual food logging
- Manual macros entered for consumed amount
- Normalization to per-100-g values internally
- Day-specific macro overrides
- Save manual item as reusable product
- Save overridden item as new variant
- Editable auto-calculated variant values
- Historical nutritional snapshots
- Daily targets managed through Settings
- Historical target changes
- Missing-macro warnings
- Search
- Categories for faster browsing
- Recently used foods
- Duplicate entry
- Copy entry to another date
- Copy entire day
- Local daily reminder
- Configurable reminder time
- Immediate test-notification button
- SQLite migrations

---

## 25. Explicitly Out of Scope for Phase 1

Do not implement these unless the project owner explicitly moves them into scope:

- Backend
- User accounts
- Authentication
- Cloud synchronization
- Social features
- Web application
- Internet food APIs
- Barcode scanning
- OCR
- Meal grouping
- Notes on day entries
- Multiple measurement units
- Portion/serving system
- Recipe system
- Favorites
- Remote push notifications
- Conditional reminder logic
- Advanced search infrastructure
- Backup/restore
- Export/import
- Charts or analytics
- Day/week/month diagrams
- Weight/bodyweight tracking

Avoid adding speculative functionality because it appears common in other calorie-tracking apps.

---

## 26. Phase 2

Phase 2 will introduce statistics and charts.

Planned views:

```text
Day
Week
Month
```

Likely metrics:

- Calories by date
- Protein by date
- Carbohydrates by date
- Fat by date
- Average calories
- Average protein
- Average carbohydrates
- Average fat
- Goal adherence
- Possibly highest/lowest intake days

The Phase 1 schema should preserve enough historical snapshot and target information so these features can be added without redesigning core storage.

Do not implement Phase 2 charts during Phase 1.

---

## 27. Likely Future Infrastructure Feature

Because the application stores all data locally, uninstalling the app or losing the device may remove the user's history.

Backup/export/import is intentionally outside Phase 1, but it is a strong candidate for an early future feature before introducing accounts or cloud synchronization.

Do not silently add cloud services to solve this.

---

## 28. AI Agent Implementation Rules

Before implementing a feature:

1. Inspect the current project structure and existing implementation.
2. Compare the requested feature with what already exists.
3. Reuse existing architecture, conventions, libraries, components, database helpers, and patterns where they are reasonable.
4. Do not blindly rewrite working code simply to match examples from this specification.
5. If the current implementation conflicts with a requirement in this specification, identify the conflict before making large structural changes.
6. Prefer the smallest change that satisfies the agreed behavior.
7. Keep Phase 1 offline-first.
8. Do not introduce a backend or remote dependency without explicit approval.
9. Do not add unrelated features.
10. Preserve historical day-entry snapshots.
11. Never treat unknown macros as zero.
12. Never allow reusable product edits/deletes to rewrite historical nutrition logs.
13. Use migrations for database schema changes.
14. Use transactions where multiple related writes must succeed atomically.
15. Keep UI-specific assumptions minimal until the separate design specification is provided.

The agent may ask the project owner questions when:

- Existing project behavior conflicts with this specification.
- Two implementation options have meaningful architectural tradeoffs.
- A requirement cannot be satisfied reliably with the current dependencies.
- A decision would substantially affect future migrations or data compatibility.
- The design specification is required to resolve a UI-specific choice.

Do not ask questions for trivial naming or implementation choices that can safely follow existing project conventions.

---

## 29. Acceptance-Level Behavioral Examples

### Example A — Saved product

Stored:

```text
Chicken breast
110 kcal / 100 g
23 g protein / 100 g
0 g carbs / 100 g
2 g fat / 100 g
```

Logged:

```text
500 g
```

Result:

```text
550 kcal
115 g protein
0 g carbs
10 g fat
```

The day entry stores the nutritional snapshot used at creation.

---

### Example B — Manual override of known product

Existing reusable variant:

```text
Milk Company A
52 kcal / 100 g
```

Today the user consumes another milk but does not want to create a variant yet.

Entered:

```text
60 g
38 kcal
2 g protein
2.8 g carbs
1.9 g fat
```

Day entry is created using normalized snapshot values.

Existing `Milk Company A` variant is not modified.

User may optionally choose:

```text
Save as new variant
```

The app calculates per-100-g values and allows the user to edit both the variant name and calculated macros before saving.

---

### Example C — Missing macros

Logged:

```text
Restaurant pizza
350 g
800 kcal
Protein: unknown
Carbs: unknown
Fat: unknown
```

The entry is valid.

Daily calories include the 800 kcal.

Daily protein/carbs/fat totals show that their data is incomplete.

Unknown values are not counted as zero.

---

### Example D — Historical safety

September 10 entry snapshot:

```text
Milk
52 kcal / 100 g
```

Reusable Milk variant is later edited to:

```text
55 kcal / 100 g
```

September 10 must still calculate using 52 kcal / 100 g.

---

### Example E — Copying

September 9 contains:

```text
Milk
250 g
130 kcal
```

The reusable milk variant has since changed.

Copying the September 9 entry to September 10 copies the historical snapshot that produced 130 kcal.

It does not rebuild the entry from current reusable food data.

---

## 30. Current Status

The Phase 1 technical model is considered sufficiently defined to proceed to UI/UX design.

The next specification should define the visual and interaction design screen by screen, starting with the main Day screen.

