class OpenuiController < ApplicationController
  include ActionController::Live

  skip_forgery_protection
  before_action :set_cors_headers
  before_action :handle_preflight, only: :create

  def create
    body     = JSON.parse(request.body.read) rescue {}
    incoming = body["messages"] || []
    chat_id  = body["chat_id"]

    unless incoming.is_a?(Array) && incoming.any?
      render json: { error: "messages must be a non-empty array" }, status: :bad_request
      return
    end

    agent = if chat_id.present?
              OpenuiAgent.find(chat_id)
            else
              OpenuiAgent.create!
            end

    user_content = incoming.last.is_a?(Hash) ? incoming.last["content"].to_s : ""

    response.headers["Content-Type"]      = "text/event-stream"
    response.headers["Cache-Control"]     = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"

    response.stream.write("data: #{{ chat_id: agent.id }.to_json}\n\n")

    agent.ask(user_content) do |chunk|
      next unless chunk.content.present?

      payload = {
        id: "chatcmpl-#{SecureRandom.hex(8)}",
        object: "chat.completion.chunk",
        created: Time.now.to_i,
        model: agent.model.to_s,
        choices: [{
          index: 0,
          delta: { content: chunk.content },
          finish_reason: nil
        }]
      }

      response.stream.write("data: #{payload.to_json}\n\n")
    end

    response.stream.write("data: [DONE]\n\n")
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Chat not found" }, status: :not_found
  rescue IOError, Errno::EPIPE, ActionController::Live::ClientDisconnected
    # client disconnected
  rescue => e
    Rails.logger.error("[OpenUI] #{e.class}: #{e.message}")
    begin
      response.stream.write("data: #{{ error: e.message }.to_json}\n\n")
      response.stream.write("data: [DONE]\n\n")
    rescue; end
  ensure
    response.stream.close if response.stream
  end

  private

  def set_cors_headers
    origin = ENV.fetch("FRONTEND_ORIGIN", "http://localhost:5173")
    response.headers["Access-Control-Allow-Origin"]  = origin
    response.headers["Vary"]                         = "Origin"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
  end

  def handle_preflight
    head :no_content if request.method == "OPTIONS"
  end
end
