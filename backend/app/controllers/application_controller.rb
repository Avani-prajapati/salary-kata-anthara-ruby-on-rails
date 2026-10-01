class ApplicationController < ActionController::API
  class InvalidFilterError < StandardError; end

  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :render_unprocessable_entity
  rescue_from ActionController::ParameterMissing, with: :render_bad_request
  rescue_from InvalidFilterError, with: :render_bad_request

  private

  def render_not_found(exception)
    render json: { error: { code: "not_found", message: exception.message } }, status: :not_found
  end

  def render_unprocessable_entity(exception)
    render json: {
      error: {
        code: "unprocessable_entity",
        message: exception.message,
        details: exception.record.errors.messages
      }
    }, status: :unprocessable_entity
  end

  def render_bad_request(exception)
    render json: { error: { code: "bad_request", message: exception.message } }, status: :bad_request
  end
end
