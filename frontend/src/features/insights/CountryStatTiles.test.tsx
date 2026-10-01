import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CountryStatTiles } from "./CountryStatTiles"
import type { PaySummary } from "./types"

function summary(overrides: Partial<PaySummary>): PaySummary {
  return {
    group_key: "GBR",
    currency: "GBP",
    headcount: 1,
    total_cost: "95000.0",
    min_salary: "95000.0",
    avg_salary: "95000.0",
    median_salary: "95000.0",
    max_salary: "95000.0",
    ...overrides,
  }
}

describe("per-country headcount and payroll cost tiles", () => {
  it("shows one tile per country with its headcount and payroll cost", () => {
    render(<CountryStatTiles rows={[summary({})]} />)

    const gbrTile = screen.getByRole("listitem")

    expect(within(gbrTile).getByRole("heading", { name: "GBR" })).toBeInTheDocument()
    expect(within(gbrTile).getByText("1")).toBeInTheDocument()
    expect(within(gbrTile).getByText("GBP 95,000.00")).toBeInTheDocument()
  })

  it("lists payroll cost per currency for a country paying in two currencies, never one blended total", () => {
    render(
      <CountryStatTiles
        rows={[
          summary({ group_key: "CAN", currency: "CAD", headcount: 3, total_cost: "225000.0" }),
          summary({ group_key: "CAN", currency: "USD", headcount: 2, total_cost: "230001.0" }),
        ]}
      />,
    )

    const canadaTile = screen.getByRole("listitem")

    expect(within(canadaTile).getByText("5")).toBeInTheDocument()
    expect(within(canadaTile).getByText("CAD 225,000.00")).toBeInTheDocument()
    expect(within(canadaTile).getByText("USD 230,001.00")).toBeInTheDocument()
  })
})
