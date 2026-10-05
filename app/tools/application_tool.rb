# frozen_string_literal: true

# Base tool providing common helpers and error handling conventions for ruby_llm tools
class ApplicationTool < RubyLLM::Tool
  private

  # Consistent structured error format without throwing exceptions across tool boundaries
  def error_result(message)
    { error: message.to_s }
  end
end
