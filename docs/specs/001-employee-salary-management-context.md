# Task context: 001-employee-salary-management

> Generated for spec e9edd47b-dec9-49a2-808a-07e86f0f5807 at HEAD 8e53a49 · 2026-10-01
> Read first by every agent in /anthara:plan-implementer's slice loop.
>
> **This repo is greenfield.** At generation time it contains only `kata.md`, `ARCHITECTURE.md`, and the two spec files — no `app/`, no `Gemfile`, no `package.json`, no frontend scaffold. Every "module" below is a *plan*, not an inventory. Sections that would normally list existing reusables/patterns/dragons are honestly sparse; slice 5.1 is the first code this project will have, and it sets precedent for everything after it.

## 1. Affected modules
Planned, not yet created — drawn from [ARCHITECTURE.md](../../ARCHITECTURE.md) §4 and [spec §7.3](001-employee-salary-management-spec.md#73-module-decomposition).

| Module / file (to be created) | Role | Notes |
|---|---|---|
| `app/controllers/employees_controller.rb` | `index`/`show`/`create`/`update`/`destroy`; thin, delegates to `Employee` scopes | Slices 5.1-5.6 |
| `app/controllers/pay_summaries_controller.rb` | Parses `group_by`, calls `PaySummaryQuery`, renders JSON | Slice 5.7 |
| `app/controllers/application_controller.rb` | `rescue_from` → uniform JSON error shape (404/422/400) | [spec §6.1.5](001-employee-salary-management-spec.md#61-rails-backend-standards) |
| `app/models/employee.rb` | Validations (presence, non-negative salary, unique email), filter/sort scopes | |
| `app/services/pay_summary_query.rb` | Currency-safe `GROUP BY` aggregate PORO | First service object in the app |
| `db/migrate/*_create_employees.rb`, `db/schema.rb` | `decimal(12,2)` salary, currency column, `null: false`, unique+filter indexes | |
| `db/seeds.rb` | Batched (`insert_all`, 1,000-row slices), idempotent, 10,000-row seed | |
| `config/initializers/cors.rb` | `rack-cors` explicit origin allow-list | |
| Frontend `src/features/employees/` | Table, filter bar, detail drawer, add/edit forms | React + Vite + shadcn/ui + TanStack Query |
| Frontend `src/features/insights/` | Pay-summary tiles + breakdown table | |

Confirm exact paths against whatever `rails new --api` / Vite scaffolding slice 5.1 actually generates; treat this table as a starting plan.

## 2. Patterns to follow
No in-repo precedent exists yet. The only "patterns" are the ones the spec/architecture already name as mandatory — slice 5.1 must establish them faithfully since every later slice imitates 5.1, not the spec:
- **Thin controller / PORO service** — business logic lives in `app/models` scopes or `app/services`, never in controllers. [spec §7.2](001-employee-salary-management-spec.md#72-architectural-style)
- **Money as decimal + explicit currency** — `salary_amount: decimal(12,2)` paired with a separate `salary_currency` column, never float. [spec §6.1.1](001-employee-salary-management-spec.md#61-rails-backend-standards)
- **Uniform JSON errors via `rescue_from`** — one error shape for 404/422/400, defined once in `ApplicationController`. [spec §6.1.5](001-employee-salary-management-spec.md#61-rails-backend-standards)
- **`params.expect`, never raw `params`** — Rails 8 strong-params idiom. [spec §6.1.4](001-employee-salary-management-spec.md#61-rails-backend-standards)
- **Validations backed by DB constraints** — uniqueness/presence validations always paired with a matching index/`null: false`, never trusted alone. [spec §6.1.2](001-employee-salary-management-spec.md#61-rails-backend-standards)

## 3. Reusable utilities
None exist yet. The pagination envelope (`page, per_page, total_count, total_pages`) and the JSON error shape, both first produced in slice 5.1/`ApplicationController`, become the de-facto reusables every later slice must reuse rather than reinvent — record their final shape here once 5.1 lands.

## 4. Adjacent code that must coordinate (per slice)
- **Slice 5.1:** none upstream (first slice). Downstream: 5.2-5.6 all extend `EmployeesController#index`/the `Employee` model it creates.
- **Slice 5.2 (filter/search):** extends 5.1's `EmployeesController#index` and `Employee` scopes — do not add a second listing endpoint.
- **Slice 5.3 (detail view):** adds `EmployeesController#show`; frontend drawer must coordinate with 5.1's table/filter client state.
- **Slice 5.4 (add employee):** `EmployeesController#create`; success path must invalidate/refetch the 5.1 table query (TanStack Query) without a full reload.
- **Slice 5.5 (edit):** `EmployeesController#update`; shares validation logic with 5.4's `create`.
- **Slice 5.6 (remove):** `EmployeesController#destroy`; must coordinate with both 5.1's listing and 5.7's aggregates (AC 5.6.4 — removed employee excluded from both).
- **Slice 5.7 (insights):** reads the same `Employee` model/scopes as 5.1-5.6 via `PaySummaryQuery`; no direct controller-to-controller call.

## 4a. Slice imitation targets
- **Slice 5.1:** greenfield; no imitation target. This slice's `EmployeesController#index` shape (response envelope, serialization, error style) is the precedent every later slice must mirror.
- **Slice 5.2:** mirror 5.1's `EmployeesController#index` — same action, additive query params, same response envelope.
- **Slice 5.3:** mirror 5.1's serialization/projection style for the new `#show` action.
- **Slice 5.4:** greenfield `create` action; no prior example — establish the `params.expect` + 422 validation-error shape carefully, since 5.5 will imitate it.
- **Slice 5.5:** mirror 5.4's `create` action for parameter handling and 422 error shape, adapted to `update`.
- **Slice 5.6:** greenfield `destroy` action; mirror standard Rails REST conventions (204 on success).
- **Slice 5.7:** greenfield service object; no imitation target — first and only PORO under `app/services` at this point.

## 4b. Slice lexicon
- **Slice 5.1:** model=`Employee`; controller=`EmployeesController#index`; route=`GET /api/employees`; fields=`id, first_name, last_name, job_title, department, country, salary_amount, salary_currency, hire_date`; pagination envelope=`page, per_page, total_count, total_pages`.
- **Slice 5.2:** query params=`country, department, job_title, min_salary, max_salary, q`.
- **Slice 5.3:** route=`GET /api/employees/:id`.
- **Slice 5.4:** route=`POST /api/employees`; accepted fields add `email, hire_date` to 5.1's set.
- **Slice 5.5:** route=`PATCH /api/employees/:id`.
- **Slice 5.6:** route=`DELETE /api/employees/:id`.
- **Slice 5.7:** service=`PaySummaryQuery` (method `call(group_by:)`); controller=`PaySummariesController`; route=`GET /api/insights/pay-summary`; param=`group_by` (`country` | `department` | `job_title`); response fields=`headcount, total_cost, min/avg/median/max` salary, partitioned by `(group, currency)`.

## 4c. Slice traps
- **Slice 5.1:** (1) do NOT return an unbounded `.all` — server must enforce and clamp `per_page` to its cap, not just honor the caller's value (AC 5.1.3, [invariant 4.4](001-employee-salary-management-spec.md#4-invariants)). (2) must issue a bounded, constant query count regardless of page content — guard with `strict_loading` (AC 5.1.4). (3) a page beyond `total_pages` returns `200` + empty array, not an error (AC 5.1.5).
- **Slice 5.2:** (1) do NOT interpolate filter values into a raw SQL string — hash conditions/bind placeholders only (AC 5.2.2). (2) an invalid `min_salary`/`max_salary` (non-numeric) returns `400`, not `500` (AC 5.2.4). (3) clearing all filters must return byte-for-byte the same shape as 5.1's unfiltered listing.
- **Slice 5.3:** (1) 404 goes through `ApplicationController`'s `rescue_from`, not an ad-hoc rescue in the action (AC 5.3.3). (2) opening the drawer must not reset the table's scroll/filter state — this is a client-state concern, not a server one (AC 5.3.2).
- **Slice 5.4:** (1) negative or non-numeric salary returns `422` with per-field messages, not `500` (AC 5.4.2). (2) duplicate email must be rejected by a DB unique index, not validation alone ([invariant 4.1](001-employee-salary-management-spec.md#4-invariants), AC 5.4.3). (3) use `params.expect`, never raw `params` (§6.1.4). (4) success must not require a full page reload — invalidate the TanStack Query cache instead (AC 5.4.4).
- **Slice 5.5:** (1) re-validate non-negativity and ISO 4217 well-formedness on *every* salary change, including updates, not just creates (AC 5.5.2). (2) updating a removed/non-existent employee returns `404`, not `422`. (3) the UI must reflect the server's saved values after a successful save — do NOT optimistically guess the result client-side (AC 5.5.3).
- **Slice 5.6 (destructive):** (1) require an explicit client-side confirmation step before issuing `DELETE` (AC 5.6.2) — no established confirm-pattern exists in this greenfield repo yet; the natural first-use primitive is shadcn/ui's `AlertDialog` (Radix-based, ships with the chosen component library). (2) no impact-count/blast-radius query is needed — `Employee` has no dependent child rows in this schema (no salary history per [§9.3](001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits), no managed Country/Department entities per [§9.5](001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)); it is a plain single-row delete. (3) after removal the employee must disappear from both the 5.1 listing and any 5.7 aggregate computed afterward — don't leave either cache stale (AC 5.6.4). (4) deleting a non-existent id returns `404`.
- **Slice 5.7 (currency-safe aggregation — the one slice with real domain risk):** (1) do NOT sum or average salaries across differing currencies — always group by `(country|department|job_title, currency)` ([invariant 4.5](001-employee-salary-management-spec.md#4-invariants), AC 5.7.1/5.7.4). (2) do NOT compute aggregates with a Ruby-side loop over all 10,000 records — DB-side `GROUP BY` only; must stay under 500ms on the seeded dataset (AC 5.7.3). (3) do NOT add currency conversion/normalization "to make the output cleaner" — this is an accepted limit and an ADR, not a defect ([§9.4](001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)). (4) the UI must show the "amounts shown as paid, not currency-converted" disclosure — don't drop it as unnecessary (AC 5.7.5).
- **All slices:** do NOT add authentication/login ([§9.2](001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)); do NOT add salary history/effective-dating ([§9.3](001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)); do NOT build Country/Department management CRUD screens — they are validated string attributes, not managed entities ([§9.5](001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)).

## 5. Known dragons
None found by inspection — there is no code yet (`grep` for `TODO`/`FIXME`/`DEPRECATED` is moot on an empty tree). Two process-level dragons worth flagging early:
- **No `CLAUDE.md` exists.** Per ai-ergonomics guidance, the first slice should add one documenting the conventions in §2 above so later slices don't drift or invent alternatives.
- **Incremental-commit requirement from `kata.md`.** The brief explicitly requires commit history to show the solution's evolution slice by slice (also codified in [spec §6.6.1](001-employee-salary-management-spec.md#66-incubyte-engineering-standards)) — plan-implementer's slice loop should land each slice as its own commit, not squash them.

## 6. Test conventions
Per [spec §6.2](001-employee-salary-management-spec.md#62-rails-testing-standards) (none of this exists yet — it is the mandated target, not an observed convention):
- **Backend unit:** Minitest, Rails' default layout (`test/models/`, `test/services/`) — covers validations, scopes, and `PaySummaryQuery`.
- **Backend integration:** `ActionDispatch::IntegrationTest` request-level tests (`test/integration/` or `test/requests/`) covering every endpoint's happy path and its 400/404/422 error paths — controller unit tests are explicitly disfavored.
- **Coverage:** SimpleCov wired at the top of `test_helper.rb`, read as a signal, not gamed to a number.
- **Determinism:** tests run inside rolled-back transactions; `parallelize(workers: :number_of_processors)` stays on; no test depends on another's data.
- **Run:** `bin/rails test` (once scaffolded).
- **Frontend tests:** no framework is pinned by the spec — only a SonarJS lint pack is named ([§6.7](001-employee-salary-management-spec.md#67-sonarjs-violations-javascripttypescript)), which governs lint rules, not the test runner. The first frontend slice should pick one consistent with Vite + React (e.g. Vitest + Testing Library) and record the choice in `CLAUDE.md`.

## 7. Hot paths and performance landmines
- `GET /api/employees` (5.1/5.2) — must issue a bounded, constant query count per page regardless of the 10,000-row table; guarded by a `strict_loading` request test (AC 5.1.4). No joins/includes should be added without re-verifying this.
- `GET /api/insights/pay-summary` (5.7) — must complete in under 500ms against the full seeded dataset (AC 5.7.3); aggregation must stay DB-side (`GROUP BY`), never a Ruby-side loop over all records.
- `db/seeds.rb` — batched `insert_all` in 1,000-row slices inside one transaction ([§6.1.7](001-employee-salary-management-spec.md#61-rails-backend-standards)); do not regress to row-by-row `.create!`.

## 8. Open uncertainties resolved during orientation
[Spec §8](001-employee-salary-management-spec.md#8-open-questions) records 0 open questions — every elicitable unknown was resolved during spec-writing, and orientation found nothing new to add. One practical micro-decision the spec leaves unpinned: the frontend test framework (see §6 above) — not a spec gap, just a detail deferred to the implementing slice.

## 8a. Design system
All seven slices are UI-touching (table, filters, drawer, forms, insights tiles) — this section applies.
- **Source of truth:** none detected yet — **greenfield (Path B)**. No `design.md`, no `tailwind.config.*`, no component library scaffolded at generation time.
- **Chosen direction (from [ARCHITECTURE.md](../../ARCHITECTURE.md) §2 / [spec §7.1](001-employee-salary-management-spec.md#7-architecture)):** shadcn/ui + Tailwind CSS — Radix-based, accessible-by-default primitives. Reuse shadcn's `Table`, `Dialog`/`Sheet` (for the detail drawer), `Form`, and `AlertDialog` (for the 5.6 delete confirmation) rather than hand-rolling equivalents.
- **Tokens / theme / density / dark-mode:** none exist yet. Slice 5.1 (the first UI surface — the employee table) is itself the de-facto design-system baseline; whatever density, spacing, and color choices it makes become the convention 5.2-5.7 must imitate. Record that baseline (ideally in a `design.md` or `CLAUDE.md` addendum) as soon as 5.1 lands, so later slices don't drift.
- **Accessibility floor (enforced, not optional):** WCAG 2.1 AA per [spec §6.5.1](001-employee-salary-management-spec.md#65-accessibility-checklist-wcag-21-aa) — semantic table markup with correct heading order, every form input labelled, the detail drawer traps focus while open and restores it to the triggering row on close, 4.5:1 contrast minimum, all controls keyboard-reachable with visible focus styles.
- **Per-slice UI note:** no prior screen exists to imitate for 5.1 — it is the first. Every later slice (5.2-5.7) should imitate 5.1's table/form/drawer conventions once established.

---
## Changelog
- 2026-10-01 — generated by code-orienteer from spec e9edd47b-dec9-49a2-808a-07e86f0f5807 at HEAD 8e53a49.
