import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PaySummaryTable } from "./PaySummaryTable"
import type { PaySummary } from "./types"

const canadaPaidInTwoCurrencies: PaySummary[] = [
  {
    group_key: "CAN",
    currency: "CAD",
    headcount: 3,
    total_cost: "225000.0",
    min_salary: "60000.0",
    avg_salary: "75000.0",
    median_salary: "70000.0",
    max_salary: "95000.0",
  },
  {
    group_key: "CAN",
    currency: "USD",
    headcount: 2,
    total_cost: "230001.0",
    min_salary: "100000.0",
    avg_salary: "115000.5",
    median_salary: "115000.5",
    max_salary: "130001.0",
  },
]

describe("pay summary breakdown table", () => {
  it("renders a separate row for each group and currency pair rather than blending currencies", () => {
    render(<PaySummaryTable rows={canadaPaidInTwoCurrencies} groupLabel="Country" />)

    const [, cadRow, usdRow] = screen.getAllByRole("row")

    expect(screen.getAllByRole("row")).toHaveLength(canadaPaidInTwoCurrencies.length + 1)
    expect(within(cadRow).getByText("CAD")).toBeInTheDocument()
    expect(within(cadRow).getByText("CAD 225,000.00")).toBeInTheDocument()
    expect(within(cadRow).getByText("CAD 70,000.00")).toBeInTheDocument()
    expect(within(usdRow).getByText("USD")).toBeInTheDocument()
    expect(within(usdRow).getByText("USD 230,001.00")).toBeInTheDocument()
    expect(within(usdRow).getAllByText("USD 115,000.50")).toHaveLength(2)
  })

  it("labels the grouping column with the selected dimension", () => {
    render(<PaySummaryTable rows={canadaPaidInTwoCurrencies} groupLabel="Department" />)

    expect(screen.getByRole("columnheader", { name: "Department" })).toBeInTheDocument()
  })

  it("discloses that amounts are shown as paid and not currency-converted", () => {
    render(<PaySummaryTable rows={canadaPaidInTwoCurrencies} groupLabel="Country" />)

    expect(screen.getByText("Amounts shown as paid, not currency-converted.")).toBeVisible()
  })
})
