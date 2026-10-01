import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { COUNTRIES, DEPARTMENTS, JOB_TITLES } from "./employeeFilterOptions"
import { employeeFormSchema, type EmployeeFormInput, type EmployeeFormValues } from "./employeeFormSchema"

const SELECT_CLASS_NAME =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const FORM_FIELDS = Object.keys(employeeFormSchema.shape) as (keyof EmployeeFormInput)[]

const FIELD_LABELS: Record<keyof EmployeeFormInput, string> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  job_title: "Job title",
  department: "Department",
  country: "Country",
  hire_date: "Hire date",
  salary_amount: "Salary amount",
  salary_currency: "Salary currency",
}

function isFormField(field: string): field is keyof EmployeeFormInput {
  return (FORM_FIELDS as string[]).includes(field)
}

interface EmployeeFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<EmployeeFormInput>
  onSubmit: (values: EmployeeFormValues) => void
  serverErrors?: Record<string, string[]>
}

export function EmployeeForm({ mode, defaultValues, onSubmit, serverErrors }: EmployeeFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EmployeeFormInput, unknown, EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!serverErrors) return

    for (const [field, messages] of Object.entries(serverErrors)) {
      if (isFormField(field) && messages[0]) {
        setError(field, { type: "server", message: messages[0] })
      }
    }
  }, [serverErrors, setError])

  const submitLabel = mode === "create" ? "Add employee" : "Save changes"
  const invalidFields = FORM_FIELDS.map((field) => ({ field, message: errors[field]?.message })).filter(
    (entry): entry is { field: keyof EmployeeFormInput; message: string } => Boolean(entry.message),
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {invalidFields.length > 0 && (
        <div role="alert">
          <p>Please fix the following {invalidFields.length === 1 ? "error" : "errors"}:</p>
          <ul>
            {invalidFields.map(({ field, message }) => (
              <li key={field}>
                {FIELD_LABELS[field]}: {message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <Label htmlFor="employee-first-name">First name</Label>
        <Input
          id="employee-first-name"
          aria-required="true"
          aria-describedby="employee-first-name-error"
          {...register("first_name")}
        />
        {errors.first_name && <p id="employee-first-name-error">{errors.first_name.message}</p>}
      </div>

      <div>
        <Label htmlFor="employee-last-name">Last name</Label>
        <Input
          id="employee-last-name"
          aria-required="true"
          aria-describedby="employee-last-name-error"
          {...register("last_name")}
        />
        {errors.last_name && <p id="employee-last-name-error">{errors.last_name.message}</p>}
      </div>

      <div>
        <Label htmlFor="employee-email">Email</Label>
        <Input
          id="employee-email"
          type="email"
          aria-required="true"
          aria-describedby="employee-email-error"
          {...register("email")}
        />
        {errors.email && <p id="employee-email-error">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="employee-job-title">Job title</Label>
        <select
          id="employee-job-title"
          className={SELECT_CLASS_NAME}
          aria-required="true"
          aria-describedby="employee-job-title-error"
          defaultValue=""
          {...register("job_title")}
        >
          <option value="" disabled>
            Select a job title
          </option>
          {JOB_TITLES.map((jobTitle) => (
            <option key={jobTitle} value={jobTitle}>
              {jobTitle}
            </option>
          ))}
        </select>
        {errors.job_title && <p id="employee-job-title-error">{errors.job_title.message}</p>}
      </div>

      <div>
        <Label htmlFor="employee-department">Department</Label>
        <select
          id="employee-department"
          className={SELECT_CLASS_NAME}
          aria-required="true"
          aria-describedby="employee-department-error"
          defaultValue=""
          {...register("department")}
        >
          <option value="" disabled>
            Select a department
          </option>
          {DEPARTMENTS.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
        {errors.department && <p id="employee-department-error">{errors.department.message}</p>}
      </div>

      <div>
        <Label htmlFor="employee-country">Country</Label>
        <select
          id="employee-country"
          className={SELECT_CLASS_NAME}
          aria-required="true"
          aria-describedby="employee-country-error"
          defaultValue=""
          {...register("country")}
        >
          <option value="" disabled>
            Select a country
          </option>
          {COUNTRIES.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
        {errors.country && <p id="employee-country-error">{errors.country.message}</p>}
      </div>

      <div>
        <Label htmlFor="employee-hire-date">Hire date</Label>
        <Input
          id="employee-hire-date"
          type="date"
          aria-required="true"
          aria-describedby="employee-hire-date-error"
          {...register("hire_date")}
        />
        {errors.hire_date && <p id="employee-hire-date-error">{errors.hire_date.message}</p>}
      </div>

      <div>
        <Label htmlFor="employee-salary-amount">Salary amount</Label>
        <Input
          id="employee-salary-amount"
          type="number"
          step="0.01"
          aria-required="true"
          aria-describedby="employee-salary-amount-error"
          {...register("salary_amount")}
        />
        {errors.salary_amount && <p id="employee-salary-amount-error">{errors.salary_amount.message}</p>}
      </div>

      <div>
        <Label htmlFor="employee-salary-currency">Salary currency</Label>
        <Input
          id="employee-salary-currency"
          aria-required="true"
          aria-describedby="employee-salary-currency-error"
          {...register("salary_currency")}
        />
        {errors.salary_currency && <p id="employee-salary-currency-error">{errors.salary_currency.message}</p>}
      </div>

      <Button type="submit">{submitLabel}</Button>
    </form>
  )
}
