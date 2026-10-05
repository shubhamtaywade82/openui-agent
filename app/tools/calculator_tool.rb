class CalculatorTool < RubyLLM::Tool
  description "Evaluate a simple mathematical expression"

  param :expression, type: :string, desc: "Math expression, e.g. '15 * 4 + 2'"

  def execute(expression:)
    allowed = expression.to_s.gsub(/\s+/, "")
    return { error: "Invalid characters" } unless allowed.match?(/\A[0-9+\-*\/%().]+\z/)

    { expression: expression, result: Kernel.eval(allowed) }
  rescue
    { error: "Invalid expression" }
  end
end
