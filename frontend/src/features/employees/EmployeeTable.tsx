import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type OnChangeFn,
  type SortDirection as TableSortDirection,
  type SortingState,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Employee } from "./types"

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})

const columnHelper = createColumnHelper<typeof features, Employee>()

const columns = columnHelper.columns([
  columnHelper.accessor((employee) => `${employee.first_name} ${employee.last_name}`, {
    id: "last_name",
    header: "Name",
  }),
  columnHelper.accessor("job_title", { header: "Job Title", enableSorting: false }),
  columnHelper.accessor("department", { header: "Department" }),
  columnHelper.accessor("country", { header: "Country" }),
  columnHelper.accessor((employee) => `${employee.salary_amount} ${employee.salary_currency}`, {
    id: "salary_amount",
    header: "Salary",
  }),
  columnHelper.accessor("hire_date", { header: "Hire Date" }),
])

function ariaSortFor(sorted: false | TableSortDirection): "ascending" | "descending" | "none" {
  if (sorted === "asc") return "ascending"
  if (sorted === "desc") return "descending"
  return "none"
}

function SortIndicator({ direction }: { direction: false | TableSortDirection }) {
  if (direction === "asc") return <ArrowUp aria-hidden="true" className="inline size-3.5" />
  if (direction === "desc") return <ArrowDown aria-hidden="true" className="inline size-3.5" />
  return <ArrowUpDown aria-hidden="true" className="inline size-3.5 opacity-50" />
}

interface EmployeeTableProps {
  data: Employee[]
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  isLoading: boolean
  onRowClick?: (employeeId: number) => void
}

export function EmployeeTable({ data, sorting, onSortingChange, isLoading, onRowClick }: EmployeeTableProps) {
  const table = useTable({
    features,
    columns,
    data,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
  })

  if (isLoading) {
    return <p role="status">Loading employees…</p>
  }

  if (data.length === 0) {
    return <p>No employees match the current view.</p>
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const sortDirection = header.column.getCanSort() ? header.column.getIsSorted() : false

              return (
                <TableHead key={header.id} aria-sort={header.column.getCanSort() ? ariaSortFor(sortDirection) : undefined}>
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button type="button" onClick={header.column.getToggleSortingHandler()}>
                      <table.FlexRender header={header} /> <SortIndicator direction={sortDirection} />
                    </button>
                  ) : (
                    <table.FlexRender header={header} />
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            onClick={() => onRowClick?.(row.original.id)}
            className={onRowClick ? "cursor-pointer hover:bg-muted" : ""}
            role={onRowClick ? "button" : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={
              onRowClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onRowClick(row.original.id)
                    }
                  }
                : undefined
            }
          >
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
