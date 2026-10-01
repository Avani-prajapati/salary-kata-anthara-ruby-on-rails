import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchEmployee, updateEmployee, deleteEmployee, EmployeeValidationError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EmployeeForm } from "./EmployeeForm"
import type { EmployeeFormValues } from "./employeeFormSchema"

interface EmployeeDetailDrawerProps {
  employeeId: number | null
  onClose: () => void
}

export function EmployeeDetailDrawer({ employeeId, onClose }: EmployeeDetailDrawerProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const isOpen = employeeId !== null
  const queryClient = useQueryClient()

  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: () => fetchEmployee(employeeId!),
    enabled: isOpen,
  })

  const updateEmployeeMutation = useMutation({
    mutationFn: (values: Partial<EmployeeFormValues>) => updateEmployee(employeeId!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] })
      setIsEditMode(false)
      setFieldErrors(undefined)
    },
    onError: (error) => {
      setFieldErrors(error instanceof EmployeeValidationError ? error.fieldErrors : undefined)
    },
  })

  const deleteEmployeeMutation = useMutation({
    mutationFn: () => deleteEmployee(employeeId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      queryClient.invalidateQueries({ queryKey: ["pay-summary"] })
      setIsDeleteDialogOpen(false)
      onClose()
    },
  })

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose()
      setIsEditMode(false)
      setFieldErrors(undefined)
      setIsDeleteDialogOpen(false)
    }
  }

  function handleDeleteConfirm() {
    deleteEmployeeMutation.mutate()
  }

  function handleEditSubmit(values: Partial<EmployeeFormValues>) {
    updateEmployeeMutation.mutate(values)
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right">
          {isLoading ? (
            <div role="status">Loading employee details…</div>
          ) : employee ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  {isEditMode ? "Edit employee" : `${employee.first_name} ${employee.last_name}`}
                </SheetTitle>
              </SheetHeader>
              {isEditMode ? (
                <EmployeeForm
                  mode="edit"
                  defaultValues={employee}
                  onSubmit={handleEditSubmit}
                  serverErrors={fieldErrors}
                />
              ) : (
                <>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <p className="text-sm text-muted-foreground">{employee.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Job Title</label>
                      <p className="text-sm text-muted-foreground">{employee.job_title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Department</label>
                      <p className="text-sm text-muted-foreground">{employee.department}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Country</label>
                      <p className="text-sm text-muted-foreground">{employee.country}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Salary</label>
                      <p className="text-sm text-muted-foreground">
                        {employee.salary_amount} {employee.salary_currency}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Hire Date</label>
                      <p className="text-sm text-muted-foreground">{employee.hire_date}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button onClick={() => setIsEditMode(true)}>
                      Edit
                    </Button>
                    <Button
                      onClick={() => setIsDeleteDialogOpen(true)}
                      variant="destructive"
                    >
                      Remove
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div role="status">Unable to load employee details</div>
          )}
        </SheetContent>
      </Sheet>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {employee?.first_name} {employee?.last_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
