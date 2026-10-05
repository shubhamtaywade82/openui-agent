# frozen_string_literal: true

# Concern providing Server-Sent Events headers and streaming execution for controllers
module SseStreaming
  extend ActiveSupport::Concern

  # Shown when the model finishes without any text, so the UI never stays blank
  EMPTY_RESPONSE_FALLBACK = <<~DSL.freeze
    root = Card([msg])
    msg = TextContent("The model did not return a response. Please try again.")
  DSL

  private

  def sse
    @sse ||= SseStreamer.new(response.stream)
  end

  def setup_sse_headers
    response.headers["Content-Type"]      = "text/event-stream"
    response.headers["Cache-Control"]     = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
  end

  def stream_agent(runner)
    setup_sse_headers
    agent = runner.find_or_create_agent
    sse.write_chat_id(agent.id)

    streamed_content = stream_chunks(runner, agent)
    sse.write_chunk(EMPTY_RESPONSE_FALLBACK, model: agent.model.model_id) unless streamed_content
    sse.write_done
  rescue IOError, Errno::EPIPE, ActionController::Live::ClientDisconnected
    # Client disconnected before completion — terminate stream cleanly
  rescue StandardError => e
    Rails.logger.error { "[SseStreaming] #{e.class}: #{e.message}" }
    sse.write_error(e.message)
    sse.write_done
  ensure
    sse.close
  end

  def stream_chunks(runner, agent)
    streamed_content = false
    runner.call_with_stream do |chunk|
      if chunk.tool_call?
        first_tool = chunk.tool_calls&.first
        tool_name = first_tool.respond_to?(:name) ? first_tool.name : "tool"
        sse.write_status("Executing #{tool_name}...")
      end

      next unless chunk.content.present?

      streamed_content = true
      sse.write_chunk(chunk.content, model: agent.model.model_id)
    end
    streamed_content
  end
end
