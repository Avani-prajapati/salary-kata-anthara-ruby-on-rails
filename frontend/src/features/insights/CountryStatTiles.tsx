import { formatMoney } from "./formatMoney"
import type { PaySummary } from "./types"

interface CountryStatTilesProps {
  rows: PaySummary[]
}

function groupByCountry(rows: PaySummary[]): Map<string, PaySummary[]> {
  return rows.reduce(
    (groups, row) => groups.set(row.group_key, [...(groups.get(row.group_key) ?? []), row]),
    new Map<string, PaySummary[]>(),
  )
}

export function CountryStatTiles({ rows }: CountryStatTilesProps) {
  const rowsByCountry = groupByCountry(rows)

  return (
    <ul aria-label="Headcount and payroll cost by country" className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {[...rowsByCountry].map(([country, countryRows]) => (
        <li key={country} className="rounded-lg border p-4">
          <h3 className="font-medium">{country}</h3>
          <dl className="text-sm">
            <dt className="text-muted-foreground">Headcount</dt>
            <dd>{countryRows.reduce((headcount, row) => headcount + row.headcount, 0)}</dd>
            <dt className="text-muted-foreground">Total payroll cost</dt>
            {countryRows.map((row) => (
              <dd key={row.currency}>{formatMoney(row.total_cost, row.currency)}</dd>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  )
}
