import { Navigate, Route, Routes } from "react-router-dom"
import { EmployeesPage } from "@/features/employees/EmployeesPage"

function InsightsPlaceholder() {
  return <p>Pay insights coming soon.</p>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/employees" replace />} />
      <Route path="/employees" element={<EmployeesPage />} />
      <Route path="/insights" element={<InsightsPlaceholder />} />
    </Routes>
  )
}

export default App
