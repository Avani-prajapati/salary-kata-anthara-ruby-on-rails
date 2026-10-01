# frozen_string_literal: true

require "test_helper"

class PaySummariesIndexTest < ActionDispatch::IntegrationTest
  SUMMARY_FIELDS = %w[group_key currency headcount total_cost min_salary avg_salary median_salary max_salary].freeze
  PERFORMANCE_BUDGET_SECONDS = 0.5
  SEEDED_DATASET_SIZE = 10_000
  CURRENCIES_BY_COUNTRY = {
    "USA" => "USD", "GBR" => "GBP", "DEU" => "EUR", "FRA" => "EUR", "IND" => "INR",
    "CAN" => "CAD", "AUS" => "AUD", "JPN" => "JPY", "BRA" => "BRL", "SGP" => "SGD"
  }.freeze

  test "defaults to grouping by country, returning one row per country and currency pair" do
    get api_insights_pay_summary_path

    assert_response :success
    rows = JSON.parse(response.body)

    assert_equal SUMMARY_FIELDS.sort, rows.first.keys.sort
    canada_rows = rows.select { |row| row["group_key"] == "CAN" }
    assert_equal [ [ "CAD", 3 ], [ "USD", 2 ] ], canada_rows.map { |row| [ row["currency"], row["headcount"] ] }
  end

  test "serializes money values as exact decimal strings" do
    get api_insights_pay_summary_path, params: { group_by: "country" }

    assert_response :success
    usd_canada_row = JSON.parse(response.body).find { |row| row["group_key"] == "CAN" && row["currency"] == "USD" }

    assert_equal "230001.0", usd_canada_row["total_cost"]
    assert_equal "115000.5", usd_canada_row["median_salary"]
  end

  test "groups by department, still partitioned by currency" do
    get api_insights_pay_summary_path, params: { group_by: "department" }

    assert_response :success
    rows = JSON.parse(response.body)

    assert_equal [ [ "Engineering", "GBP" ], [ "Engineering", "USD" ], [ "Product", "CAD" ], [ "Product", "USD" ] ],
      rows.map { |row| [ row["group_key"], row["currency"] ] }
  end

  test "groups by job title, still partitioned by currency" do
    get api_insights_pay_summary_path, params: { group_by: "job_title" }

    assert_response :success
    rows = JSON.parse(response.body)

    assert_equal [ [ "Data Scientist", "CAD" ], [ "Data Scientist", "USD" ], [ "Senior Software Engineer", "USD" ], [ "Software Engineer", "GBP" ] ],
      rows.map { |row| [ row["group_key"], row["currency"] ] }
  end

  test "returns 400 with a structured error body for an unsupported group_by" do
    get api_insights_pay_summary_path, params: { group_by: "salary_amount" }

    assert_response :bad_request
    assert_equal "bad_request", JSON.parse(response.body).dig("error", "code")
  end

  test "summarizes the full seeded dataset correctly within the performance budget" do
    seed_full_dataset
    get api_insights_pay_summary_path, params: { group_by: "job_title" }

    started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    get api_insights_pay_summary_path, params: { group_by: "country" }
    elapsed_seconds = Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at

    assert_response :success
    rows = JSON.parse(response.body)
    expected_pairs = Employee.distinct.order(:country, :salary_currency).pluck(:country, :salary_currency)

    assert_equal expected_pairs, rows.map { |row| [ row["group_key"], row["currency"] ] }
    assert_equal Employee.count, rows.sum { |row| row["headcount"] }
    assert_operator elapsed_seconds, :<, PERFORMANCE_BUDGET_SECONDS
  end

  private

  def seed_full_dataset
    timestamp = Time.current
    rows = Array.new(SEEDED_DATASET_SIZE) { |index| seeded_employee_row(index, timestamp) }

    # Rows are built from the model's own constraints above; insert_all is required
    # for batch-insert performance at 10k rows (see CLAUDE.md "Seeding").
    # rubocop:disable Rails/SkipsModelValidations
    rows.each_slice(1_000) { |batch| Employee.insert_all(batch) }
    # rubocop:enable Rails/SkipsModelValidations
  end

  def seeded_employee_row(index, timestamp)
    country = Employee::SUPPORTED_COUNTRIES[index % Employee::SUPPORTED_COUNTRIES.size]

    seeded_identity(index).merge(
      country: country,
      created_at: timestamp,
      updated_at: timestamp,
      **seeded_category_fields(index, country)
    )
  end

  def seeded_category_fields(index, country)
    {
      job_title: Employee::JOB_TITLES[index % Employee::JOB_TITLES.size],
      department: Employee::DEPARTMENTS[index % Employee::DEPARTMENTS.size],
      salary_amount: 35_000 + ((index * 7_919) % 145_000),
      salary_currency: seeded_currency(index, country),
      hire_date: Date.new(2010, 1, 1) + (index % 5_000)
    }
  end

  def seeded_currency(index, country)
    (index % 33).zero? ? "USD" : CURRENCIES_BY_COUNTRY.fetch(country)
  end

  def seeded_identity(index)
    {
      first_name: "Seeded#{index}",
      last_name: "Employee#{index}",
      email: "seeded.employee.#{index}@acme.example"
    }
  end
end
