require "net/http"
require "json"
require "uri"

class WebSearchTool < RubyLLM::Tool
  description "Search the live web for current information, news, facts, or documentation"

  param :query, type: :string, desc: "Search query"
  param :max_results, type: :integer, desc: "Number of results to return (1-8)", required: false

  def execute(query:, max_results: 5)
    limit = [ [ max_results.to_i, 1 ].max, 8 ].min

    if ENV["TAVILY_API_KEY"].present?
      tavily_search(query, limit)
    elsif ENV["BRAVE_API_KEY"].present?
      brave_search(query, limit)
    else
      { error: "No search key configured. Set TAVILY_API_KEY or BRAVE_API_KEY in .env." }
    end
  end

  private

  def tavily_search(query, limit)
    uri = URI("https://api.tavily.com/search")
    payload = {
      api_key: ENV["TAVILY_API_KEY"],
      query: query,
      search_depth: "basic",
      max_results: limit,
      include_answer: false
    }.to_json

    response = Net::HTTP.post(uri, payload, "Content-Type" => "application/json")
    data = JSON.parse(response.body) rescue {}

    results = (data["results"] || []).map do |r|
      { title: r["title"], url: r["url"], content: r["content"].to_s.truncate(400) }
    end

    { query: query, results: results }
  rescue => e
    { error: "Tavily search failed: #{e.message}" }
  end

  def brave_search(query, limit)
    uri = URI("https://api.search.brave.com/res/v1/web/search")
    uri.query = URI.encode_www_form(q: query, count: limit)

    req = Net::HTTP::Get.new(uri)
    req["X-Subscription-Token"] = ENV["BRAVE_API_KEY"]
    req["Accept"] = "application/json"

    res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(req) }
    data = JSON.parse(res.body) rescue {}

    results = (data.dig("web", "results") || []).map do |r|
      { title: r["title"], url: r["url"], content: r["description"].to_s.truncate(400) }
    end

    { query: query, results: results }
  rescue => e
    { error: "Brave search failed: #{e.message}" }
  end
end
