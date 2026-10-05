# frozen_string_literal: true

# Formats and writes OpenAI-compatible Server-Sent Events to a live HTTP stream
class SseStreamer
  def initialize(stream)
    @stream = stream
  end

  def write_event(data)
    @stream.write("data: #{data.to_json}\n\n")
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

  def write_done
    @stream.write("data: [DONE]\n\n")
  end

  def close
    @stream.close if @stream
  end
end
