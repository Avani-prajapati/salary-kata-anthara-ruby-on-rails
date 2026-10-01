class Employee < ApplicationRecord
  include Paginatable

  DEPARTMENTS = [
    "Engineering",
    "Sales",
    "Marketing",
    "Finance",
    "Human Resources",
    "Operations",
    "Customer Support",
    "Legal",
    "Product",
    "Design"
  ].freeze

  JOB_TITLES = [
    "Software Engineer",
    "Senior Software Engineer",
    "Engineering Manager",
    "Product Manager",
    "Product Designer",
    "Sales Representative",
    "Account Executive",
    "Marketing Specialist",
    "Financial Analyst",
    "HR Business Partner",
    "Operations Analyst",
    "Customer Support Specialist",
    "Legal Counsel",
    "Data Scientist",
    "QA Engineer"
  ].freeze

  SUPPORTED_COUNTRIES = %w[USA GBR DEU FRA IND CAN AUS JPN BRA SGP].freeze

  CURRENCY_FORMAT = /\A[A-Z]{3}\z/

  ALLOWED_SORT_COLUMNS = %w[last_name department country salary_amount hire_date].freeze
  DEFAULT_SORT_COLUMN = "last_name"
  DEFAULT_SORT_DIRECTION = "asc"

  validates :first_name, presence: true
  validates :last_name, presence: true
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :department, inclusion: { in: DEPARTMENTS }
  validates :job_title, inclusion: { in: JOB_TITLES }
  validates :country, inclusion: { in: SUPPORTED_COUNTRIES }
  validates :salary_amount, numericality: { greater_than_or_equal_to: 0 }
  validates :salary_currency, format: { with: CURRENCY_FORMAT }

  scope :order_by_sort, ->(column, direction) {
    safe_column = ALLOWED_SORT_COLUMNS.include?(column) ? column : DEFAULT_SORT_COLUMN
    safe_direction = direction.to_s.casecmp("desc").zero? ? "desc" : DEFAULT_SORT_DIRECTION

    order(safe_column => safe_direction)
  }
end
