# frozen_string_literal: true

# Subscribes to RubyLLM instrumentation events to log token usage and tool metrics
ActiveSupport::Notifications.subscribe("chat.ruby_llm") do |*args|
  event = ActiveSupport::Notifications::Event.new(*args)
  payload = event.payload

  in_tokens  = payload[:input_tokens] || 0
  out_tokens = payload[:output_tokens] || 0
  cached     = payload[:cached_tokens] || 0

  Rails.logger.info do
    "[RubyLLM::Chat] model=#{payload[:model]} duration=#{event.duration.round(1)}ms " \
      "tokens(in=#{in_tokens}, out=#{out_tokens}, cached=#{cached})"
  end
end

ActiveSupport::Notifications.subscribe("tool_call.ruby_llm") do |*args|
  event = ActiveSupport::Notifications::Event.new(*args)
  payload = event.payload

  Rails.logger.info do
    "[RubyLLM::Tool] tool=#{payload[:tool_name]} duration=#{event.duration.round(1)}ms " \
      "args=#{payload[:tool_arguments].inspect}"
  end
end
