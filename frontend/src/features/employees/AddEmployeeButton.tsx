import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { createEmployee, EmployeeValidationError } from "@/lib/api"
import { EmployeeForm } from "./EmployeeForm"
import type { EmployeeFormValues } from "./employeeFormSchema"

export function AddEmployeeButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined)
  const queryClient = useQueryClient()

  const createEmployeeMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      setIsOpen(false)
    },
    onError: (error) => {
      setFieldErrors(error instanceof EmployeeValidationError ? error.fieldErrors : undefined)
    },
  })

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    setFieldErrors(undefined)
  }

  function handleSubmit(values: EmployeeFormValues) {
    createEmployeeMutation.mutate(values)
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button type="button">Add employee</Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Add employee</SheetTitle>
        </SheetHeader>
        <EmployeeForm mode="create" onSubmit={handleSubmit} serverErrors={fieldErrors} />
      </SheetContent>
    </Sheet>
  )
}
