import { Navigate, Route, Routes } from "react-router-dom"

function EmployeesPlaceholder() {
  return <p>Employees directory coming soon.</p>
}

function InsightsPlaceholder() {
  return <p>Pay insights coming soon.</p>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/employees" replace />} />
      <Route path="/employees" element={<EmployeesPlaceholder />} />
      <Route path="/insights" element={<InsightsPlaceholder />} />
    </Routes>
  )
}

export default App
