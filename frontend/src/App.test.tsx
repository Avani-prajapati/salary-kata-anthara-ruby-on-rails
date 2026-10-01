import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import App from "./App"

function renderAppAt(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("app route shell", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          employees: [],
          pagination: { page: 1, per_page: 25, total_count: 0, total_pages: 0 },
        }),
      }),
    )
  })

  it("redirects the root path to the employees directory", () => {
    renderAppAt("/")

    expect(screen.getByRole("heading", { name: "Employees" })).toBeInTheDocument()
  })

  it("renders the pay insights page at /insights", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }))

    renderAppAt("/insights")

    expect(screen.getByRole("heading", { name: "Pay insights" })).toBeInTheDocument()
    expect(await screen.findByText("Amounts shown as paid, not currency-converted.")).toBeInTheDocument()
  })
})
