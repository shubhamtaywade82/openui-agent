# frozen_string_literal: true

require "net/http"
require "json"

# Base tool providing common helpers and error handling conventions for ruby_llm tools
class ApplicationTool < RubyLLM::Tool
  private

  # GET a JSON endpoint; returns the parsed body, or nil on any non-2xx response or network failure.
  def get_json(url, **query)
    uri = URI(url)
    uri.query = URI.encode_www_form(query) if query.any?
    response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: 4, read_timeout: 6) do |http|
      http.get(uri.request_uri)
    end
    response.is_a?(Net::HTTPSuccess) ? JSON.parse(response.body) : nil
  rescue StandardError => e
    Rails.logger.warn { "[#{self.class.name}] GET #{url} failed: #{e.class}: #{e.message}" }
    nil
  end

  # Consistent structured error format without throwing exceptions across tool boundaries
  def error_result(message)
    { error: message.to_s }
  end
end
