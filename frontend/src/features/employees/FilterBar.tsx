import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { COUNTRIES, DEPARTMENTS, JOB_TITLES } from "./employeeFilterOptions"
import type { EmployeeFilters } from "./types"

const DEBOUNCE_MS = 300
const ALL_OPTIONS_VALUE = "all"
const SELECT_CLASS_NAME =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

type SelectField = "country" | "department" | "jobTitle"

interface FilterBarProps {
  filters: EmployeeFilters
  onFilterChange: (filters: EmployeeFilters) => void
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const [searchDraft, setSearchDraft] = useState(filters.q ?? "")
  const [minSalaryDraft, setMinSalaryDraft] = useState(filters.minSalary ?? "")
  const [maxSalaryDraft, setMaxSalaryDraft] = useState(filters.maxSalary ?? "")
  const latestFilters = useRef(filters)

  useEffect(() => {
    latestFilters.current = filters
  }, [filters])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onFilterChange({
        ...latestFilters.current,
        q: searchDraft || undefined,
        minSalary: minSalaryDraft || undefined,
        maxSalary: maxSalaryDraft || undefined,
      })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timeoutId)
  }, [searchDraft, minSalaryDraft, maxSalaryDraft, onFilterChange])

  function handleSelectChange(field: SelectField, value: string) {
    onFilterChange({ ...filters, [field]: value === ALL_OPTIONS_VALUE ? undefined : value })
  }

  function handleClearFilters() {
    setSearchDraft("")
    setMinSalaryDraft("")
    setMaxSalaryDraft("")
    onFilterChange({})
  }

  return (
    <fieldset>
      <legend>Filter employees</legend>

      <div>
        <Label htmlFor="filter-country">Country</Label>
        <select
          id="filter-country"
          className={SELECT_CLASS_NAME}
          value={filters.country ?? ALL_OPTIONS_VALUE}
          onChange={(event) => handleSelectChange("country", event.target.value)}
        >
          <option value={ALL_OPTIONS_VALUE}>All countries</option>
          {COUNTRIES.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="filter-department">Department</Label>
        <select
          id="filter-department"
          className={SELECT_CLASS_NAME}
          value={filters.department ?? ALL_OPTIONS_VALUE}
          onChange={(event) => handleSelectChange("department", event.target.value)}
        >
          <option value={ALL_OPTIONS_VALUE}>All departments</option>
          {DEPARTMENTS.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="filter-job-title">Job title</Label>
        <select
          id="filter-job-title"
          className={SELECT_CLASS_NAME}
          value={filters.jobTitle ?? ALL_OPTIONS_VALUE}
          onChange={(event) => handleSelectChange("jobTitle", event.target.value)}
        >
          <option value={ALL_OPTIONS_VALUE}>All job titles</option>
          {JOB_TITLES.map((jobTitle) => (
            <option key={jobTitle} value={jobTitle}>
              {jobTitle}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="filter-min-salary">Minimum salary</Label>
        <Input
          id="filter-min-salary"
          type="number"
          value={minSalaryDraft}
          onChange={(event) => setMinSalaryDraft(event.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="filter-max-salary">Maximum salary</Label>
        <Input
          id="filter-max-salary"
          type="number"
          value={maxSalaryDraft}
          onChange={(event) => setMaxSalaryDraft(event.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="filter-search">Search by name or email</Label>
        <Input
          id="filter-search"
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
        />
      </div>

      <Button type="button" variant="outline" onClick={handleClearFilters}>
        Clear filters
      </Button>
    </fieldset>
  )
}
