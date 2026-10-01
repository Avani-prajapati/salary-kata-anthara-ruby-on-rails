import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import type { SortingState } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { fetchEmployees } from "@/lib/api"
import { AddEmployeeButton } from "./AddEmployeeButton"
import { EmployeeTable } from "./EmployeeTable"
import { EmployeeDetailDrawer } from "./EmployeeDetailDrawer"
import { FilterBar } from "./FilterBar"
import { usePagination } from "./usePagination"
import type { Employee, EmployeeFilters, EmployeeSortColumn } from "./types"

const EMPTY_EMPLOYEES: Employee[] = []
const DEFAULT_SORTING: SortingState = [{ id: "last_name", desc: false }]
const DEFAULT_FILTERS: EmployeeFilters = {}

export function EmployeesPage() {
  const { page, perPage, setPage } = usePagination()
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [filters, setFilters] = useState<EmployeeFilters>(DEFAULT_FILTERS)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const activeSort = sorting[0]

  function handleFilterChange(nextFilters: EmployeeFilters) {
    setFilters(nextFilters)
    setPage(1)
  }

  const employeesQuery = useQuery({
    queryKey: ["employees", page, perPage, activeSort, filters],
    queryFn: () =>
      fetchEmployees({
        page,
        perPage,
        sort: activeSort?.id as EmployeeSortColumn | undefined,
        direction: activeSort?.desc ? "desc" : "asc",
        ...filters,
      }),
  })

  const employees = employeesQuery.data?.employees ?? EMPTY_EMPLOYEES
  const pagination = employeesQuery.data?.pagination

  return (
    <section>
      <h1>Employees</h1>
      <AddEmployeeButton />
      <FilterBar filters={filters} onFilterChange={handleFilterChange} />
      <EmployeeTable
        data={employees}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={employeesQuery.isPending}
        onRowClick={setSelectedEmployeeId}
      />
      {pagination && (
        <nav aria-label="Employee directory pagination">
          <Button type="button" variant="outline" onClick={() => setPage(page - 1)} disabled={page <= 1}>
            Previous
          </Button>
          <span>
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.total_pages}
          >
            Next
          </Button>
        </nav>
      )}
      <EmployeeDetailDrawer employeeId={selectedEmployeeId} onClose={() => setSelectedEmployeeId(null)} />
    </section>
  )
}
