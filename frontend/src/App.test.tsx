import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import App from "./App"

describe("app route shell", () => {
  it("redirects the root path to the employees directory placeholder", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText("Employees directory coming soon.")).toBeInTheDocument()
  })

  it("renders the insights placeholder at /insights", () => {
    render(
      <MemoryRouter initialEntries={["/insights"]}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText("Pay insights coming soon.")).toBeInTheDocument()
  })
})
