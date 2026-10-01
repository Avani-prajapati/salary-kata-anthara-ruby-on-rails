require "test_helper"

class EmployeesDestroyTest < ActionDispatch::IntegrationTest
  test "successfully deletes an employee and returns 204" do
    employee = Employee.create!(employee_attributes)

    delete api_employee_path(employee)

    assert_response :no_content
    assert_response 204
    assert_not Employee.exists?(employee.id)
  end

  test "returns 404 for a non-existent employee id" do
    delete api_employee_path(999999)

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
      email: "john.doe.destroy-test@acme.example",
      job_title: Employee::JOB_TITLES.first,
      department: Employee::DEPARTMENTS.first,
      country: Employee::SUPPORTED_COUNTRIES.first,
      salary_amount: 75_000,
      salary_currency: "USD",
      hire_date: Date.new(2021, 1, 1)
    }
  end
end
