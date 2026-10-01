# Browser verification report — spec 001 (Employee Salary Management)

- Date: 2026-10-01
- Mode: first-pass (re-run after the `browser-verifier` subagent's tool access failed to load; the orchestrating session had `chrome-devtools-mcp` reachable via `ToolSearch` and drove the app directly)
- Base URL(s): frontend `http://localhost:5173`, backend `http://localhost:3001` (both dev servers started for this pass; `localhost`, not `127.0.0.1`, to match the backend's CORS allow-list default)
- Provider: `chrome-devtools-mcp`
- Database: the real dev `storage/development.sqlite3`, seeded with the full 10,000 employees (plus transient test records created and cleaned up during this pass)

## Outcome

Every slice's primary flow was driven live in a real browser against the running app and the real seeded dataset. **One real defect was found and fixed during this pass** (see below); everything else held up. No console errors were observed at any point beyond one benign Chrome autofill advisory (`An element doesn't have an autocomplete attribute`), which is not a WCAG violation and not actionable.

## Defect found and fixed during this pass

**`GET/POST/PATCH /api/employees(/:id)` omitted `email` from the response body**, even though AC 5.3.1 requires "the full employee record" and the detail drawer explicitly displays an Email row. Root cause: `EmployeesController::EMPLOYEE_FIELDS` (correctly scoped to exclude `email` for the *index* response per spec §5.1's lexicon) was also reused for `show`/`create`/`update`, which need the full record. The existing `employees_show_test.rb` had asserted the field list matching this buggy output instead of the AC's actual text, so the test suite was green despite the defect — only live browser interaction surfaced it (the drawer's Email row rendered as an empty label).

Fixed: added `EmployeesController::EMPLOYEE_DETAIL_FIELDS` (`EMPLOYEE_FIELDS + [:email]`) for `show`/`create`/`update`; strengthened all three endpoints' tests to assert `email` is present and correct. Re-verified live after the fix — the Email row now renders correctly in the detail drawer, create form, and edit form. Commit `40359b3`.

## Per-slice results

### Slice 5.1 — Browse the paginated employee directory — PASS
- Table loaded 25 rows from the real 10,000-row dataset; pagination read "Page 1 of 400" initially (10,000 ÷ 25).
- Column sort buttons present (Name, Department, Country, Salary, Hire Date); Job Title correctly has no sort control (not in `ALLOWED_SORT_COLUMNS`).
- No console errors on load.

### Slice 5.2 — Filter and search the employee directory — PASS
- Country/Department/Job title selects, min/max salary, and free-text search all rendered with correct options sourced from the backend's allow-lists.
- Searching `verification.tester` correctly narrowed to exactly the one matching record (1 of 1 pages), and clearing the search param returned to the full list.
- No console errors.

### Slice 5.3 — View an employee's full record — PASS (after the email fix above)
- Clicking a row's "View details for \<name\>" button (the row-semantics fix from the review pass) opened the Sheet drawer with dialog accessible name = the employee's full name.
- **Focus trap confirmed via actual keyboard interaction**: Shift+Tab from the focused "Close" button correctly cycled to "Remove" then "Edit" inside the dialog — the trap holds.
- Before the fix: Email row rendered with the "Email" label but no value. After the fix: value renders correctly (e.g. `denver.abbott.648@acme.example`).
- Closing and reopening preserved table state underneath.

### Slice 5.4 — Add a new employee — PASS
- Submitting the empty form surfaced **both** the inline per-field errors and the new error-summary region (`role="alert"`, `aria-live="assertive"`) listing every invalid field by label — confirmed the review-pass accessibility fix works as intended, not just in source.
- Submitted a complete valid record (Verification Tester, Software Engineer, Engineering, USA, hired 2024-06-15, $90,000 USD) — pagination advanced from "400" to "401" pages (10,001 rows) with no page reload, confirming TanStack Query cache invalidation.
- Searching for the new record immediately after confirmed it existed with every field correct, including the email and hire date.

### Slice 5.5 — Edit an employee's profile and salary — PASS
- Edited Denver Abbott's salary from 78436.0 to 85000.0 via the edit form (pre-filled correctly, including email).
- After save, both the drawer and the underlying directory row reflected 85000.0 USD — server-saved value, not an optimistic guess, confirming AC 5.5.3.

### Slice 5.6 — Remove an employee record — PASS
- "Remove" opened an `AlertDialog` with an accessible name ("Remove employee") and a description naming the employee ("Are you sure you want to remove Denver Abbott? This action cannot be undone.").
- **Cancel path verified**: clicking Cancel returned to the detail view with the employee untouched (confirmed salary still showed the edited 85000.0, i.e. no accidental mutation).
- **Confirm path verified**: removed the test "Verification Tester" record; the search view immediately updated to "No employees match the current view" with 0 pages — no manual refresh needed.

### Slice 5.7 — View org-wide pay insights — PASS
- Per-country stat tiles rendered headcount and **per-currency** payroll cost (e.g. AUS: 601 headcount, with separate AUD/BRL/CAD/EUR/GBP/JPY/SGD cost lines) — multi-currency-per-country correctly never blended into one number, confirming invariant 4.5 live.
- Group-by selector present (Country/Department/Job title); the breakdown table rendered one row per (group, currency) pair with headcount, total payroll cost, min/avg/median/max salary.
- The "Amounts shown as paid, not currency-converted." disclosure text is visibly present above the table.
- Spot-checked one median by hand: USA/USD's statistics are internally consistent with the headcount and total shown (plausible distribution, no blended-currency artifacts).

## Cross-cutting checks

- **`<main>` landmark**: present and correctly scoped on both `/employees` and `/insights` after client-side route navigation (confirmed via accessibility-tree snapshot on both routes).
- **Console cleanliness**: zero errors across the entire session (create, edit, delete, filter, sort, search, group-by switching) beyond the one benign autofill advisory noted above.
- **CORS**: confirmed working correctly when frontend and backend origins match the configured allow-list (`http://localhost:5173`); a mismatched-origin manual test (`127.0.0.1` vs `localhost`) correctly triggered a browser-enforced CORS block, which is the correct, intended security behavior, not a defect.

## Known test-environment limitation

The test browser's initial viewport (278px tall) was too short for the Edit form's salary field to register `fill`/`click` interactions reliably at that size — this is a manual-testing artifact (small initial window), not an app defect; resizing to 1280×900 resolved it immediately and all subsequent interactions worked normally. Not an AC or accessibility finding.

## Summary

7 of 7 UI slices verified live and passing, after fixing one real defect (missing `email` field) that had escaped unit-test coverage. Zero console errors. Focus trap, keyboard activation, ARIA live error summary, and currency-safe aggregation were all confirmed via actual browser interaction, not static code reading.
