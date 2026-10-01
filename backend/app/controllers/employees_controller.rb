class EmployeesController < ApplicationController
  EMPLOYEE_FIELDS = %i[
    id first_name last_name job_title department country
    salary_amount salary_currency hire_date
  ].freeze

  def index
    matching_employees = filtered_employees.order_by_sort(sort_params[:sort], sort_params[:direction])
    employees = matching_employees.paginated(page: pagination_params[:page], per_page: pagination_params[:per_page])

    render json: {
      employees: employees.as_json(only: EMPLOYEE_FIELDS),
      pagination: pagination_envelope(employees, matching_employees)
    }
  end

  def show
    employee = Employee.find(params[:id])
    render json: employee.as_json(only: EMPLOYEE_FIELDS)
  end

  def create
    employee = Employee.create!(employee_params)
    render json: employee.as_json(only: EMPLOYEE_FIELDS), status: :created
  end

  def update
    employee = Employee.find(params[:id])
    employee.update!(employee_params)
    render json: employee.as_json(only: EMPLOYEE_FIELDS)
  end

  def destroy
    employee = Employee.find(params[:id])
    employee.destroy!
    head :no_content
  end

  private

  def employee_params
    params.expect(
      employee: %i[first_name last_name email job_title department country hire_date salary_amount salary_currency]
    )
  end

  def filtered_employees
    scope = Employee.all
    scope = scope.by_country(filter_params[:country]) if filter_params[:country]
    scope = scope.by_department(filter_params[:department]) if filter_params[:department]
    scope = scope.by_job_title(filter_params[:job_title]) if filter_params[:job_title]
    scope = scope.salary_between(filter_params[:min_salary], filter_params[:max_salary]) if filter_params[:min_salary] || filter_params[:max_salary]
    scope = scope.search_by_name_or_email(filter_params[:q]) if filter_params[:q]
    scope
  end

  def filter_params
    @filter_params ||= {
      country: params[:country].presence,
      department: params[:department].presence,
      job_title: params[:job_title].presence,
      min_salary: parsed_salary_bound(:min_salary),
      max_salary: parsed_salary_bound(:max_salary),
      q: params[:q].presence
    }
  end

  def parsed_salary_bound(param_name)
    raw_value = params[param_name].presence
    return nil unless raw_value

    Float(raw_value)
  rescue ArgumentError, TypeError
    raise InvalidFilterError, "#{param_name} must be a number"
  end

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

  def pagination_envelope(employees, matching_employees)
    per_page = employees.limit_value
    page = (employees.offset_value / per_page) + 1
    total_count = matching_employees.count

    {
      page: page,
      per_page: per_page,
      total_count: total_count,
      total_pages: (total_count.to_f / per_page).ceil
    }
  end
end
