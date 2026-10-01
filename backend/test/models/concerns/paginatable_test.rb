require "test_helper"

class PaginatableTest < ActiveSupport::TestCase
  setup do
    Employee.delete_all
    (Paginatable::MAX_PER_PAGE + 10).times { |index| Employee.create!(employee_attributes(index)) }
  end

  test "returns the requested page of records" do
    first_page = Employee.order(:id).paginated(page: 1, per_page: 10).pluck(:id)
    second_page = Employee.order(:id).paginated(page: 2, per_page: 10).pluck(:id)

    assert_equal 10, first_page.size
    assert_equal 10, second_page.size
    assert_empty first_page & second_page
  end

  test "clamps a per_page above the server-enforced cap" do
    page = Employee.order(:id).paginated(page: 1, per_page: 500)

    assert_equal Paginatable::MAX_PER_PAGE, page.count
  end

  test "returns no records for a page beyond the available data" do
    page = Employee.order(:id).paginated(page: 99, per_page: 10)

    assert_empty page
  end

  private

  def employee_attributes(index)
    {
      first_name: "First#{index}",
      last_name: "Last#{index}",
      email: "first#{index}.last#{index}.#{index}@acme.example",
      job_title: Employee::JOB_TITLES.first,
      department: Employee::DEPARTMENTS.first,
      country: Employee::SUPPORTED_COUNTRIES.first,
      salary_amount: 50_000,
      salary_currency: "USD",
      hire_date: Date.new(2021, 1, 1)
    }
  end
end
