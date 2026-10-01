import type { EmployeeListParams, EmployeeListResponse } from "@/features/employees/types"

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
