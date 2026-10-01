import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { EmployeeDetailDrawer } from "./EmployeeDetailDrawer"
import type { Employee } from "./types"

const mockEmployee: Employee = {
  id: 1,
  first_name: "Ada",
  last_name: "Lovelace",
  job_title: "Software Engineer",
  department: "Engineering",
  country: "GBR",
  salary_amount: "95000.0",
  salary_currency: "GBP",
  hire_date: "2019-05-01",
  email: "ada.lovelace@acme.example",
}

function renderDrawer(
  employeeId: number | null,
  onClose: () => void = vi.fn(),
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <EmployeeDetailDrawer employeeId={employeeId} onClose={onClose} />
    </QueryClientProvider>,
  )
}

describe("employee detail drawer", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockEmployee,
      }),
    )
  })

  it("renders nothing when employeeId is null", () => {
    const { container } = renderDrawer(null)

    expect(container.firstChild).toBeNull()
  })

  it("renders employee details when employeeId is set", async () => {
    renderDrawer(1)

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument()
    })

    expect(screen.getByText("Software Engineer")).toBeInTheDocument()
    expect(screen.getByText("Engineering")).toBeInTheDocument()
    expect(screen.getByText("GBR")).toBeInTheDocument()
    expect(screen.getByText(/95000.0 GBP/)).toBeInTheDocument()
    expect(screen.getByText("2019-05-01")).toBeInTheDocument()
  })

  it("calls onClose when the drawer close button is clicked", async () => {
    const onClose = vi.fn()
    renderDrawer(1, onClose)

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument()
    })

    const closeButton = screen.getByRole("button", { name: "Close" })
    fireEvent.click(closeButton)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it("shows a loading state while fetching employee details", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementationOnce(() =>
        new Promise(() => {
          /* never resolves to stay loading */
        }),
      ),
    )

    renderDrawer(1)

    expect(screen.getByRole("status")).toHaveTextContent(/loading employee details/i)
  })

  it("fetches the correct employee by id", async () => {
    renderDrawer(42)

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument()
    })

    const fetchMock = vi.mocked(global.fetch)
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/employees/42")
  })
})
