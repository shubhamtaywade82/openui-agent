# frozen_string_literal: true

# Formats and writes Server-Sent Events to a live HTTP stream, either as OpenAI-compatible chunks
# (Rails page) or as typed AG-UI events (React frontend, which renders tool calls in a timeline)
class SseStreamer
  def initialize(stream)
    @stream = stream
    @run_id = SecureRandom.uuid
    @message_id = SecureRandom.uuid
  end

  def write_event(data)
    @stream.write("data: #{data.to_json}\n\n")
  rescue IOError, Errno::EPIPE, ActionController::Live::ClientDisconnected
    nil
  end

  def write_chunk(content, model:)
    write_event(
      id: "chatcmpl-#{SecureRandom.hex(8)}",
      object: "chat.completion.chunk",
      created: Time.now.to_i,
      model: model,
      choices: [ { index: 0, delta: { content: content }, finish_reason: nil } ]
    )
  end

  def write_chat_id(chat_id)
    write_event(chat_id: chat_id)
  end

  def write_status(status_text)
    write_event(status: status_text)
  end

  def write_error(message)
    write_event(error: message.to_s)
  end

  def write_run_started(thread_id)
    write_event(type: "RUN_STARTED", threadId: thread_id.to_s, runId: @run_id)
  end

  def write_message_start
    write_event(type: "TEXT_MESSAGE_START", messageId: @message_id, role: "assistant")
  end

  def write_text_delta(delta)
    write_event(type: "TEXT_MESSAGE_CONTENT", messageId: @message_id, delta: delta)
  end

  def write_message_end
    write_event(type: "TEXT_MESSAGE_END", messageId: @message_id)
  end

  def write_tool_call(call_id, name, arguments)
    write_event(type: "TOOL_CALL_START", toolCallId: call_id, toolCallName: name, parentMessageId: @message_id)
    write_event(type: "TOOL_CALL_ARGS", toolCallId: call_id, delta: arguments.to_json)
    write_event(type: "TOOL_CALL_END", toolCallId: call_id)
  end

  def write_tool_result(call_id, result)
    content = result.is_a?(String) ? result : result.to_json
    write_event(type: "TOOL_CALL_RESULT", messageId: SecureRandom.uuid, toolCallId: call_id,
                content: content, role: "tool")
  end

  def write_run_finished(thread_id)
    write_event(type: "RUN_FINISHED", threadId: thread_id.to_s, runId: @run_id)
  end

  def write_run_error(message)
    write_event(type: "RUN_ERROR", message: message.to_s)
  end

  def write_done
    @stream.write("data: [DONE]\n\n")
  rescue IOError, Errno::EPIPE, ActionController::Live::ClientDisconnected
    nil
  end

  def close
    @stream.close if @stream
  end
end
