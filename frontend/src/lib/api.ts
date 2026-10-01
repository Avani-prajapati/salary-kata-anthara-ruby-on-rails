import type { EmployeeListParams, EmployeeListResponse, Employee } from "@/features/employees/types"
import type { EmployeeFormValues } from "@/features/employees/employeeFormSchema"

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000"

export async function fetchEmployees(params: EmployeeListParams = {}): Promise<EmployeeListResponse> {
  const query = new URLSearchParams()

  if (params.page !== undefined) query.set("page", String(params.page))
  if (params.perPage !== undefined) query.set("per_page", String(params.perPage))
  if (params.sort !== undefined) query.set("sort", params.sort)
  if (params.direction !== undefined) query.set("direction", params.direction)
  if (params.country !== undefined) query.set("country", params.country)
  if (params.department !== undefined) query.set("department", params.department)
  if (params.jobTitle !== undefined) query.set("job_title", params.jobTitle)
  if (params.minSalary !== undefined) query.set("min_salary", params.minSalary)
  if (params.maxSalary !== undefined) query.set("max_salary", params.maxSalary)
  if (params.q !== undefined) query.set("q", params.q)

  const response = await fetch(`${API_BASE_URL}/api/employees?${query.toString()}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch employees (status ${response.status})`)
  }

  return response.json() as Promise<EmployeeListResponse>
}

export async function fetchEmployee(id: string | number): Promise<Employee> {
  const response = await fetch(`${API_BASE_URL}/api/employees/${id}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch employee (status ${response.status})`)
  }

  return response.json() as Promise<Employee>
}

export class EmployeeValidationError extends Error {
  fieldErrors: Record<string, string[]>

  constructor(fieldErrors: Record<string, string[]>) {
    super("Employee validation failed")
    this.name = "EmployeeValidationError"
    this.fieldErrors = fieldErrors
  }
}

export async function createEmployee(payload: EmployeeFormValues): Promise<Employee> {
  const response = await fetch(`${API_BASE_URL}/api/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employee: payload }),
  })

  if (response.status === 422) {
    const body = await response.json()
    throw new EmployeeValidationError(body.error?.details ?? {})
  }

  if (!response.ok) {
    throw new Error(`Failed to create employee (status ${response.status})`)
  }

  return response.json() as Promise<Employee>
}

export async function updateEmployee(id: string | number, payload: Partial<EmployeeFormValues>): Promise<Employee> {
  const response = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employee: payload }),
  })

  if (response.status === 422) {
    const body = await response.json()
    throw new EmployeeValidationError(body.error?.details ?? {})
  }

  if (!response.ok) {
    throw new Error(`Failed to update employee (status ${response.status})`)
  }

  return response.json() as Promise<Employee>
}
