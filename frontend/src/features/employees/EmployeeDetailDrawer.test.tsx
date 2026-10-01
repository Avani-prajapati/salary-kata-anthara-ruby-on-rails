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

    const fetchMock = vi.mocked(globalThis.fetch)
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/employees/42")
  })

  it("shows a Remove button in the read-only view", async () => {
    renderDrawer(1)

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument()
    })

    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument()
  })

  it("opens the delete confirmation dialog when Remove is clicked", async () => {
    renderDrawer(1)

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument()
    })

    const removeButton = screen.getAllByRole("button", { name: "Remove" })[0]
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    })
    expect(screen.getByText(/Are you sure you want to remove Ada Lovelace/)).toBeInTheDocument()
  })

  it("does not issue a delete request when the delete dialog is cancelled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEmployee,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
        })
    )

    renderDrawer(1)

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument()
    })

    const removeButton = screen.getAllByRole("button", { name: "Remove" })[0]
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole("button", { name: "Cancel" })
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    })

    const fetchMock = vi.mocked(globalThis.fetch)
    const deleteCall = fetchMock.mock.calls.find(
      call => call[0] === "http://localhost:3000/api/employees/1" && call[1]?.method === "DELETE"
    )
    expect(deleteCall).toBeUndefined()
  })

  it("issues a DELETE request when the delete dialog is confirmed", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployee,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
      })
    vi.stubGlobal("fetch", fetchMock)

    renderDrawer(1)

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument()
    })

    const removeButton = screen.getAllByRole("button", { name: "Remove" })[0]
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    })

    const confirmButton = screen.getByRole("button", { name: "Remove" })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/employees/1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })
    })
  })
})
