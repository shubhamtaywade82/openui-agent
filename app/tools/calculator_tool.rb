# frozen_string_literal: true

class CalculatorTool < ApplicationTool
  description "Evaluate a simple mathematical expression"

  param :expression, type: :string, desc: "Math expression, e.g. '15 * 4 + 2'"

  def execute(expression:)
    allowed = expression.to_s.gsub(/\s+/, "")
    return error_result("Invalid characters") unless allowed.match?(/\A[0-9+\-*\/%().]+\z/)

    # Evaluates sanitized arithmetic expressions consisting only of numeric tokens and basic operators
    { expression: expression, result: Kernel.eval(allowed) } # rubocop:disable Security/Eval
  rescue StandardError => e
    error_result("Evaluation error: #{e.message}")
  end
end
