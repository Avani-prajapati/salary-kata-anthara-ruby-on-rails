import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FilterBar } from "./FilterBar"

describe("employee directory filter bar", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("applies a country selection immediately without waiting for debounce", () => {
    const onFilterChange = vi.fn()
    render(<FilterBar filters={{}} onFilterChange={onFilterChange} />)

    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "DEU" } })

    expect(onFilterChange).toHaveBeenCalledWith({ country: "DEU" })
  })

  it("applies a department selection combined with the already-active filters", () => {
    const onFilterChange = vi.fn()
    render(<FilterBar filters={{ country: "DEU" }} onFilterChange={onFilterChange} />)

    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "Legal" } })

    expect(onFilterChange).toHaveBeenCalledWith({ country: "DEU", department: "Legal" })
  })

  it("applies a job title selection", () => {
    const onFilterChange = vi.fn()
    render(<FilterBar filters={{}} onFilterChange={onFilterChange} />)

    fireEvent.change(screen.getByLabelText("Job title"), { target: { value: "Data Scientist" } })

    expect(onFilterChange).toHaveBeenCalledWith({ jobTitle: "Data Scientist" })
  })

  it("clears a select back to unfiltered when 'All ...' is chosen", () => {
    const onFilterChange = vi.fn()
    render(<FilterBar filters={{ country: "DEU" }} onFilterChange={onFilterChange} />)

    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "all" } })

    expect(onFilterChange).toHaveBeenCalledWith({ country: undefined })
  })

  it("debounces a search term before notifying of the filter change", () => {
    const onFilterChange = vi.fn()
    render(<FilterBar filters={{}} onFilterChange={onFilterChange} />)

    fireEvent.change(screen.getByLabelText("Search by name or email"), { target: { value: "Lovelace" } })
    expect(onFilterChange).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)

    expect(onFilterChange).toHaveBeenCalledWith({ q: "Lovelace", minSalary: undefined, maxSalary: undefined })
  })

  it("debounces a salary range before notifying of the filter change", () => {
    const onFilterChange = vi.fn()
    render(<FilterBar filters={{}} onFilterChange={onFilterChange} />)

    fireEvent.change(screen.getByLabelText("Minimum salary"), { target: { value: "50000" } })
    fireEvent.change(screen.getByLabelText("Maximum salary"), { target: { value: "90000" } })
    vi.advanceTimersByTime(300)

    expect(onFilterChange).toHaveBeenCalledWith({ q: undefined, minSalary: "50000", maxSalary: "90000" })
  })

  it("clears every filter when the Clear filters action is used", () => {
    const onFilterChange = vi.fn()
    render(<FilterBar filters={{ country: "DEU", q: "Lovelace" }} onFilterChange={onFilterChange} />)

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))

    expect(onFilterChange).toHaveBeenCalledWith({})
  })
})
