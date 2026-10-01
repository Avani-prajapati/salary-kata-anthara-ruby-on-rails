# Plan: 001-employee-salary-management

> Spec: `docs/specs/001-employee-salary-management-spec.md` · Context: `docs/specs/001-employee-salary-management-context.md` · Authored: 2026-10-01
> Risk: MODERATE (sensitive HR/compensation PII, user-facing, business logic around salary stats; no auth/payment surface, no regulated compliance pack active) · Hard floors: slice 0 (schema migrations) · Fabric standards: reachable

---

# Part 1 — Review this

*Everything a reviewer needs to approve or redirect the approach. If you only read one part, read this one.*

## What we're doing

Building a Rails 8 (API-only) + React SPA tool that lets ACME's HR Manager browse, search, create, edit, and remove 10,000 employee salary records, and read org-wide pay aggregates (headcount, payroll cost, salary distribution) by country, department, and job title. The repo is completely greenfield today — this plan's first slice scaffolds both apps from nothing.

The core constraint forcing the approach: **salaries are paid in different currencies across countries, with no FX-rate source available in this environment** (spec [§9.4](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)). Every aggregate computation must partition by currency rather than blend amounts, which is the single piece of real domain risk in this plan and the reason slice 7 gets the highest build tier and the most scrutiny.

One deliberate exception: slice 0 is **not** a spec slice. It is infrastructure (scaffolding both apps, the `Employee` schema, and the 10,000-row seed script) that every spec slice depends on but that has no user-reachable Entry of its own — spec [§5](../specs/001-employee-salary-management-spec.md#5-slices) correctly excludes it as a slice, and this plan adds it back as slice 0 because the kata requires the seed script as a deliverable and slice 1's acceptance criteria assume seeded data exists.

## How it breaks down

Slice order mirrors the spec exactly (5.1 → 5.7), preceded by the scaffolding slice 0 that nothing else can run without. Slices 1-6 are the CRUD surface, built read-before-write (list → filter → detail → create → edit → delete); slice 7 (insights) comes last because it reads across the whole dataset the earlier slices establish.

| # | Slice | Delivers | Why this tier | Tier |
|---|-------|----------|---------------|------|
| 0 | Scaffold backend, frontend, and seed 10,000 employees | Runnable Rails API + React shell, `Employee` schema, idempotent seed | Sets every convention later slices imitate; touches schema migrations (floored) | `excellent` |
| 1 | Browse the paginated employee directory | `GET /api/employees` + sortable/paginated table | Establishes the response envelope and error shape everything else imitates | `excellent` |
| 2 | Filter and search the employee directory | Combinable query params + filter bar | Extends 1's query safely; SQL-injection-safety matters here | `excellent` |
| 3 | View an employee's full record | `GET /api/employees/:id` + detail drawer | Mirrors 1's serialization; low net-new design | `fast` |
| 4 | Add a new employee | `POST /api/employees` + create form | First `create` action; establishes the 422 validation-error shape slice 5 imitates | `excellent` |
| 5 | Edit an employee's profile and salary | `PATCH /api/employees/:id` + edit form | Near-identical to slice 4's shape, reused rather than re-invented | `fast` |
| 6 | Remove an employee record | `DELETE /api/employees/:id` + confirm dialog | Standard REST destroy; no dependent rows to reason about | `fast` |
| 7 | View org-wide pay insights | Currency-safe aggregates + Insights tab | Only slice with a genuine algorithm (currency-safe median with no DB support) and a performance budget | `best` |

Slices 4 and 5 are near-identical in shape (strong-params in, validate, persist, invalidate cache) — slice 5 reuses slice 4's form component and validation wiring rather than inventing a second one. Slices 1 and 2 share one endpoint (`EmployeesController#index`); slice 2 must never introduce a second listing action.

## Decisions made

**1. Pagination is hand-rolled (limit/offset + a capped `per_page`), not a gem.** A `Paginatable` concern on `Employee` keeps this dependency-free and fully unit-testable; the cap lives in one named constant. Lands in slices 0, 1. *Rejected: the Pagy gem — fine in general, but an unnecessary dependency for one straightforward paginated endpoint.*

**2. Country, department, and job title validate against small frozen allow-lists on `Employee`, not separate managed tables.** This keeps "multiple countries" realistic and slice 7's groupings meaningful, without building reference-data CRUD the spec never asked for (ties spec [§9.5](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)). Lands in slices 0, 1, 4. *Rejected: separate `Country`/`Department` tables — explicitly rejected in the spec itself.*

**3. Currency is validated independently of country, never derived from it.** This is what makes the spec's deliberate multi-currency-per-country edge case (an expat paid in a different currency than their country's default) representable at all, and is why slice 7 groups by `(dimension, currency)` rather than by dimension alone. Lands in slices 0, 4, 7.

**4. Median salary is computed in Ruby from one sorted, plucked query per request — not in SQL.** SQLite has no built-in median aggregate. Count/sum/min/max/avg stay fully database-side (`GROUP BY`); only the median crosses into Ruby, and it does so via a single `ORDER BY ... pluck` query covering every group at once, not one query per group. Lands in slice 7. *Rejected: a per-group query loop (N+1 risk) and a raw-SQL percentile window-function hack (uncertain support in the SQLite version Rails 8 bundles).*

**5. Seed emails are constructed deterministically (`firstname.lastname.<index>@acme.example`), not generated by Faker's email helper.** At 10,000 rows, relying on Faker's internal uniqueness cache for email risks collisions against the unique-email invariant; a sequential-index suffix is simpler and provably unique by construction. Lands in slice 0.

**6. The employee table uses TanStack Table (headless) over shadcn/ui's styled `Table` primitives, with TanStack Query for server state.** shadcn/ui ships styling, not sorting/column logic; this pairing is the standard combination for a sortable, server-paginated data table. Lands in slices 1, 2.

**7. Forms use react-hook-form + zod.** The spec's implementation-approach probe didn't lock a form library; this plan decides it now rather than leaving it to the build agent — declarative validation that can mirror the backend's rules, minimal bundle size, the standard pairing with shadcn/ui's `Form` primitives. Lands in slices 4, 5.

