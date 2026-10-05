# frozen_string_literal: true

class CurrentTimeTool < ApplicationTool
  description "Returns the current date and time"

  def execute
    {
      current_time: Time.current.strftime("%A, %B %d, %Y at %H:%M:%S %Z"),
      unix: Time.current.to_i
    }
  end
end
