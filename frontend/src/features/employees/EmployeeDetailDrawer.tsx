import { useQuery } from "@tanstack/react-query"
import { fetchEmployee } from "@/lib/api"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface EmployeeDetailDrawerProps {
  employeeId: number | null
  onClose: () => void
}

export function EmployeeDetailDrawer({ employeeId, onClose }: EmployeeDetailDrawerProps) {
  const isOpen = employeeId !== null

  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: () => fetchEmployee(employeeId!),
    enabled: isOpen,
  })

  if (!isOpen) {
    return null
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right">
        {isLoading ? (
          <div role="status">Loading employee details…</div>
        ) : employee ? (
          <>
            <SheetHeader>
              <SheetTitle>
                {employee.first_name} {employee.last_name}
              </SheetTitle>
            </SheetHeader>
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
          </>
        ) : (
          <div role="status">Unable to load employee details</div>
        )}
      </SheetContent>
    </Sheet>
  )
}
