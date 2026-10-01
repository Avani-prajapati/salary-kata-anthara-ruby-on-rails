import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { EmployeeTable } from "./EmployeeTable"
import type { Employee } from "./types"

const employees: Employee[] = [
  {
    id: 1,
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada.lovelace@acme.example",
    job_title: "Software Engineer",
    department: "Engineering",
    country: "GBR",
    salary_amount: "95000.0",
    salary_currency: "GBP",
    hire_date: "2019-05-01",
  },
  {
    id: 2,
    first_name: "Grace",
    last_name: "Hopper",
    email: "grace.hopper@acme.example",
    job_title: "Senior Software Engineer",
    department: "Engineering",
    country: "USA",
    salary_amount: "120000.0",
    salary_currency: "USD",
    hire_date: "2015-03-12",
  },
]

describe("employee directory table", () => {
  it("renders one row per employee with their key fields", () => {
    render(<EmployeeTable data={employees} sorting={[]} onSortingChange={vi.fn()} isLoading={false} />)

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument()
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument()
    expect(screen.getByText("95000.0 GBP")).toBeInTheDocument()
    expect(screen.getAllByRole("row")).toHaveLength(employees.length + 1)
  })

  it("tells the HR Manager no employees match when the page is empty", () => {
    render(<EmployeeTable data={[]} sorting={[]} onSortingChange={vi.fn()} isLoading={false} />)

    expect(screen.getByText(/no employees match/i)).toBeInTheDocument()
  })

  it("shows a loading indicator while the directory is being fetched", () => {
    render(<EmployeeTable data={[]} sorting={[]} onSortingChange={vi.fn()} isLoading={true} />)

    expect(screen.getByRole("status")).toHaveTextContent(/loading/i)
  })
})
