export type PaySummaryGroupBy = "country" | "department" | "job_title"

export interface PaySummary {
  group_key: string
  currency: string
  headcount: number
  total_cost: string
  min_salary: string
  avg_salary: string
  median_salary: string
  max_salary: string
}
