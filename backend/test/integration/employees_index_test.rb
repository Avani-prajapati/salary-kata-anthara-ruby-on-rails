require "test_helper"

class EmployeesIndexTest < ActionDispatch::IntegrationTest
  test "returns the employee fields and pagination envelope" do
    get api_employees_path

    assert_response :success
    body = JSON.parse(response.body)

    expected_fields = %w[id first_name last_name job_title department country salary_amount salary_currency hire_date]
    assert_equal expected_fields.sort, body["employees"].first.keys.sort

    assert_equal %w[page per_page total_count total_pages].sort, body["pagination"].keys.sort
    assert_equal 1, body["pagination"]["page"]
    assert_equal Paginatable::DEFAULT_PER_PAGE, body["pagination"]["per_page"]
    assert_equal Employee.count, body["pagination"]["total_count"]
  end

  test "sorts ascending by each allowed column" do
    seed_employees_spanning_sort_values

    Employee::ALLOWED_SORT_COLUMNS.each do |column|
      get api_employees_path, params: { sort: column, direction: "asc", per_page: Paginatable::MAX_PER_PAGE }

      assert_response :success
      values = JSON.parse(response.body)["employees"].map { |employee| employee[column] }
      comparable_values = column == "salary_amount" ? values.map(&:to_f) : values

      assert_equal comparable_values.sort, comparable_values, "expected ascending order when sorting by #{column}"
    end
  end

  test "sorts descending when direction is desc" do
    seed_employees_spanning_sort_values

    get api_employees_path, params: { sort: "salary_amount", direction: "desc", per_page: Paginatable::MAX_PER_PAGE }

    assert_response :success
    salaries = JSON.parse(response.body)["employees"].map { |employee| employee["salary_amount"].to_f }

    assert_equal salaries.sort.reverse, salaries
  end

  test "falls back to the default sort instead of erroring on an unrecognized column" do
    get api_employees_path, params: { sort: "'; DROP TABLE employees; --", direction: "asc" }

    assert_response :success
  end

  test "clamps a per_page above the server-enforced cap" do
    get api_employees_path, params: { per_page: 500 }

    assert_response :success
    body = JSON.parse(response.body)

    assert_equal Paginatable::MAX_PER_PAGE, body["pagination"]["per_page"]
    assert_operator body["employees"].size, :<=, Paginatable::MAX_PER_PAGE
  end

  test "issues the same number of queries whether the page holds few or many rows" do
    seed_additional_employees(27)

    small_page_query_count = count_sql_queries { get api_employees_path, params: { per_page: 1 } }
    large_page_query_count = count_sql_queries { get api_employees_path, params: { per_page: 25 } }

    assert_equal small_page_query_count, large_page_query_count
  end

  test "returns 200 with an empty array for a page beyond the available data" do
    get api_employees_path, params: { page: 999 }

    assert_response :success
    body = JSON.parse(response.body)

    assert_empty body["employees"]
  end

  test "filters employees by country" do
    seed_filterable_employees

    get api_employees_path, params: { country: "DEU" }

    assert_response :success
    assert_equal [ "DEU" ], employees_in(response).map { |employee| employee["country"] }.uniq
  end

  test "filters employees by department" do
    seed_filterable_employees

    get api_employees_path, params: { department: "Legal" }

    assert_response :success
    assert_equal [ "Legal" ], employees_in(response).map { |employee| employee["department"] }.uniq
  end

  test "filters employees by job title" do
    seed_filterable_employees

    get api_employees_path, params: { job_title: Employee::JOB_TITLES[3] }

    assert_response :success
    assert_equal [ Employee::JOB_TITLES[3] ], employees_in(response).map { |employee| employee["job_title"] }.uniq
  end

  test "filters employees by a minimum salary" do
    seed_filterable_employees

    get api_employees_path, params: { min_salary: 100_000 }

    assert_response :success
    salaries = employees_in(response).map { |employee| employee["salary_amount"].to_f }
    assert_operator salaries.min, :>=, 100_000
    assert_includes salaries, 180_000.0
  end

  test "filters employees by a maximum salary" do
    seed_filterable_employees

    get api_employees_path, params: { max_salary: 50_000 }

    assert_response :success
    salaries = employees_in(response).map { |employee| employee["salary_amount"].to_f }
    assert_operator salaries.max, :<=, 50_000
    assert_includes salaries, 40_000.0
  end

  test "searches employees by name or email" do
    seed_filterable_employees
    target = Employee.find_by!(department: "Legal")

    get api_employees_path, params: { q: target.last_name }

    assert_response :success
    assert_includes employees_in(response).map { |employee| employee["id"] }, target.id
  end

  test "combines multiple filters narrowing the result to the intersection" do
    seed_filterable_employees

    get api_employees_path, params: { country: "BRA", department: "Finance", min_salary: 70_000, max_salary: 80_000 }

    assert_response :success
    results = employees_in(response)

    assert_equal 1, results.size
    assert_equal "BRA", results.first["country"]
  end

  test "treats a SQL-injection attempt in a filter value as a literal, not executable, value" do
    seed_filterable_employees
    employee_count_before_request = Employee.count

    get api_employees_path, params: { q: "'; DROP TABLE employees; --" }

    assert_response :success
    assert_empty employees_in(response)
    assert_equal employee_count_before_request, Employee.count
  end

  test "returns 400 with a structured error body for a non-numeric min_salary" do
    get api_employees_path, params: { min_salary: "not-a-number" }

    assert_response :bad_request
    body = JSON.parse(response.body)

    assert_equal "bad_request", body.dig("error", "code")
  end

  test "returns 400 with a structured error body for a non-numeric max_salary" do
    get api_employees_path, params: { max_salary: "also-not-a-number" }

    assert_response :bad_request
    body = JSON.parse(response.body)

    assert_equal "bad_request", body.dig("error", "code")
  end

  test "clearing all filters reproduces the unfiltered directory's response shape" do
    seed_filterable_employees

    get api_employees_path

    assert_response :success
    body = JSON.parse(response.body)

    expected_fields = %w[id first_name last_name job_title department country salary_amount salary_currency hire_date]
    assert_equal expected_fields.sort, body["employees"].first.keys.sort
    assert_equal %w[page per_page total_count total_pages].sort, body["pagination"].keys.sort
    assert_equal Employee.count, body["pagination"]["total_count"]
  end

  private

  def employees_in(response)
    JSON.parse(response.body)["employees"]
  end

  def seed_filterable_employees
    [
      { department: "Sales", country: "DEU", job_title: Employee::JOB_TITLES[1], salary_amount: 40_000 },
      { department: "Legal", country: "JPN", job_title: Employee::JOB_TITLES[2], salary_amount: 180_000 },
      { department: "Finance", country: "BRA", job_title: Employee::JOB_TITLES[3], salary_amount: 75_000 }
    ].each_with_index do |overrides, index|
      Employee.create!(employee_attributes(200 + index).merge(overrides))
    end
  end

  def seed_additional_employees(count)
    count.times { |index| Employee.create!(employee_attributes(index)) }
  end

  def seed_employees_spanning_sort_values
    [
      { department: "Sales", country: "DEU", salary_amount: 40_000, hire_date: Date.new(2010, 1, 1) },
      { department: "Legal", country: "JPN", salary_amount: 180_000, hire_date: Date.new(2022, 6, 15) },
      { department: "Finance", country: "BRA", salary_amount: 75_000, hire_date: Date.new(2017, 11, 3) }
    ].each_with_index do |overrides, index|
      Employee.create!(employee_attributes(index).merge(overrides))
    end
  end

  def employee_attributes(index)
    {
      first_name: "First#{index}",
      last_name: "Last#{index}",
      email: "first#{index}.last#{index}.#{index}@acme.example",
      job_title: Employee::JOB_TITLES.first,
      department: Employee::DEPARTMENTS.first,
      country: Employee::SUPPORTED_COUNTRIES.first,
      salary_amount: 50_000 + index,
      salary_currency: "USD",
      hire_date: Date.new(2021, 1, 1) + index
    }
  end

  def count_sql_queries
    count = 0
    subscriber = lambda do |_name, _start, _finish, _id, payload|
      count += 1 unless payload[:cached]
    end

    ActiveRecord::Base.uncached do
      ActiveSupport::Notifications.subscribed(subscriber, "sql.active_record") { yield }
    end

    count
  end
end
