# frozen_string_literal: true

# A to-do item managed through the task_manager tool
class Task < ApplicationRecord
  PRIORITIES = %w[low medium high urgent].freeze

  validates :title, presence: true
  validates :priority, inclusion: { in: PRIORITIES }

  scope :in_creation_order, -> { order(:id) }
end
