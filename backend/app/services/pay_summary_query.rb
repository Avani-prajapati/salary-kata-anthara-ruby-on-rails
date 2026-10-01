# frozen_string_literal: true

class PaySummaryQuery
  GROUP_BY_COLUMNS = %w[country department job_title].freeze
  DEFAULT_GROUP_BY = "country"
  MONEY_SCALE = 2

  PaySummary = Struct.new(
    :group_key, :currency, :headcount, :total_cost,
    :min_salary, :avg_salary, :median_salary, :max_salary,
    keyword_init: true
  )

  def self.call(group_by: DEFAULT_GROUP_BY)
    new(group_by).call
  end

  def initialize(group_by)
    raise ArgumentError, "unsupported group_by: #{group_by.inspect}" unless GROUP_BY_COLUMNS.include?(group_by)

    @group_column = group_by
  end

  def call
    medians = medians_by_group_and_currency

    aggregate_rows.map { |row| build_summary(row, medians) }
  end

  private

  attr_reader :group_column

  def build_summary(row, medians)
    group_key, currency, headcount, total_cost, min_salary, avg_salary, max_salary = row

    PaySummary.new(
      group_key: group_key,
      currency: currency,
      headcount: headcount,
      median_salary: medians.fetch([ group_key, currency ]),
      **money_fields(total_cost, min_salary, avg_salary, max_salary)
    )
  end

  def money_fields(total_cost, min_salary, avg_salary, max_salary)
    {
      total_cost: to_money(total_cost),
      min_salary: to_money(min_salary),
      avg_salary: to_money(avg_salary),
      max_salary: to_money(max_salary)
    }
  end

  def aggregate_rows
    salary = Employee.arel_table[:salary_amount]

    Employee
      .group(group_column, :salary_currency)
      .order(group_column, :salary_currency)
      .pluck(group_column, :salary_currency, salary.count, salary.sum, salary.minimum, salary.average, salary.maximum)
  end

  def medians_by_group_and_currency
    Employee
      .order(group_column, :salary_currency, :salary_amount)
      .pluck(group_column, :salary_currency, :salary_amount)
      .group_by { |group_key, currency, _salary| [ group_key, currency ] }
      .transform_values { |rows| median_of_sorted(rows.map(&:last)) }
  end

  def median_of_sorted(salaries)
    middle = salaries.size / 2
    return salaries[middle] if salaries.size.odd?

    (salaries[middle - 1] + salaries[middle]) / 2
  end

  def to_money(value)
    BigDecimal(value.to_s).round(MONEY_SCALE)
  end
end
