import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { EmployeeForm } from "./EmployeeForm"

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

describe("employee create/edit form", () => {
  it("calls onSubmit with the parsed values once every field is valid", async () => {
    const onSubmit = vi.fn()
    render(<EmployeeForm mode="create" onSubmit={onSubmit} />)

    fillValidForm()
    fireEvent.click(screen.getByRole("button", { name: "Add employee" }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
    expect(onSubmit.mock.calls[0][0]).toEqual({
      first_name: "Nina",
      last_name: "Simone",
      email: "nina.simone@acme.example",
      job_title: "Software Engineer",
      department: "Engineering",
      country: "USA",
      hire_date: "2023-02-14",
      salary_amount: 75000,
      salary_currency: "USD",
    })
  })

  it("blocks submission and shows a field error for a negative salary", async () => {
    const onSubmit = vi.fn()
    render(<EmployeeForm mode="create" onSubmit={onSubmit} />)

    fillValidForm()
    fireEvent.change(screen.getByLabelText("Salary amount"), { target: { value: "-500" } })
    fireEvent.click(screen.getByRole("button", { name: "Add employee" }))

    await waitFor(() => {
      expect(screen.getByText("Salary must be zero or greater")).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("blocks submission and shows a field error for a missing required field", async () => {
    const onSubmit = vi.fn()
    render(<EmployeeForm mode="create" onSubmit={onSubmit} />)

    fillValidForm()
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Add employee" }))

    await waitFor(() => {
      expect(screen.getByText("First name is required")).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("surfaces a server-side field error, such as a duplicate email, inline on the offending field", async () => {
    const onSubmit = vi.fn()
    const { rerender } = render(<EmployeeForm mode="create" onSubmit={onSubmit} />)

    fillValidForm()
    rerender(
      <EmployeeForm mode="create" onSubmit={onSubmit} serverErrors={{ email: ["has already been taken"] }} />,
    )

    await waitFor(() => {
      expect(screen.getByText("has already been taken")).toBeInTheDocument()
    })
  })
})
