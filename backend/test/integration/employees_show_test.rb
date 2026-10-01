require "test_helper"

class EmployeesShowTest < ActionDispatch::IntegrationTest
  test "returns the full employee record with all fields" do
    employee = Employee.create!(employee_attributes)

    get api_employee_path(employee)

    assert_response :success
    body = JSON.parse(response.body)

    expected_fields = %w[id first_name last_name job_title department country salary_amount salary_currency hire_date]
    assert_equal expected_fields.sort, body.keys.sort

    assert_equal employee.id, body["id"]
    assert_equal employee.first_name, body["first_name"]
    assert_equal employee.last_name, body["last_name"]
    assert_equal employee.job_title, body["job_title"]
    assert_equal employee.department, body["department"]
    assert_equal employee.country, body["country"]
    assert_equal employee.salary_amount.to_s, body["salary_amount"]
    assert_equal employee.salary_currency, body["salary_currency"]
    assert_equal employee.hire_date.to_s, body["hire_date"]
  end

  test "returns 404 for a non-existent employee id" do
    get api_employee_path(999999)

    assert_response :not_found
    body = JSON.parse(response.body)

    assert_equal "not_found", body.dig("error", "code")
    assert body.dig("error", "message").present?
  end

  private

  def employee_attributes
    {
      first_name: "John",
      last_name: "Doe",
      email: "john.doe.test@acme.example",
      job_title: Employee::JOB_TITLES.first,
      department: Employee::DEPARTMENTS.first,
      country: Employee::SUPPORTED_COUNTRIES.first,
      salary_amount: 75_000,
      salary_currency: "USD",
      hire_date: Date.new(2021, 1, 1)
    }
  end
end