**8. The detail/edit surface uses shadcn/ui's `Sheet` component as the side-panel drawer the spec's layout probe specified; the delete confirmation uses shadcn/ui's `AlertDialog`.** Both are Radix-based primitives already part of the chosen component library — no new dependency. Lands in slices 3, 4, 5 (Sheet) and 6 (AlertDialog).

## Where this could go wrong

- **Slice 7's currency-safe aggregation is the single highest-risk piece of this plan** — a grouping bug (e.g. grouping by dimension alone, forgetting currency) would silently blend incompatible numbers into a plausible-looking but wrong total. Guarded by slice 7's quality checks and a mandatory mixed-currency fixture test.
- **Scope creep into spec [§9](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits) items that sit directly adjacent to open slices** — slice 5 (editing salary) is exactly where a builder might be tempted to add salary history/effective-dating ([§9.3](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)); slice 7 (insights) is exactly where a builder might be tempted to add FX conversion "to produce one clean total" ([§9.4](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)). Both are called out explicitly in each slice's quality checks below.
- **Seed idempotency** — re-running `db:seed` must not violate the unique-email index or duplicate 10,000 rows. Guarded by slice 0's quality check requiring a clear-or-upsert step before `insert_all`.
- **The 500ms performance budget (AC 5.7.3) is a wall-clock assertion**, an intentional, scoped exception to test-craft's "no real time" guidance — it is timing a performance budget, not simulating a clock. The threshold is generous relative to an indexed `GROUP BY` over 10,000 local SQLite rows, so flakiness risk is low; if it proves flaky, loosen the threshold rather than deleting the check.
- **Slice 1's N+1/pagination-cap discipline is the precedent for every later list-shaped response** — if slice 1 ships `strict_loading` disabled "to get it working," slices 2 and 7 inherit the same silent risk. Guarded by slice 1's own quality check, which is a hard gate before any other slice builds on it.

## What's out of scope

