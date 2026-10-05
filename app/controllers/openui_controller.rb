class OpenuiController < ApplicationController
  include ActionController::Live

  skip_forgery_protection
  before_action :set_cors_headers
  before_action :handle_preflight, only: :create

  def index
    @chats = Chat.order(created_at: :desc).limit(10)
  end

  def create
    payload = JSON.parse(request.body.read) rescue {}
    incoming = payload["messages"] || []
    return render(json: { error: "messages must be non-empty" }, status: :bad_request) unless incoming.is_a?(Array) && incoming.any?

    agent = build_agent(payload["chat_id"])
    setup_sse_headers
    response.stream.write("data: #{{ chat_id: agent.id }.to_json}\n\n")

    stream_agent_response(agent, extract_user_content(incoming))
    response.stream.write("data: [DONE]\n\n")
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Chat not found" }, status: :not_found
  rescue IOError, Errno::EPIPE, ActionController::Live::ClientDisconnected
    # Client aborted streaming connection
  rescue => e
    Rails.logger.error("[OpenUI] #{e.class}: #{e.message}")
    response.stream.write("data: #{{ error: e.message }.to_json}\n\n") rescue nil
  ensure
    response.stream.close if response.stream
  end

  private

  def build_agent(chat_id)
    chat_id.present? ? UiAgent.find(chat_id) : UiAgent.create!
  end

  def extract_user_content(incoming)
    last_msg = incoming.last
    last_msg.is_a?(Hash) ? last_msg["content"].to_s : ""
  end

  def setup_sse_headers
    response.headers["Content-Type"]      = "text/event-stream"
    response.headers["Cache-Control"]     = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
  end

  def stream_agent_response(agent, user_content)
    agent.ask(user_content) do |chunk|
      next unless chunk.content.present?
      response.stream.write("data: #{sse_chunk(agent.model.to_s, chunk.content).to_json}\n\n")
    end
  end

  def sse_chunk(model, content)
    {
      id: "chatcmpl-#{SecureRandom.hex(8)}",
      object: "chat.completion.chunk",
      created: Time.now.to_i,
      model: model,
      choices: [ { index: 0, delta: { content: content }, finish_reason: nil } ]
    }
  end

  def set_cors_headers
    origin = request.headers["Origin"].presence || ENV.fetch("FRONTEND_ORIGIN", "*")
    response.headers["Access-Control-Allow-Origin"]  = origin
    response.headers["Vary"]                         = "Origin"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
  end

  def handle_preflight
    head :no_content if request.method == "OPTIONS"
  end
end
