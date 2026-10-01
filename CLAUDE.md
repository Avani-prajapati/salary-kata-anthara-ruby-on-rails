# CLAUDE.md

Conventions established by slice 0 of `docs/plans/001-employee-salary-management-plan.md`. Later slices imitate these rather than inventing alternatives. See `ARCHITECTURE.md` for the overall architectural style and `docs/specs/001-employee-salary-management-spec.md` for the product spec.

## Repository layout

- `backend/` — Rails 8 API-only app (Ruby 3.4.9, Rails 8.1.4), SQLite.
- `frontend/` — Vite + React 19 + TypeScript SPA.
- `docs/specs/`, `docs/plans/` — the spec and the plan driving this build.

## Backend

- **Framework:** Rails 8, `--api` mode, SQLite (`storage/{development,test,production}.sqlite3`).
- **Architecture:** modular monolith. Controllers → `app/services` POROs / `app/models` scopes → database, one direction only. Controllers never contain business logic; models never call services or controllers.
- **Gemfile additions beyond the Rails 8 default:**
  - `rack-cors` — CORS allow-list (`config/initializers/cors.rb`), origin from `ENV["FRONTEND_ORIGIN"]` (default `http://localhost:5173`).
  - `faker` (`group :development`) — realistic fake data for `db/seeds.rb`.
  - `simplecov` (`group :development, :test`) — coverage reporting, wired at the top of `test/test_helper.rb`; read as a signal, not gamed to a number.
  - `rubocop-rails-omakase` (`group :development, :test`, Rails 8 default) — this is the current Rails 8 generator's default linting gem and already composes `rubocop`, `rubocop-ast`, `rubocop-performance`, and `rubocop-rails`. The plan's draft inferred separate `rubocop`/`rubocop-rails`/`rubocop-minitest` gems; the generator's real output (`rubocop-rails-omakase`) is used instead — no `rubocop-minitest` equivalent is bundled, so Minitest-specific cops are not enforced.
- **Error handling:** `ApplicationController` maps exceptions via `rescue_from` to one JSON error shape: `{ "error": { "code", "message", "details"? } }` — `ActiveRecord::RecordNotFound` → 404 `not_found`, `ActiveRecord::RecordInvalid` → 422 `unprocessable_entity` (with per-field `details`), `ActionController::ParameterMissing` → 400 `bad_request`. Every later controller action relies on this — no ad-hoc rescues in individual actions.
- **Pagination:** the `Paginatable` concern (`app/models/concerns/paginatable.rb`) exposes `.paginated(page:, per_page:)`. `DEFAULT_PER_PAGE = 25`, `MAX_PER_PAGE = 100`. `per_page` is clamped into `[1, MAX_PER_PAGE]`; `page` below 1 clamps to 1; a page beyond the data returns an empty relation, not an error.
- **Employee allow-lists:** `Employee::DEPARTMENTS`, `Employee::JOB_TITLES`, `Employee::SUPPORTED_COUNTRIES` are frozen constants on the model — the single source of truth for valid values. Country and department are validated attributes, not managed entities; do not build CRUD screens for them.
- **Money:** `salary_amount` is `decimal(precision: 12, scale: 2)`, paired with `salary_currency` (a separate `string` column, validated against `/\A[A-Z]{3}\z/`). Never a float column, never derived from country.
- **Seeding:** `db/seeds.rb` is idempotent (clears the table first) and batched (`Employee.insert_all` in 1,000-row slices inside one transaction per batch, never per-row `create!`). It builds plain hashes and applies the model's own constraints in Ruby (`insert_all` skips validations/callbacks). Emails are deterministic: `firstname.lastname.<index>@acme.example`, unique by construction. Run with `bin/rails db:seed` from `backend/`.
- **Tests:** Minitest, Rails' default layout (`test/models/`, `test/services/`, `test/integration/`). Fixtures (`test/fixtures/*.yml`), not FactoryBot. `parallelize(workers: :number_of_processors)` stays on. Run the full suite with `bin/rails test` from `backend/`.

## Frontend

- **Stack:** Vite + React 19 + TypeScript, Tailwind CSS v4 (via `@tailwindcss/vite`), shadcn/ui (Radix-based primitives, `nova` preset, generated into `src/components/ui/`).
  - The shadcn/ui CLI used here (`shadcn@4.21.0`) differs from older tooling the plan assumed: it installs a single `radix-ui` umbrella package (not per-primitive `@radix-ui/react-*` packages) and selects a named visual preset (`nova`) rather than the older `default`/`new-york` styles. Theme tokens live in `src/index.css`.
- **Path alias:** `@/*` → `src/*` (configured in `vite.config.ts` and both `tsconfig.json`/`tsconfig.app.json`).
- **Routing:** `react-router-dom`, `BrowserRouter` wraps `<App />` in `src/main.tsx`; routes are declared in `src/App.tsx`.
- **Server state:** `@tanstack/react-query` (wired starting with the first slice that fetches data).
- **Data table:** `@tanstack/react-table` (headless) over shadcn/ui's styled `Table` primitives.
- **Forms:** `react-hook-form` + `zod` + `@hookform/resolvers`.
- **API client:** `src/lib/api.ts` — `API_BASE_URL` from `import.meta.env.VITE_API_BASE_URL` (falls back to `http://localhost:3000`); one typed fetch function added per endpoint, as each slice needs it.
- **Testing:** Vitest + React Testing Library + `@testing-library/jest-dom`, `jsdom` environment (`vite.config.ts` `test` block, setup file `src/test/setup.ts`). Run with `npm test` from `frontend/`.
- **Linting:** `oxlint` (the current Vite React-TS template's default; faster than ESLint, same role).

## Process conventions

- Work happens on `feature/*` branches, never directly on `main`.
- Commits follow Conventional Commits, one commit per plan slice — the history is expected to show the solution's evolution slice by slice.
- `backend/config/master.key` and `backend/config/credentials.yml.enc`'s decryption key are never committed (`backend/.gitignore` excludes `/config/*.key`).
