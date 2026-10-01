import { Navigate, NavLink, Route, Routes } from "react-router-dom"
import { EmployeesPage } from "@/features/employees/EmployeesPage"
import { InsightsPage } from "@/features/insights/InsightsPage"

function App() {
  return (
    <>
      <nav aria-label="Primary">
        <NavLink to="/employees">Employees</NavLink>
        <NavLink to="/insights">Insights</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/employees" replace />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/insights" element={<InsightsPage />} />
        </Routes>
      </main>
    </>
  )
}

export default App
