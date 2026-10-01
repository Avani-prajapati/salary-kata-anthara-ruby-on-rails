class EmployeesController < ApplicationController
  EMPLOYEE_FIELDS = %i[
    id first_name last_name job_title department country
    salary_amount salary_currency hire_date
  ].freeze

  def index
    employees = Employee
      .order_by_sort(sort_params[:sort], sort_params[:direction])
      .paginated(page: pagination_params[:page], per_page: pagination_params[:per_page])

    render json: {
      employees: employees.as_json(only: EMPLOYEE_FIELDS),
      pagination: pagination_envelope(employees)
    }
  end

  private

  def pagination_params
    {
      page: params[:page].presence&.to_i || 1,
      per_page: params[:per_page].presence&.to_i || Paginatable::DEFAULT_PER_PAGE
    }
  end

  def sort_params
    {
      sort: params[:sort].presence,
      direction: params[:direction].presence
    }
  end

  def pagination_envelope(employees)
    per_page = employees.limit_value
    page = (employees.offset_value / per_page) + 1
    total_count = Employee.count

    {
      page: page,
      per_page: per_page,
      total_count: total_count,
      total_pages: (total_count.to_f / per_page).ceil
    }
  end
end
