# frozen_string_literal: true

module Paginatable
  extend ActiveSupport::Concern

  DEFAULT_PER_PAGE = 25
  MAX_PER_PAGE = 100

  class_methods do
    def paginated(page: 1, per_page: DEFAULT_PER_PAGE)
      safe_page = [ page.to_i, 1 ].max
      safe_per_page = per_page.to_i.clamp(1, MAX_PER_PAGE)

      limit(safe_per_page).offset((safe_page - 1) * safe_per_page)
    end
  end
end
