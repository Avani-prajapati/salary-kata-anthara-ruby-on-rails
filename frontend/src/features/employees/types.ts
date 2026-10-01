export type EmployeeSortColumn = "last_name" | "department" | "country" | "salary_amount" | "hire_date"

export type SortDirection = "asc" | "desc"

export interface Employee {
  id: number
  first_name: string
  last_name: string
  job_title: string
  department: string
  country: string
  salary_amount: string
  salary_currency: string
  hire_date: string
}

export interface PaginationEnvelope {
  page: number
  per_page: number
  total_count: number
  total_pages: number
}

export interface EmployeeFilters {
  country?: string
  department?: string
  jobTitle?: string
  minSalary?: string
  maxSalary?: string
  q?: string
}

export interface EmployeeListParams extends EmployeeFilters {
  page?: number
  perPage?: number
  sort?: EmployeeSortColumn
  direction?: SortDirection
}

export interface EmployeeListResponse {
  employees: Employee[]
  pagination: PaginationEnvelope
}
