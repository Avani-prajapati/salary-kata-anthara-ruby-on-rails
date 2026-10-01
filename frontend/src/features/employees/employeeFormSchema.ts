import { z } from "zod"
import { COUNTRIES, DEPARTMENTS, JOB_TITLES } from "./employeeFilterOptions"

const CURRENCY_FORMAT = /^[A-Z]{3}$/

export const employeeFormSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  job_title: z.enum(JOB_TITLES as [string, ...string[]], { message: "Select a job title" }),
  department: z.enum(DEPARTMENTS as [string, ...string[]], { message: "Select a department" }),
  country: z.enum(COUNTRIES as [string, ...string[]], { message: "Select a country" }),
  hire_date: z.string().trim().min(1, "Hire date is required"),
  salary_amount: z.coerce.number({ message: "Salary must be a number" }).min(0, "Salary must be zero or greater"),
  salary_currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(CURRENCY_FORMAT, "Currency must be a 3-letter ISO code, e.g. USD"),
})

export type EmployeeFormInput = z.input<typeof employeeFormSchema>
export type EmployeeFormValues = z.output<typeof employeeFormSchema>