Per spec [§1](../specs/001-employee-salary-management-spec.md#1-overview--business-context) and [§9](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits): no authentication/login (a builder could plausibly add a login screen "for completeness" — don't); no salary history or effective-dating (easy to reach for when building the edit-salary slice — don't); no currency conversion/normalization (easy to reach for when building insights — don't, it's an ADR, not a gap); no `Country`/`Department` management screens (they are validated attributes, not managed entities); no deployment/hosting target beyond local development.

---

# Part 2 — Build detail

*Prescriptive detail for the build agent. Reviewers can skim or skip.*

**Confidence markers used below:** `[verified]` = the planner read the code or docs and confirmed it. `[inferred]` = pattern-matched from a sibling implementation or general framework knowledge, not confirmed against this session's live docs (no `WebFetch`/`WebSearch` was reachable this session) — the build agent should sanity-check before assuming.

## Shared conventions (all slices)

- **Architecture:** Modular monolith [verified, spec §7.2] — Rails controllers → `app/services` POROs / `app/models` scopes → database, one direction only. The React SPA depends on the JSON contract only; it never assumes Rails internals.
- **Dependency direction:** Controllers depend on services and models; nothing depends back on a controller. Services depend on models; models never call services or controllers. Frontend features depend on a shared `lib/api` client; the client never depends on a feature.
- **Repository layout:** `backend/` (Rails API app) and `frontend/` (Vite React app) as sibling directories at repo root, alongside the existing `docs/`, `ARCHITECTURE.md`, `kata.md` [inferred — standard monorepo convention for a two-app submission, not dictated by the spec].
- **Module map:**
  - `backend/app/controllers/employees_controller.rb` — `index`/`show`/`create`/`update`/`destroy`; depends on `Employee`. [verified — standard Rails `--api` convention]
  - `backend/app/controllers/pay_summaries_controller.rb` — `index` parses `group_by`, calls `PaySummaryQuery`. [verified]
  - `backend/app/controllers/application_controller.rb` — `rescue_from` handlers, the uniform JSON error shape. [verified]
  - `backend/app/models/employee.rb` — validations, filter/sort scopes, `Paginatable` concern usage. [verified]
  - `backend/app/models/concerns/paginatable.rb` — the shared pagination scope (decision 1). [inferred — name chosen by this plan, not an existing convention]
  - `backend/app/services/pay_summary_query.rb` — the currency-safe aggregate PORO (decision 4). [inferred — name chosen by this plan]
  - `backend/db/migrate/*_create_employees.rb`, `backend/db/schema.rb` — schema. [verified]
  - `backend/db/seeds.rb` — batched, idempotent 10,000-row seed. [verified]
  - `backend/config/initializers/cors.rb` — `rack-cors` allow-list. [verified]
  - `frontend/src/lib/api.ts` — thin `fetch` wrapper, one function per endpoint, used by every feature. [inferred]
  - `frontend/src/features/employees/` — table, filter bar, detail drawer, add/edit forms. [inferred]
  - `frontend/src/features/insights/` — pay-summary tiles + breakdown table. [inferred]
  - `frontend/src/components/ui/` — shadcn/ui-generated primitives (Table, Sheet, Form, AlertDialog, Input, Button). [inferred — shadcn/ui's standard generated-component location]
- **Lexicon (from context [§4b](../specs/001-employee-salary-management-context.md#4b-slice-lexicon) — do not rename):** model `Employee`; fields `first_name, last_name, email, job_title, department, country, salary_amount, salary_currency, hire_date`; pagination envelope `page, per_page, total_count, total_pages`; routes `GET/POST /api/employees`, `GET/PATCH/DELETE /api/employees/:id`, `GET /api/insights/pay-summary`; service `PaySummaryQuery.call(group_by:)`; query params `country, department, job_title, min_salary, max_salary, q, group_by`.
- **Tests:** Minitest, Rails' default layout — `backend/test/models/`, `backend/test/services/` for unit tests, `backend/test/integration/` for request-level tests covering every endpoint's happy path plus its 400/404/422 paths (spec [§6.2](../specs/001-employee-salary-management-spec.md#62-rails-testing-standards); context [§6](../specs/001-employee-salary-management-context.md#6-test-conventions)). Fixtures (`backend/test/fixtures/employees.yml`), not FactoryBot — the domain is one model, fixtures are the Rails default and add no dependency. SimpleCov wired at the top of `test_helper.rb`. Frontend: Vitest + React Testing Library [inferred — the spec names no frontend test runner; this is the standard pairing with Vite, and context [§6](../specs/001-employee-salary-management-context.md#6-test-conventions) asks the first frontend slice to record the choice], covering form validation logic and the pay-summary rendering, not full e2e — backend carries the bulk of the test pyramid per the spec's own emphasis on request/model tests.

---

## Slice 0 — Scaffold the Rails API, React SPA, and seed 10,000 employees

**Key decision:** Generates both runnable apps from nothing, the `Employee` schema, and the seed script, applying decisions 1, 2, 3, and 5. This is the only slice with no spec AC of its own — its job is to make slice 1's ACs possible to satisfy at all.

**Structure**

- `backend/` (new) — `rails new backend --api --database=sqlite3` [inferred — standard Rails 8 API-mode invocation]. Gemfile additions: `rack-cors`, `faker` (`group :development`), `rubocop`, `rubocop-rails`, `rubocop-minitest`, `simplecov` (`group :development, :test`) [inferred — current gem names, not fetched this session].
- `backend/db/migrate/<timestamp>_create_employees.rb` (new) — columns: `first_name:string`, `last_name:string`, `email:string`, `job_title:string`, `department:string`, `country:string`, `salary_amount:decimal(12,2)`, `salary_currency:string`, `hire_date:date`, all `null: false`; `add_index :employees, :email, unique: true`; `add_index :employees, :country`; `add_index :employees, :department`; `add_index :employees, :job_title`.
- `backend/app/models/employee.rb` (new) — `class Employee < ApplicationRecord`; constants `DEPARTMENTS = %w[...].freeze`, `JOB_TITLES = %w[...].freeze`, `SUPPORTED_COUNTRIES = %w[...].freeze` (decision 2); validations: `first_name`/`last_name` presence, `email` presence + uniqueness + format (`URI::MailTo::EMAIL_REGEXP` [verified — Ruby stdlib constant]), `department`/`job_title` inclusion, `country` inclusion, `salary_amount` numericality (`greater_than_or_equal_to: 0`), `salary_currency` format (`/\A[A-Z]{3}\z/`, decision 3).
- `backend/app/models/concerns/paginatable.rb` (new) — `module Paginatable`; class method signature `paginated(page:, per_page:) -> ActiveRecord::Relation`; constant `DEFAULT_PER_PAGE = 25`, `MAX_PER_PAGE = 100`.
- `backend/app/controllers/application_controller.rb` (modify, generated stub) — `rescue_from ActiveRecord::RecordNotFound`, `ActiveRecord::RecordInvalid`, `ActionController::ParameterMissing` handlers, each a private method with signature `(exception) -> void` rendering the uniform error envelope.
- `backend/db/seeds.rb` (new) — module-level method `seed_employees(total: 10_000, batch_size: 1_000) -> void`.
- `backend/config/initializers/cors.rb` (new) — `Rack::Cors` block, origin from `ENV.fetch("FRONTEND_ORIGIN", "http://localhost:5173")`.
- `frontend/` (new) — `npm create vite@latest frontend -- --template react-ts` [inferred]; add Tailwind CSS + shadcn/ui init (generates `frontend/src/components/ui/`, `frontend/tailwind.config.*`, `frontend/src/lib/utils.ts`); add `react-router-dom`, `@tanstack/react-query`, `@tanstack/react-table`, `react-hook-form`, `zod`, `@hookform/resolvers`; dev deps `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
- `frontend/src/lib/api.ts` (new) — `const API_BASE_URL` from `import.meta.env.VITE_API_BASE_URL`; one typed fetch function per endpoint added as each slice needs it (none yet in this slice).
- `frontend/src/App.tsx` (modify, generated stub) — top-level route shell with `react-router-dom`: `/` redirects to `/employees`, `/employees` and `/insights` as placeholder routes (populated by slices 1 and 7).
- `CLAUDE.md` (new, repo root) — records the conventions in context [§2](../specs/001-employee-salary-management-context.md#2-patterns-to-follow) and this slice's concrete choices (gem list, directory layout, frontend test runner) so later slices imitate this slice rather than inventing alternatives (context [§5](../specs/001-employee-salary-management-context.md#5-known-dragons) flags this as a process dragon to close now).

**Collaborators:** `db/seeds.rb` constructs `Employee` rows as plain hashes (not `Employee.new`, since `insert_all` bypasses callbacks/validations per spec [§6.1.7](../specs/001-employee-salary-management-spec.md#61-rails-backend-standards)) and writes them via `Employee.insert_all`. The seed script is therefore solely responsible for producing valid data — it must apply the same constraints the model validates (non-negative salary, well-formed email, allow-listed country/department/job_title, well-formed currency) in plain Ruby before calling `insert_all`.

**Control flow:**
- `seed_employees`: guard — if `Employee.count.positive?`, clear the table first (idempotency, decision 5's uniqueness guarantee depends on starting from empty). Loop over `(total / batch_size)` batches; for each batch, build `batch_size` row hashes (sequential global index drives the deterministic email per decision 5; department/job_title/country/currency drawn from the frozen constants with a plausible weighted distribution; salary drawn from a per-job-title plausible range) inside a single transaction per batch; call `Employee.insert_all(rows)` per batch, never per row.
- CORS initializer: single allow-list block, no branching.
- `ApplicationController` rescue handlers: one method per exception type, each a single render call — no shared conditional dispatch.

**Tests:** New files only (nothing exists to extend). `backend/test/models/employee_test.rb` — validation tests for each constraint above (presence, uniqueness, format, inclusion, non-negativity), one test per invalid case and one for a fully valid record. `backend/test/models/concerns/paginatable_test.rb` — pagination scope returns the requested page, clamps an over-cap `per_page`, returns empty for an out-of-range page. No request tests yet (no controller actions exist until slice 1). Seed script is exercised indirectly by every later slice's fixtures/tests, not unit-tested itself beyond a smoke check that `rails db:seed` exits cleanly and produces exactly 10,000 rows, re-runnable without error.

**Standards that bite here:** Rails Backend Standards — money as decimal + currency ([§6.1.1](../specs/001-employee-salary-management-spec.md#61-rails-backend-standards)), DB-enforced integrity ([§6.1.2](../specs/001-employee-salary-management-spec.md#61-rails-backend-standards)), reversible migrations ([§6.1.9](../specs/001-employee-salary-management-spec.md#61-rails-backend-standards)), batched idempotent seeding ([§6.1.7](../specs/001-employee-salary-management-spec.md#61-rails-backend-standards)), CORS allow-list ([§6.1.8](../specs/001-employee-salary-management-spec.md#61-rails-backend-standards)). RuboCop `Rails/NotNullColumn`, `Rails/ThreeStateBooleanColumn` (n/a, no booleans here), `Rails/BulkChangeTable`. Clean Code: SRP (seed logic isolated in `seeds.rb`, not smeared across initializers).

**Quality checks**

- **Idempotent seed (§6.1.7): running the seed script twice in a row leaves exactly 10,000 `Employee` rows, not 20,000, and raises no unique-index violation.**
- Schema integrity (4.1-4.3): `email` has a unique index, `salary_amount`/`salary_currency`/`country`/`department`/`job_title` are all `null: false` at the database level, not merely validated in Ruby.
- No float money: `salary_amount` is declared `decimal`, never `float` or `integer` cents, anywhere in the migration.
- Seed data realism: the seeded `country`, `department`, and `job_title` values are drawn only from the model's frozen constants — no free-text garbage data that would make slice 7's groupings meaningless.
- Every gem and frontend dependency this slice adds is named explicitly in `CLAUDE.md` or a lockfile — no silent, undocumented dependency.

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **Migrations.** Apply all migrations against the project's database; they apply without error, and `db:schema:dump` succeeds.

---

## Slice 1 — Browse the paginated employee directory

**Key decision:** Implements spec [5.1](../specs/001-employee-salary-management-spec.md#51-browse-the-paginated-employee-directory) using decision 1's `Paginatable` concern and decision 6's TanStack Table + TanStack Query pairing. This slice's response envelope and error shape become the precedent every later slice imitates (context [§4a](../specs/001-employee-salary-management-context.md#4a-slice-imitation-targets)).

**Structure**

- `backend/app/controllers/employees_controller.rb` (new) — `def index -> void` (renders JSON); private `def pagination_params -> Hash` extracting `page`/`per_page` with integer coercion and safe defaults.
- `backend/app/models/employee.rb` (modify) — include `Paginatable`; scope `order_by_sort(column, direction) -> ActiveRecord::Relation` sanitizing `column` against `ALLOWED_SORT_COLUMNS = %w[last_name department country salary_amount hire_date].freeze` (Rails Backend Standards — allow-list dynamic sort columns).
- `backend/config/routes.rb` (modify) — `namespace :api do resources :employees, only: [:index] end`.
- `frontend/src/lib/api.ts` (modify) — `fetchEmployees(params: EmployeeListParams) -> Promise<EmployeeListResponse>`.
- `frontend/src/features/employees/EmployeesPage.tsx` (new) — top-level page component for the `/employees` route.
- `frontend/src/features/employees/EmployeeTable.tsx` (new) — TanStack Table instance over shadcn/ui `Table` primitives; props `{ data: Employee[], sorting, onSortingChange }`.
- `frontend/src/features/employees/usePagination.ts` (new) — hook managing `page`/`perPage` state, signature `() -> { page, perPage, setPage, setPerPage }`.
- `frontend/src/features/employees/types.ts` (new) — `Employee`, `EmployeeListParams`, `EmployeeListResponse` TypeScript types mirroring the backend's JSON shape.

**Collaborators:** `EmployeesController#index` calls `Employee.order_by_sort(...).paginated(...)`, never builds SQL itself. `EmployeeTable` calls `useQuery` (TanStack Query) which calls `fetchEmployees`, which calls the shared `fetch` wrapper in `lib/api.ts`.

**Control flow:**
- `index`: parse `page`/`per_page`/`sort`/`direction` params → guard invalid `sort` by falling back to the default (`last_name asc`) rather than erroring → query via `Employee.order_by_sort(...).paginated(...)` → render employees array + pagination envelope.
- `paginated`: guard — `per_page` is clamped to `[1, MAX_PER_PAGE]`; `page` below 1 clamps to 1; a `page` beyond the last page returns an empty relation, not an error (AC 5.1.5).
- Frontend `EmployeeTable`: loading state while the query is in flight, empty state when `data.employees` is empty, otherwise the populated table with pagination controls bound to `usePagination`.

**Tests:** New files. `backend/test/integration/employees_index_test.rb` — one test per AC: default page returns the envelope shape (5.1.1), sorting by each allowed column (5.1.2), an over-cap `per_page` is clamped (5.1.3), a query-count assertion across a seeded page proving no N+1 (5.1.4 — `assert_queries_count` or equivalent, with `strict_loading!` enabled in the test environment per context [§7](../specs/001-employee-salary-management-context.md#7-hot-paths-and-performance-landmines)), a page beyond `total_pages` returns `200` + empty array (5.1.5). Frontend: `frontend/src/features/employees/EmployeeTable.test.tsx` (new) — renders a populated table from fixture data, renders the empty state, renders the loading state.

**Standards that bite here:** Rails Backend Standards — paginate every index, never unbounded `.all` ([§6.1.3](../specs/001-employee-salary-management-spec.md#61-rails-backend-standards)); N+1-safe reads via `strict_loading` ([§6.1.6](../specs/001-employee-salary-management-spec.md#61-rails-backend-standards)). RuboCop `Rails/FindEach` (n/a here — no batch iteration, a single paginated query), `Rails/WhereExists`. Accessibility Checklist — semantic table markup, correct heading order ([§6.5.1](../specs/001-employee-salary-management-spec.md#65-accessibility-checklist-wcag-21-aa)).

**Quality checks**

- **Bounded listing (invariant 4.4): no response from `GET /api/employees` ever contains more than the server-enforced `per_page` cap, regardless of the caller's requested value.**
- Constant query count: loading any page issues the same number of queries regardless of how many employees are on that page (AC 5.1.4).
- Sortable columns are allow-listed server-side; an unrecognized `sort` value never reaches raw SQL (ties the Rails Backend Standards SQL-injection rule for dynamic sort columns).
- Out-of-range page returns `200` with an empty array, not a `4xx`/`5xx` (AC 5.1.5).
- No scope creep: this slice does not add filtering, search, or any query param beyond `page`/`per_page`/`sort`/`direction` — that is slice 2's job.

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **User-facing flow.** Load the Employees tab against the seeded 10,000-row dataset; confirm the table renders, pagination controls move between pages, and sorting each allowed column re-orders the visible rows.
3. **Accessibility.** Tab through the table and pagination controls; every interactive element is keyboard-reachable with a visible focus indicator; the table has correct heading semantics.

---

## Slice 2 — Filter and search the employee directory

**Key decision:** Extends slice 1's single `EmployeesController#index` (per context [§4](../specs/001-employee-salary-management-context.md#4-adjacent-code-that-must-coordinate-per-slice) — never a second listing endpoint) with combinable filter/search query params, applying spec [5.2](../specs/001-employee-salary-management-spec.md#52-filter-and-search-the-employee-directory).

**Structure**

- `backend/app/controllers/employees_controller.rb` (modify) — extend the private params-parsing method to also extract `country`, `department`, `job_title`, `min_salary`, `max_salary`, `q`; guard clause returning `400` on a non-numeric `min_salary`/`max_salary` before querying.
- `backend/app/models/employee.rb` (modify) — scopes: `by_country(code)`, `by_department(name)`, `by_job_title(title)`, `salary_between(min, max)`, `search_by_name_or_email(term)` (uses `ILIKE`-equivalent `LIKE` with `COLLATE NOCASE` on SQLite [inferred]), all composable via `ActiveRecord::QueryMethods` chaining — never raw SQL interpolation.
- `frontend/src/features/employees/FilterBar.tsx` (new) — controlled inputs for country/department/job_title (selects, sourced from a small constants file mirroring the backend's allow-lists) and salary range + search (text inputs); emits a debounced `onFilterChange(filters)`.
- `frontend/src/features/employees/types.ts` (modify) — extend `EmployeeListParams` with the new filter fields.

**Collaborators:** `EmployeesController#index` chains the new scopes onto the same `Employee.order_by_sort(...).paginated(...)` call from slice 1 — filters compose before sorting/pagination, never replace them. `FilterBar` writes into the same query-param state `EmployeesPage` passes to `useQuery`, so clearing filters naturally reproduces slice 1's unfiltered call.

**Control flow:**
- `index` (extended): for each present filter param, chain the corresponding scope onto the base relation; absent params add no scope (no `WHERE` clause for that dimension). Guard: `min_salary`/`max_salary` parsed with `Integer()`/`Float()` in a `rescue` that renders `400` on `ArgumentError`, before any query executes.
- `FilterBar`: debounce text input (search, salary range) before triggering a refetch; selects trigger immediately.

**Tests:** Modify `backend/test/integration/employees_index_test.rb` (extend, don't duplicate per test-craft reuse-over-reinvent) — one case per filter dimension, one case combining multiple filters, one case for the SQL-injection attempt via a filter param asserting it is treated as a literal value not executed (5.2.2), one case for a non-numeric `min_salary` returning `400` (5.2.4), one case asserting clearing all filters reproduces slice 1's unfiltered response shape (5.2.3). Frontend: `frontend/src/features/employees/FilterBar.test.tsx` (new) — each control updates its own filter value and calls `onFilterChange` with the combined filter state.

**Standards that bite here:** Rails Backend Standards — never interpolate request data into SQL; hash conditions/bind placeholders only ([§6.1](../specs/001-employee-salary-management-spec.md#61-rails-backend-standards), SQL injection rule). Clean Code — each scope is single-purpose and composable, not one large conditional method.

**Quality checks**

- **SQL-injection safety: every filter scope builds its `WHERE` clause via Active Record hash conditions or bind placeholders — no string interpolation of a request parameter into a query string anywhere in `employee.rb` or the controller (AC 5.2.2).**
- An invalid `min_salary`/`max_salary` returns `400` with a structured error body, never a `500` (AC 5.2.4).
- Clearing every filter returns byte-for-byte the same envelope shape slice 1 produces unfiltered (AC 5.2.3).
- No second index-like action or route is introduced — filtering lives entirely inside the existing `EmployeesController#index`.

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **User-facing flow.** Apply each filter individually and in combination against the seeded dataset; confirm the table narrows correctly and clearing filters restores the full directory.
3. **Accessibility.** Every filter control has an associated label; the filter bar is keyboard-operable end to end.

---

## Slice 3 — View an employee's full record

**Key decision:** Adds `EmployeesController#show` mirroring slice 1's serialization style (context [§4a](../specs/001-employee-salary-management-context.md#4a-slice-imitation-targets)), and a shadcn/ui `Sheet` detail drawer (decision 8) per spec [5.3](../specs/001-employee-salary-management-spec.md#53-view-an-employees-full-record).

**Structure**

- `backend/app/controllers/employees_controller.rb` (modify) — `def show -> void`; relies on `ApplicationController`'s `rescue_from ActiveRecord::RecordNotFound` (slice 0) for the 404 path — no ad-hoc rescue in the action.
- `backend/config/routes.rb` (modify) — add `:show` to the existing `resources :employees` line.
- `frontend/src/features/employees/EmployeeDetailDrawer.tsx` (new) — shadcn/ui `Sheet`-based component, props `{ employeeId: string | null, onClose: () => void }`.
- `frontend/src/lib/api.ts` (modify) — `fetchEmployee(id: string) -> Promise<Employee>`.
- `frontend/src/features/employees/EmployeeTable.tsx` (modify) — row click sets the selected `employeeId` in `EmployeesPage`'s state (lifted state, not drawer-owned) so the table's scroll/filter state is untouched (AC 5.3.2 is a client-state concern per context [§4c](../specs/001-employee-salary-management-context.md#4c-slice-traps)).

**Collaborators:** `EmployeeDetailDrawer` calls `useQuery` keyed on `employeeId`, calling `fetchEmployee`. `EmployeesPage` owns the `selectedEmployeeId` state the table and drawer both read/write — the drawer never re-fetches or resets the table.

**Control flow:**
- `show`: `Employee.find(params[:id])` (raises `ActiveRecord::RecordNotFound` on miss, caught by the existing `rescue_from`) → render full employee JSON.
- Frontend: drawer renders nothing when `employeeId` is `null`; otherwise opens and fetches; closing calls `onClose` which clears `selectedEmployeeId` without touching `EmployeeTable`'s own state.

**Tests:** New file `backend/test/integration/employees_show_test.rb` — happy path returns the full record (5.3.1), a non-existent id returns `404` via the shared error shape (5.3.3). Frontend: `frontend/src/features/employees/EmployeeDetailDrawer.test.tsx` (new) — renders employee details when `employeeId` is set, renders nothing when `null`.

**Standards that bite here:** Rails Backend Standards — uniform JSON errors via `rescue_from`, reused rather than re-implemented ([§6.1.5](../specs/001-employee-salary-management-spec.md#61-rails-backend-standards)). Accessibility Checklist — the drawer traps focus while open and restores it to the triggering row on close ([§6.5.1](../specs/001-employee-salary-management-spec.md#65-accessibility-checklist-wcag-21-aa)).

**Quality checks**

- A non-existent `id` returns `404` through the same `rescue_from` path slice 0 established — not a new, ad-hoc error branch (AC 5.3.3).
- Opening the drawer does not reset or refetch `EmployeeTable`'s pagination, sort, or filter state (AC 5.3.2).
- **Focus trap: while the drawer is open, Tab cycles only within it, and closing it (via Escape or the close control) returns focus to the row that opened it.**

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **User-facing flow.** Click a row, confirm the drawer opens with that employee's full details and the table underneath is unchanged; close it and confirm focus returns to the row.
3. **Accessibility.** Confirm the focus trap and focus-restore behavior described above; confirm drawer content is reachable by keyboard alone.

---

## Slice 4 — Add a new employee

**Key decision:** First `create` action and first form in the app — establishes the `params.expect` + 422 validation-error shape that slice 5 imitates (context [§4a](../specs/001-employee-salary-management-context.md#4a-slice-imitation-targets)), using decision 7's react-hook-form + zod pairing, per spec [5.4](../specs/001-employee-salary-management-spec.md#54-add-a-new-employee).

**Structure**

- `backend/app/controllers/employees_controller.rb` (modify) — `def create -> void`; private `def employee_params -> ActionController::Parameters` using `params.expect(employee: [:first_name, :last_name, :email, :job_title, :department, :country, :hire_date, :salary_amount, :salary_currency])` [inferred — Rails 8's `params.expect` syntax, matches spec §6.1.4's cited rule].
- `backend/config/routes.rb` (modify) — add `:create` to `resources :employees`.
- `frontend/src/features/employees/employeeFormSchema.ts` (new) — zod schema mirroring the backend's validations (non-empty names, email format, inclusion in the same allow-lists, non-negative salary, 3-letter currency).
- `frontend/src/features/employees/EmployeeForm.tsx` (new) — react-hook-form component, props `{ mode: "create" | "edit", defaultValues?: Employee, onSubmit: (values) => void }` (shared shape slice 5 reuses).
- `frontend/src/features/employees/AddEmployeeButton.tsx` (new) — opens `EmployeeForm` in create mode inside the shadcn/ui `Sheet`.
- `frontend/src/lib/api.ts` (modify) — `createEmployee(payload: EmployeeFormValues) -> Promise<Employee>`.

**Collaborators:** `EmployeesController#create` calls `Employee.create!(employee_params)`, relying on `ApplicationController`'s `rescue_from ActiveRecord::RecordInvalid` (slice 0) for the 422 path. `EmployeeForm`'s `onSubmit` calls a TanStack Query mutation wrapping `createEmployee`, which on success invalidates the slice 1 employee-list query (AC 5.4.4) rather than forcing a page reload.

**Control flow:**
- `create`: build via `employee_params` → `Employee.create!` → on success, render the created record `201`; on `ActiveRecord::RecordInvalid`, the shared `rescue_from` renders `422` with per-field messages (no local rescue in this action).
- `EmployeeForm`: zod validates client-side before submit (fast feedback); server-side Rails validation is still the authority — a server-rejected submission surfaces its per-field errors in the same form, not a separate error page.

**Tests:** New file `backend/test/integration/employees_create_test.rb` — valid payload creates and returns `201` (5.4.1), missing required field / invalid salary returns `422` with per-field messages (5.4.2), duplicate email returns `422` backed by the unique index (5.4.3 — assert via a fixture employee sharing the email, not by removing the index). Modify `backend/test/models/employee_test.rb` only if slice 0's validation tests didn't already cover a case this slice newly exercises (expected: no change needed, slice 0 already covers model validations). Frontend: `frontend/src/features/employees/EmployeeForm.test.tsx` (new) — valid input calls `onSubmit` with the parsed values, invalid input (e.g. negative salary) blocks submission and shows the field error, matching AC 5.4.2's intent client-side.

**Standards that bite here:** Rails Backend Standards — `params.expect`, never raw `params` ([§6.1.4](../specs/001-employee-salary-management-spec.md#61-rails-backend-standards)); uniqueness backed by a DB index ([§6.1.2](../specs/001-employee-salary-management-spec.md#61-rails-backend-standards)). RuboCop `Rails/StrongParametersExpect`. Accessibility Checklist — every form input has an associated `<label>` ([§6.5.1](../specs/001-employee-salary-management-spec.md#65-accessibility-checklist-wcag-21-aa)).

**Quality checks**

- **Strong parameters: `employee_params` uses `params.expect`, and no action anywhere in `EmployeesController` passes raw `params` or `params.permit!` to a model method (§6.1.4).**
- A duplicate email is rejected by the database's unique index backing the uniqueness validation, not validation alone (invariant 4.1, AC 5.4.3).
- A negative or non-numeric salary returns `422` with a field-level message, never `500` (AC 5.4.2).
- On success, the new employee appears in the directory via cache invalidation, with no full page reload (AC 5.4.4).
- This slice does not introduce any salary-history or effective-dating concept — only the current salary (spec [§9.3](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)).

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **User-facing flow.** Open the add-employee form, submit a valid new employee, confirm it appears in the directory without a reload; submit an invalid one (duplicate email, negative salary) and confirm inline field errors.
3. **Accessibility.** Every field is labelled and reachable by keyboard; validation errors are announced in a way a screen reader user would notice (associated via `aria-describedby` or equivalent).

---

## Slice 5 — Edit an employee's profile and salary

**Key decision:** Reuses slice 4's `EmployeeForm` in `"edit"` mode and its validation/422 shape (decision 7; context [§4a](../specs/001-employee-salary-management-context.md#4a-slice-imitation-targets)) rather than building a second form, per spec [5.5](../specs/001-employee-salary-management-spec.md#55-edit-an-employees-profile-and-salary).

**Structure**

- `backend/app/controllers/employees_controller.rb` (modify) — `def update -> void`, reusing `employee_params` from slice 4 (same permitted fields; `update` accepts a subset).
- `backend/config/routes.rb` (modify) — add `:update` to `resources :employees`.
- `frontend/src/features/employees/EmployeeDetailDrawer.tsx` (modify) — adds an "Edit" action that swaps the drawer's read-only view for `EmployeeForm` in `"edit"` mode, pre-filled with `defaultValues`.
- `frontend/src/lib/api.ts` (modify) — `updateEmployee(id: string, payload: Partial<EmployeeFormValues>) -> Promise<Employee>`.

**Collaborators:** Same `EmployeeForm` component as slice 4, parameterized by `mode="edit"`. The update mutation invalidates both the slice 1 list query and the slice 3 detail query for this `id`, so the drawer reflects the server's saved values rather than an optimistic guess (AC 5.5.3, context [§4c](../specs/001-employee-salary-management-context.md#4c-slice-traps) trap).

**Control flow:**
- `update`: `Employee.find(params[:id])` (404 via existing `rescue_from` if missing) → `.update!(employee_params)` → on success render the updated record; on `ActiveRecord::RecordInvalid`, the existing `rescue_from` renders `422` — identical shape to slice 4's create path, no new error handling written.
- Re-validation: changing `salary_amount`/`salary_currency` re-runs the same model validations slice 0 defined (non-negativity, currency format) — no separate "update-only" validation path.

**Tests:** New file `backend/test/integration/employees_update_test.rb` — valid update returns the changed record (5.5.1), an invalid salary change returns `422` with field errors (5.5.2), updating a non-existent id returns `404` not `422` (5.5.3's error-path half). Modify `frontend/src/features/employees/EmployeeForm.test.tsx` (extend, don't duplicate) — add a case for `mode="edit"` pre-filling `defaultValues` and calling `onSubmit` with only the changed fields.

**Standards that bite here:** Same as slice 4 — `params.expect`, DB-backed validation. Clean Code — `update` does not duplicate `create`'s validation logic; both route through the same model validations.

**Quality checks**

- Changing `salary_amount` or `salary_currency` re-validates non-negativity and currency format exactly as creation does — no bypass via `update_attribute`/`update_column` (RuboCop `Rails/SkipsModelValidations`) (AC 5.5.2).
- Updating a non-existent `id` returns `404`, not `422` (AC 5.5.3).
- After a successful save, the UI displays the server's returned values, not a client-computed optimistic value (AC 5.5.3).
- **This slice does not introduce salary history, an audit trail of changes, or effective-dating — editing simply overwrites the current salary fields (spec [§9.3](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)).**

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **User-facing flow.** Edit an employee's salary and another field; confirm the drawer and the directory both reflect the saved values after the request completes.
3. **Accessibility.** Same checks as slice 4's form, re-confirmed in edit mode (labels, keyboard reachability, error announcement).

---

## Slice 6 — Remove an employee record

**Key decision:** Standard REST `destroy`, confirmed via shadcn/ui's `AlertDialog` (decision 8) — the first destructive action in the app, with no established confirm pattern to inherit (context [§4c](../specs/001-employee-salary-management-context.md#4c-slice-traps)), per spec [5.6](../specs/001-employee-salary-management-spec.md#56-remove-an-employee-record).

**Structure**

- `backend/app/controllers/employees_controller.rb` (modify) — `def destroy -> void`.
- `backend/config/routes.rb` (modify) — add `:destroy` to `resources :employees` (now the full `resources :employees` from slices 1-6).
- `frontend/src/features/employees/EmployeeDetailDrawer.tsx` (modify) — adds a "Remove" action opening a shadcn/ui `AlertDialog` confirmation.
- `frontend/src/lib/api.ts` (modify) — `deleteEmployee(id: string) -> Promise<void>`.

**Collaborators:** The delete mutation, on success, invalidates both the slice 1 list query and (when slice 7 has landed) the insights query, so a removed employee disappears from both surfaces without a manual refresh (AC 5.6.4).

**Control flow:**
- `destroy`: `Employee.find(params[:id])` (404 via existing `rescue_from`) → `.destroy!` → render `204`.
- Frontend: "Remove" action opens the `AlertDialog`; only its confirm button triggers the mutation — dismissing the dialog performs no request.

**Tests:** New file `backend/test/integration/employees_destroy_test.rb` — successful delete returns `204` and the record no longer exists (5.6.1), deleting a non-existent id returns `404` (5.6.3). Frontend: `frontend/src/features/employees/EmployeeDetailDrawer.test.tsx` (extend) — clicking "Remove" opens the confirmation dialog without yet calling the delete API; confirming calls it.

**Standards that bite here:** Clean Code — no business logic added to the controller beyond the single `find`/`destroy!` pair. Accessibility Checklist — the `AlertDialog` traps focus and is dismissible via Escape, consistent with slice 3's drawer pattern.

**Quality checks**

- No `DELETE` request is issued without the user confirming in the `AlertDialog` first (AC 5.6.2).
- Deleting a non-existent `id` returns `404` (AC 5.6.3).
- **After removal, the employee disappears from the slice 1 directory (and, once slice 7 exists, from its aggregates) without a manual page refresh (AC 5.6.4).**
- No soft-delete, archival, or "undo" mechanism is introduced — this is a plain hard delete, matching the spec's explicit scope (no audit trail, spec [§9.2](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)).

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **User-facing flow.** Remove an employee via the confirmation dialog; confirm it disappears from the directory immediately.
3. **Accessibility.** The confirmation dialog traps focus, is dismissible via Escape, and its action buttons are clearly labelled for a screen reader.

---

## Slice 7 — View org-wide pay insights

**Key decision:** The one slice with genuine algorithmic risk — implements decision 4's two-query approach (database-side `GROUP BY` for count/sum/min/max/avg, one sorted `pluck` for median) and decision 3's currency-safe `(dimension, currency)` grouping, per spec [5.7](../specs/001-employee-salary-management-spec.md#57-view-org-wide-pay-insights). This is the capstone slice: it reads across every employee the prior six slices manage.

**Structure**

- `backend/app/services/pay_summary_query.rb` (new) — `PaySummary = Struct.new(:group_key, :currency, :headcount, :total_cost, :min_salary, :avg_salary, :median_salary, :max_salary, keyword_init: true)`; `class PaySummaryQuery`; class method `self.call(group_by: "country") -> Array<PaySummary>`.
- `backend/app/controllers/pay_summaries_controller.rb` (new) — `def index -> void`, validates `group_by` against `%w[country department job_title]` (400 on an unrecognized value), calls `PaySummaryQuery.call(group_by:)`.
- `backend/config/routes.rb` (modify) — `namespace :api do get "insights/pay-summary", to: "pay_summaries#index" end` [verified — Rails routes support an arbitrary literal path segment distinct from the controller/action's underscored names].
- `frontend/src/lib/api.ts` (modify) — `fetchPaySummary(groupBy: "country" | "department" | "job_title") -> Promise<PaySummary[]>`.
- `frontend/src/features/insights/InsightsPage.tsx` (new) — top-level page for the `/insights` route; a `group_by` selector plus the rendered breakdown.
- `frontend/src/features/insights/PaySummaryTable.tsx` (new) — renders headcount/cost/min/avg/median/max per `(group_key, currency)` row, with the "amounts shown as paid, not currency-converted" disclosure (AC 5.7.5).
- `frontend/src/features/insights/CountryStatTiles.tsx` (new) — headcount + total payroll cost stat tiles for the default country view.

**Collaborators:** `PaySummaryQuery` is the only module that queries `Employee` for aggregation purposes; `PaySummariesController` never builds SQL itself. The frontend `InsightsPage` depends only on `fetchPaySummary` — it has no knowledge of how the median is computed.

**Control flow:**
- `PaySummaryQuery.call(group_by:)`:
  1. Resolve `group_by` to the actual column (`country`, `department`, or `job_title`) — same allow-list the controller already validated, checked again here as the service's own boundary guard.
  2. Query 1 (database-side): `Employee.group(group_column, :salary_currency).select(COUNT, SUM, MIN, AVG, MAX of salary_amount)` — one query producing headcount/total_cost/min/avg/max per `(group_value, currency)` pair.
  3. Query 2 (database-side sort, Ruby-side reduction): `Employee.order(group_column, :salary_currency, :salary_amount).pluck(group_column, :salary_currency, :salary_amount)` — one query returning every row's triple, already sorted.
  4. Group query 2's plucked rows by `(group_value, currency)` in Ruby and compute each group's median from its already-sorted array (even-length: average the two middle values; odd-length: the middle value).
  5. Merge query 1's aggregates with query 2's medians by `(group_value, currency)` key into `PaySummary` structs; return the array.
- `PaySummariesController#index`: guard — an unrecognized `group_by` returns `400` before calling the service.

**Tests:** New file `backend/test/services/pay_summary_query_test.rb` — correctness per dimension (country/department/job_title) against fixture data (5.7.1, 5.7.2); **a dedicated case with one country having employees in two different currencies, asserting two separate rows rather than one blended row (invariant 4.5, AC 5.7.4)**; a median case with both an even and an odd number of employees in a group, asserting the arithmetic is correct. New file `backend/test/integration/pay_summaries_index_test.rb` — happy path per `group_by` value, an unrecognized `group_by` returns `400`, and a timing assertion (`Benchmark.realtime` or equivalent) that the full-dataset query completes under 500ms (5.7.3 — see Part 1's noted exception to the "no real time in tests" default). Frontend: `frontend/src/features/insights/PaySummaryTable.test.tsx` (new) — renders one row per `(group, currency)` pair from fixture data, and asserts the as-paid disclosure text is present (5.7.5).

**Standards that bite here:** Rails Backend Standards — RuboCop `Rails/UniqBeforePluck` (n/a — no `.uniq.pluck` pattern used; the plucked triples are deliberately not deduplicated), `Rails/FindEach` (n/a — no `.all.each`; this is a bounded `GROUP BY`/`pluck`, not a row-by-row iteration). Clean Code — `PaySummaryQuery` has one responsibility (computing pay summaries) and no controller reaches into it beyond calling `.call`.

**Quality checks**

- **Currency-safe aggregation (invariant 4.5): no returned row ever blends salaries paid in two different currencies — every row's headcount/total_cost/min/avg/median/max is computed from employees sharing both the same group value AND the same currency (AC 5.7.1, 5.7.4).**
- All of headcount/total_cost/min/avg/max are computed via database-side `GROUP BY`/aggregate functions — never a Ruby loop over the full employee table (AC 5.7.3).
- The full-dataset query completes within the stated performance budget (AC 5.7.3).
- The Insights UI displays the as-paid, not-converted disclosure text (AC 5.7.5).
- **This slice does not add currency conversion, a blended cross-currency total, or any FX-rate dependency — grouping by currency is the whole solution, not a stopgap (spec [§9.4](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)).**

**Verification (slice complete when these pass)**

1. **Tests.** Run the full test suite — all tests green.
2. **User-facing flow.** Open the Insights tab, switch between `group_by` country/department/job_title, and confirm the numbers displayed match the seeded dataset's actual distribution for at least one spot-checked group.
3. **Accessibility.** Stat tiles and the breakdown table are reachable and readable via screen reader (semantic headings, labelled numeric values, not color-only distinctions).

---

## Hard floors

- **Slice 0** — floored at `≥ excellent` (already assigned `excellent`). Triggering category: **migrations** (the initial `employees` schema migration). No other slice adds or changes schema, so no other slice is floored.

## Escalation log

*(empty at authoring — `/anthara:plan-implementer` appends one-way tier bumps here, with reasons, as the slice loop runs)*
