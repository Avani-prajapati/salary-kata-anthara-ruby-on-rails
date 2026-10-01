require "test_helper"

class EmployeeTest < ActiveSupport::TestCase
  test "a fully valid employee saves successfully" do
    employee = Employee.new(valid_attributes)

    assert employee.save
  end

  test "requires a first name" do
    employee = Employee.new(valid_attributes.merge(first_name: ""))

    assert_not employee.valid?
    assert_includes employee.errors[:first_name], "can't be blank"
  end

  test "requires a last name" do
    employee = Employee.new(valid_attributes.merge(last_name: ""))

    assert_not employee.valid?
    assert_includes employee.errors[:last_name], "can't be blank"
  end

  test "requires an email" do
    employee = Employee.new(valid_attributes.merge(email: ""))

    assert_not employee.valid?
    assert_includes employee.errors[:email], "can't be blank"
  end

  test "rejects an email already used by another employee" do
    employee = Employee.new(valid_attributes.merge(email: employees(:one).email))

    assert_not employee.valid?
    assert_includes employee.errors[:email], "has already been taken"
  end

  test "rejects a malformed email" do
    employee = Employee.new(valid_attributes.merge(email: "not-an-email"))

    assert_not employee.valid?
    assert_includes employee.errors[:email], "is invalid"
  end

  test "rejects a department outside the allow-list" do
    employee = Employee.new(valid_attributes.merge(department: "Astrology"))

    assert_not employee.valid?
    assert_includes employee.errors[:department], "is not included in the list"
  end

  test "rejects a job title outside the allow-list" do
    employee = Employee.new(valid_attributes.merge(job_title: "Astrologer"))

    assert_not employee.valid?
    assert_includes employee.errors[:job_title], "is not included in the list"
  end

  test "rejects a country outside the allow-list" do
    employee = Employee.new(valid_attributes.merge(country: "ATL"))

    assert_not employee.valid?
    assert_includes employee.errors[:country], "is not included in the list"
  end

  test "rejects a negative salary amount" do
    employee = Employee.new(valid_attributes.merge(salary_amount: -1))

    assert_not employee.valid?
    assert_includes employee.errors[:salary_amount], "must be greater than or equal to 0"
  end

  test "rejects a malformed currency code" do
    employee = Employee.new(valid_attributes.merge(salary_currency: "us"))

    assert_not employee.valid?
    assert_includes employee.errors[:salary_currency], "is invalid"
  end

  private

  def valid_attributes
    {
      first_name: "Jordan",
      last_name: "Rivera",
      email: "jordan.rivera.999@acme.example",
      job_title: "Software Engineer",
      department: "Engineering",
      country: "USA",
      salary_amount: 85_000.00,
      salary_currency: "USD",
      hire_date: Date.new(2022, 1, 10)
    }
  end
end
