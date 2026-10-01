import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AddEmployeeButton } from "./AddEmployeeButton"

const createdEmployee = {
  id: 7,
  first_name: "Nina",
  last_name: "Simone",
  email: "nina.simone@acme.example",
  job_title: "Software Engineer",
  department: "Engineering",
  country: "USA",
  salary_amount: "75000",
  salary_currency: "USD",
  hire_date: "2023-02-14",
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Nina" } })
  fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Simone" } })
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nina.simone@acme.example" } })
  fireEvent.change(screen.getByLabelText("Job title"), { target: { value: "Software Engineer" } })
  fireEvent.change(screen.getByLabelText("Department"), { target: { value: "Engineering" } })
  fireEvent.change(screen.getByLabelText("Country"), { target: { value: "USA" } })
  fireEvent.change(screen.getByLabelText("Hire date"), { target: { value: "2023-02-14" } })
  fireEvent.change(screen.getByLabelText("Salary amount"), { target: { value: "75000" } })
  fireEvent.change(screen.getByLabelText("Salary currency"), { target: { value: "USD" } })
}

function renderAddEmployeeButton(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AddEmployeeButton />
    </QueryClientProvider>,
  )
}

describe("add employee button", () => {
  it("invalidates pay insights after successfully adding an employee", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => createdEmployee }),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    renderAddEmployeeButton(queryClient)

    fireEvent.click(screen.getByRole("button", { name: "Add employee" }))
    fillValidForm()

    const submitButtons = screen.getAllByRole("button", { name: "Add employee" })
    fireEvent.click(submitButtons[submitButtons.length - 1])

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["pay-summary"] })
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["employees"] })
  })
})
