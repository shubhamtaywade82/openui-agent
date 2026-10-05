# frozen_string_literal: true

# Controller handling OpenUI SSE streaming, background agent execution, and chat persistence
class OpenuiController < ApplicationController
  include ActionController::Live
  include SseStreaming

  skip_forgery_protection
  before_action :set_cors_headers
  before_action :handle_preflight, only: %i[create create_chat show_chat destroy_chat list_chats list_models destroy_message]

  def index
    @chats = Chat.order(created_at: :desc).limit(10)
  end

  def create
    parsed = parse_request
    return render_bad_request(parsed[:error]) if parsed[:error]

    if parsed[:async]
      run_async(parsed)
    else
      runner = AgentRunner.new(chat_id: parsed[:chat_id], message: parsed[:message], options: parsed[:options])
      stream_agent(runner, agui: parsed[:protocol] == "ag-ui")
    end
  end

  def list_models
    ollama_models = RubyLLM.models.select { |m| m.respond_to?(:provider) && m.provider.to_s == "ollama" }
    render json: { models: ollama_models.map { |m| { id: m.id, name: m.id } } }
  rescue => e
    Rails.logger.warn "list_models failed: #{e.message}"
    render json: { models: [] }
  end

  def destroy_message
    chat = Chat.find(params[:id])
    message = chat.messages.find(params[:message_id])
    message.destroy
    head :no_content
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Not found" }, status: :not_found
  end

  def status
    chat = Chat.find(params[:id])
    render json: format_status_payload(chat)
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Chat not found" }, status: :not_found
  end

  def stream_status
    chat = Chat.find(params[:id])
    setup_sse_headers
    stream_chat_status(chat)
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Chat not found" }, status: :not_found
  rescue IOError, Errno::EPIPE, ActionController::Live::ClientDisconnected
    # Client disconnected — terminate stream gracefully
  ensure
    sse.close
  end

  def list_chats
    chats = Chat.joins(:messages).where(messages: { role: "user" }).distinct.order(created_at: :desc).limit(50)
    render json: chats.map { |c| chat_summary(c) }
  end

  def create_chat
    render json: chat_summary(Chat.create!), status: :created
  end

  def show_chat
    chat = Chat.find(params[:id])
    visible = chat.messages.where(role: %w[user assistant]).where.not(content: [ nil, "" ]).order(:id)
    messages = visible.map { |m| { id: m.id.to_s, role: m.role, content: m.content } }
    render json: { id: chat.id, messages: messages }
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Chat not found" }, status: :not_found
  end

  def destroy_chat
    chat = Chat.find(params[:id])
    chat.destroy
    head :no_content
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Chat not found" }, status: :not_found
  end

  private

  def parse_request
    body = JSON.parse(request.body.read) rescue {}
    messages = body["messages"]
    return { error: "messages must be a non-empty array" } unless messages.is_a?(Array) && messages.any?

    {
      chat_id: body["chat_id"] || body["threadId"],
      message: messages.last.is_a?(Hash) ? messages.last["content"].to_s : "",
      async: ActiveModel::Type::Boolean.new.cast(body["async"]),
      protocol: body["protocol"],
      options: {
        model: body.dig("options", "model").presence,
        temperature: body.dig("options", "temperature"),
        num_ctx: body.dig("options", "num_ctx"),
        disabled_tools: body.dig("options", "disabled_tools")
      }.compact
    }
  end

  def run_async(parsed)
    runner = AgentRunner.new(chat_id: parsed[:chat_id], message: parsed[:message], options: parsed[:options])
    agent = runner.find_or_create_agent
    AgentRunJob.perform_later(agent.id, parsed[:message])

    render json: {
      chat_id: agent.id,
      status: "queued",
      message: "Agent workflow started in background"
    }, status: :accepted
  end

  def stream_chat_status(chat)
    60.times do
      chat.reload
      last_message = chat.messages.order(:created_at).last
      sse.write_event(format_status_payload(chat))
      break if last_message&.role == "assistant"

      sleep 1.0
    end
    sse.write_done
  end

  def format_status_payload(chat)
    last_msg = chat.messages.order(:created_at).last
    is_complete = last_msg&.role == "assistant"

    {
      chat_id: chat.id,
      status: is_complete ? "complete" : "running",
      complete: is_complete,
      messages_count: chat.messages.count,
      last_message: last_msg ? { role: last_msg.role, content: last_msg.content.to_s } : nil
    }
  end

  def chat_summary(chat)
    first_prompt = chat.messages.find_by(role: "user")&.content
    { id: chat.id.to_s, title: first_prompt&.truncate(40) || "New chat", created_at: chat.created_at }
  end

  def render_bad_request(message)
    render json: { error: message }, status: :bad_request
  end

  def set_cors_headers
    origin = request.headers["Origin"].presence || ENV.fetch("FRONTEND_ORIGIN", "*")
    response.headers["Access-Control-Allow-Origin"]  = origin
    response.headers["Vary"]                         = "Origin"
    response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS, DELETE"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
  end

  def handle_preflight
    head :no_content if request.method == "OPTIONS"
  end
end
