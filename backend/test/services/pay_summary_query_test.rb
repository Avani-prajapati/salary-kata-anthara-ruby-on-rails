require "test_helper"

class PaySummaryQueryTest < ActiveSupport::TestCase
  test "a country paying employees in two currencies yields one row per currency instead of a blended row" do
    canada_rows = PaySummaryQuery.call(group_by: "country").select { |row| row.group_key == "CAN" }

    assert_equal [ "CAD", "USD" ], canada_rows.map(&:currency)
    assert_equal [ 3, 2 ], canada_rows.map(&:headcount)
    assert_equal [ BigDecimal("225000"), BigDecimal("230001") ], canada_rows.map(&:total_cost)
  end

  test "each currency row's min, average, and max are computed only from that currency's salaries" do
    cad_row, usd_row = PaySummaryQuery.call(group_by: "country").select { |row| row.group_key == "CAN" }

    assert_equal BigDecimal("60000"), cad_row.min_salary
    assert_equal BigDecimal("75000"), cad_row.avg_salary
    assert_equal BigDecimal("95000"), cad_row.max_salary

    assert_equal BigDecimal("100000"), usd_row.min_salary
    assert_equal BigDecimal("115000.5"), usd_row.avg_salary
    assert_equal BigDecimal("130001"), usd_row.max_salary
  end

  test "the median of an odd-sized group is its middle salary" do
    cad_row = PaySummaryQuery.call(group_by: "country").find { |row| row.group_key == "CAN" && row.currency == "CAD" }

    assert_equal BigDecimal("70000"), cad_row.median_salary
  end

  test "the median of an even-sized group is the mean of its two middle salaries" do
    usd_row = PaySummaryQuery.call(group_by: "country").find { |row| row.group_key == "CAN" && row.currency == "USD" }

    assert_equal BigDecimal("115000.5"), usd_row.median_salary
  end

  test "groups by country and currency across the whole dataset" do
    rows = PaySummaryQuery.call(group_by: "country")

    assert_equal [ [ "CAN", "CAD" ], [ "CAN", "USD" ], [ "GBR", "GBP" ], [ "USA", "USD" ] ],
      rows.map { |row| [ row.group_key, row.currency ] }
  end

  test "groups by department while still partitioning each department by currency" do
    rows = PaySummaryQuery.call(group_by: "department")

    assert_equal [ [ "Engineering", "GBP", 1 ], [ "Engineering", "USD", 1 ], [ "Product", "CAD", 3 ], [ "Product", "USD", 2 ] ],
      rows.map { |row| [ row.group_key, row.currency, row.headcount ] }
  end

  test "groups by job title while still partitioning each job title by currency" do
    rows = PaySummaryQuery.call(group_by: "job_title")

    assert_equal [
      [ "Data Scientist", "CAD", 3 ],
      [ "Data Scientist", "USD", 2 ],
      [ "Senior Software Engineer", "USD", 1 ],
      [ "Software Engineer", "GBP", 1 ]
    ], rows.map { |row| [ row.group_key, row.currency, row.headcount ] }
  end

  test "a single-employee group reports that salary as every statistic" do
    gbr_row = PaySummaryQuery.call(group_by: "country").find { |row| row.group_key == "GBR" }

    assert_equal [ 1, BigDecimal("95000") ], [ gbr_row.headcount, gbr_row.total_cost ]
    assert_equal [ BigDecimal("95000") ] * 4,
      [ gbr_row.min_salary, gbr_row.avg_salary, gbr_row.median_salary, gbr_row.max_salary ]
  end

  test "computes every group's summary with two database queries regardless of how many groups exist" do
    queries = []
    subscriber = ->(*, payload) { queries << payload[:sql] unless payload[:cached] || payload[:name] == "SCHEMA" }

    ActiveSupport::Notifications.subscribed(subscriber, "sql.active_record") do
      PaySummaryQuery.call(group_by: "job_title")
    end

    assert_equal 2, queries.size
  end

  test "rejects a group_by outside the supported dimensions" do
    assert_raises(ArgumentError) { PaySummaryQuery.call(group_by: "salary_amount") }
  end
end
