# frozen_string_literal: true

require "test_helper"

class EmployeesCreateTest < ActionDispatch::IntegrationTest
  test "creates an employee from a valid payload and returns 201" do
    post api_employees_path, params: { employee: employee_attributes }

    assert_response :created
    body = JSON.parse(response.body)

    assert_equal "Nina", body["first_name"]
    assert_equal "Simone", body["last_name"]
    assert_equal "75000.0", body["salary_amount"]
    assert_equal "USD", body["salary_currency"]
    assert Employee.exists?(body["id"])
  end

  test "returns 422 with per-field messages for a missing required field" do
    post api_employees_path, params: { employee: employee_attributes.except(:first_name) }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)

    assert_equal "unprocessable_entity", body.dig("error", "code")
    assert body.dig("error", "details", "first_name").present?
  end

  test "returns 422 with a field message for a negative salary" do
    post api_employees_path, params: { employee: employee_attributes.merge(salary_amount: -1) }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)

    assert body.dig("error", "details", "salary_amount").present?
  end

  test "returns 422 with a field message for a non-numeric salary" do
    post api_employees_path, params: { employee: employee_attributes.merge(salary_amount: "not-a-number") }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)

    assert body.dig("error", "details", "salary_amount").present?
  end

  test "returns 422 for a duplicate email, backed by the unique index" do
    existing = Employee.create!(employee_attributes)

    post api_employees_path, params: { employee: employee_attributes(email: existing.email) }

    assert_response :unprocessable_entity
    body = JSON.parse(response.body)

    assert body.dig("error", "details", "email").present?
  end

  private

  DEFAULT_EMPLOYEE_ATTRIBUTES = {
    first_name: "Nina",
    last_name: "Simone",
    email: "nina.simone.create-test@acme.example",
    job_title: Employee::JOB_TITLES.first,
    department: Employee::DEPARTMENTS.first,
    country: Employee::SUPPORTED_COUNTRIES.first,
    hire_date: "2023-02-14",
    salary_amount: 75_000,
    salary_currency: "USD"
  }.freeze

  def employee_attributes(overrides = {})
    DEFAULT_EMPLOYEE_ATTRIBUTES.merge(overrides)
  end
end
