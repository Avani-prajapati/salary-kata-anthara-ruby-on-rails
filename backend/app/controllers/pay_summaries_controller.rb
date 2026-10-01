# frozen_string_literal: true

class PaySummariesController < ApplicationController
  def index
    render json: PaySummaryQuery.call(group_by: group_by_param).map(&:to_h)
  end

  private

  def group_by_param
    group_by = params.fetch(:group_by, PaySummaryQuery::DEFAULT_GROUP_BY)
    return group_by if PaySummaryQuery::GROUP_BY_COLUMNS.include?(group_by)

    raise InvalidFilterError, "group_by must be one of: #{PaySummaryQuery::GROUP_BY_COLUMNS.join(', ')}"
  end
end
