# frozen_string_literal: true

require "faker"

COUNTRY_DEFAULT_CURRENCIES = {
  "USA" => "USD",
  "GBR" => "GBP",
  "DEU" => "EUR",
  "FRA" => "EUR",
  "IND" => "INR",
  "CAN" => "CAD",
  "AUS" => "AUD",
  "JPN" => "JPY",
  "BRA" => "BRL",
  "SGP" => "SGD"
}.freeze

COUNTRY_WEIGHTS = {
  "USA" => 30,
  "GBR" => 15,
  "DEU" => 10,
  "FRA" => 5,
  "IND" => 20,
  "CAN" => 8,
  "AUS" => 6,
  "JPN" => 2,
  "BRA" => 1,
  "SGP" => 3
}.freeze

DEPARTMENT_WEIGHTS = {
  "Engineering" => 25,
  "Sales" => 15,
  "Marketing" => 10,
  "Finance" => 8,
  "Human Resources" => 7,
  "Operations" => 10,
  "Customer Support" => 12,
  "Legal" => 3,
  "Product" => 6,
  "Design" => 4
}.freeze

JOB_TITLE_WEIGHTS = {
  "Software Engineer" => 20,
  "Senior Software Engineer" => 10,
  "Engineering Manager" => 2,
  "Product Manager" => 3,
  "Product Designer" => 4,
  "Sales Representative" => 12,
  "Account Executive" => 10,
  "Marketing Specialist" => 8,
  "Financial Analyst" => 6,
  "HR Business Partner" => 5,
  "Operations Analyst" => 7,
  "Customer Support Specialist" => 12,
  "Legal Counsel" => 1,
  "Data Scientist" => 4,
  "QA Engineer" => 6
}.freeze

JOB_TITLE_SALARY_RANGES = {
  "Software Engineer" => 60_000..120_000,
  "Senior Software Engineer" => 90_000..150_000,
  "Engineering Manager" => 120_000..180_000,
  "Product Manager" => 90_000..150_000,
  "Product Designer" => 70_000..120_000,
  "Sales Representative" => 40_000..90_000,
  "Account Executive" => 50_000..110_000,
  "Marketing Specialist" => 45_000..85_000,
  "Financial Analyst" => 55_000..100_000,
  "HR Business Partner" => 55_000..100_000,
  "Operations Analyst" => 50_000..90_000,
  "Customer Support Specialist" => 35_000..65_000,
  "Legal Counsel" => 90_000..160_000,
  "Data Scientist" => 80_000..140_000,
  "QA Engineer" => 55_000..100_000
}.freeze

raise "COUNTRY_WEIGHTS must cover exactly Employee::SUPPORTED_COUNTRIES" unless COUNTRY_WEIGHTS.keys.to_set == Employee::SUPPORTED_COUNTRIES.to_set
raise "DEPARTMENT_WEIGHTS must cover exactly Employee::DEPARTMENTS" unless DEPARTMENT_WEIGHTS.keys.to_set == Employee::DEPARTMENTS.to_set
raise "JOB_TITLE_WEIGHTS must cover exactly Employee::JOB_TITLES" unless JOB_TITLE_WEIGHTS.keys.to_set == Employee::JOB_TITLES.to_set

OFF_DEFAULT_CURRENCY_PROBABILITY = 0.03

def weighted_sample(weights)
  target = rand(weights.values.sum)

  weights.each do |value, weight|
    return value if target < weight

    target -= weight
  end
end

def email_local_part(name)
  name.downcase.gsub(/[^a-z]/, "")
end

def currency_for(country)
  return COUNTRY_DEFAULT_CURRENCIES.values.sample if rand < OFF_DEFAULT_CURRENCY_PROBABILITY

  COUNTRY_DEFAULT_CURRENCIES.fetch(country)
end

def random_identity(index)
  first_name = Faker::Name.first_name
  last_name = Faker::Name.last_name
  email = "#{email_local_part(first_name)}.#{email_local_part(last_name)}.#{index}@acme.example"

  { first_name: first_name, last_name: last_name, email: email }
end

def job_fields(job_title)
  { job_title: job_title, salary_amount: rand(JOB_TITLE_SALARY_RANGES.fetch(job_title)) }
end

def timestamp_fields(timestamp)
  { created_at: timestamp, updated_at: timestamp }
end

def build_employee_row(index, timestamp)
  country = weighted_sample(COUNTRY_WEIGHTS)
  job_title = weighted_sample(JOB_TITLE_WEIGHTS)

  random_identity(index).merge(
    department: weighted_sample(DEPARTMENT_WEIGHTS),
    country: country,
    salary_currency: currency_for(country),
    hire_date: Faker::Date.between(from: 15.years.ago, to: Date.current),
    **job_fields(job_title),
    **timestamp_fields(timestamp)
  )
end

def seed_employees(total: 10_000, batch_size: 1_000)
  Employee.delete_all if Employee.count.positive?

  timestamp = Time.current

  (total / batch_size).times do |batch_index|
    offset = batch_index * batch_size
    rows = Array.new(batch_size) { |i| build_employee_row(offset + i, timestamp) }

    # Rows are built from the model's own constraints above; insert_all is required
    # for batch-insert performance at 10k rows (see CLAUDE.md "Seeding").
    # rubocop:disable Rails/SkipsModelValidations
    Employee.insert_all(rows)
    # rubocop:enable Rails/SkipsModelValidations
  end
end

seed_employees
