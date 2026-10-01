import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatMoney } from "./formatMoney"
import type { PaySummary } from "./types"

export const AS_PAID_DISCLOSURE = "Amounts shown as paid, not currency-converted."

interface PaySummaryTableProps {
  rows: PaySummary[]
  groupLabel: string
}

export function PaySummaryTable({ rows, groupLabel }: PaySummaryTableProps) {
  return (
    <Table>
      <TableCaption>{AS_PAID_DISCLOSURE}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{groupLabel}</TableHead>
          <TableHead scope="col">Currency</TableHead>
          <TableHead scope="col">Headcount</TableHead>
          <TableHead scope="col">Total payroll cost</TableHead>
          <TableHead scope="col">Minimum salary</TableHead>
          <TableHead scope="col">Average salary</TableHead>
          <TableHead scope="col">Median salary</TableHead>
          <TableHead scope="col">Maximum salary</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.group_key}-${row.currency}`}>
            <TableCell>{row.group_key}</TableCell>
            <TableCell>{row.currency}</TableCell>
            <TableCell>{row.headcount}</TableCell>
            <TableCell>{formatMoney(row.total_cost, row.currency)}</TableCell>
            <TableCell>{formatMoney(row.min_salary, row.currency)}</TableCell>
            <TableCell>{formatMoney(row.avg_salary, row.currency)}</TableCell>
            <TableCell>{formatMoney(row.median_salary, row.currency)}</TableCell>
            <TableCell>{formatMoney(row.max_salary, row.currency)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
