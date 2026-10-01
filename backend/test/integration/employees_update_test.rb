require "test_helper"

class EmployeesUpdateTest < ActionDispatch::IntegrationTest
  test "updates an employee from a valid payload and returns 200 with the updated record" do
    employee = create_employee
    new_salary = 95_000
    new_currency = "EUR"

    patch api_employee_path(employee), params: { employee: { salary_amount: new_salary, salary_currency: new_currency } }

    assert_response :ok
    body = JSON.parse(response.body)

    assert_equal "95000.0", body["salary_amount"]
    assert_equal new_currency, body["salary_currency"]
    assert_equal employee.id, body["id"]

    employee.reload
    assert_equal new_salary, employee.salary_amount
    assert_equal new_currency, employee.salary_currency
  end

  test "returns 422 with per-field messages for an invalid salary on update" do
    employee = create_employee

    patch api_employee_path(employee), params: { employee: { salary_amount: -500 } }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)

    assert_equal "unprocessable_entity", body.dig("error", "code")
    assert body.dig("error", "details", "salary_amount").present?
  end

  test "returns 422 with per-field messages for an invalid currency on update" do
    employee = create_employee

    patch api_employee_path(employee), params: { employee: { salary_currency: "INVALID" } }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)

    assert body.dig("error", "details", "salary_currency").present?
  end

  test "returns 404 when updating a non-existent employee" do
    patch api_employee_path(999_999), params: { employee: { salary_amount: 100_000 } }

    assert_response :not_found
    body = JSON.parse(response.body)

    assert_equal "not_found", body.dig("error", "code")
  end

  private

  def create_employee
    Employee.create!(
      first_name: "Test",
      last_name: "User",
      email: "test.user.update@acme.example",
      job_title: Employee::JOB_TITLES.first,
      department: Employee::DEPARTMENTS.first,
      country: Employee::SUPPORTED_COUNTRIES.first,
      hire_date: "2023-01-01",
      salary_amount: 75_000,
      salary_currency: "USD"
    )
  end
end
