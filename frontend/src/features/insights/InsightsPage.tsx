import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { fetchPaySummary } from "@/lib/api"
import { CountryStatTiles } from "./CountryStatTiles"
import { PaySummaryTable } from "./PaySummaryTable"
import type { PaySummaryGroupBy } from "./types"

const SELECT_CLASS_NAME =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const GROUP_BY_LABELS: Record<PaySummaryGroupBy, string> = {
  country: "Country",
  department: "Department",
  job_title: "Job title",
}

function usePaySummary(groupBy: PaySummaryGroupBy) {
  return useQuery({
    queryKey: ["pay-summary", groupBy],
    queryFn: () => fetchPaySummary(groupBy),
  })
}

export function InsightsPage() {
  const [groupBy, setGroupBy] = useState<PaySummaryGroupBy>("country")
  const countrySummary = usePaySummary("country")
  const breakdownSummary = usePaySummary(groupBy)

  return (
    <section>
      <h1>Pay insights</h1>

      <h2>By country</h2>
      {countrySummary.data ? (
        <CountryStatTiles rows={countrySummary.data} />
      ) : (
        <QueryStatus isError={countrySummary.isError} />
      )}

      <h2>Salary distribution</h2>
      <div>
        <Label htmlFor="insights-group-by">Group by</Label>
        <select
          id="insights-group-by"
          className={SELECT_CLASS_NAME}
          value={groupBy}
          onChange={(event) => setGroupBy(event.target.value as PaySummaryGroupBy)}
        >
          {Object.entries(GROUP_BY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {breakdownSummary.data ? (
        <PaySummaryTable rows={breakdownSummary.data} groupLabel={GROUP_BY_LABELS[groupBy]} />
      ) : (
        <QueryStatus isError={breakdownSummary.isError} />
      )}
    </section>
  )
}

function QueryStatus({ isError }: { isError: boolean }) {
  return <p role="status">{isError ? "Unable to load pay insights." : "Loading pay insights…"}</p>
}
