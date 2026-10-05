# frozen_string_literal: true

class CalculatorTool < ApplicationTool
  description "Evaluate a simple mathematical expression"

  param :expression, type: :string, desc: "Math expression, e.g. '15 * 4 + 2'"

  def execute(expression:)
    expr_str = expression.to_s.gsub(/\s+/, "")
    return error_result("Expression too long") if expr_str.length > 80
    return error_result("Invalid characters") unless expr_str.match?(/\A[0-9+\-*\/%().]+\z/)
    return error_result("Exponentiation is disallowed") if expr_str.include?("**")

    # Evaluates sanitized arithmetic expressions consisting only of numeric tokens and basic operators
    { expression: expression, result: Kernel.eval(expr_str) } # rubocop:disable Security/Eval
  rescue StandardError => e
    error_result("Evaluation error: #{e.message}")
  end
end
