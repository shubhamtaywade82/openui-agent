require "net/http"
require "uri"
require "nokogiri"

class WebScrapeTool < RubyLLM::Tool
  description "Fetch and extract readable text from a URL. Use after WebSearch to get full page content."

  param :url, type: :string, desc: "Full URL starting with http:// or https://"

  def execute(url:)
    uri = URI.parse(url.to_s.strip) rescue nil
    return { error: "Invalid URL. Must begin with http:// or https://" } unless valid_http_uri?(uri)

    html = fetch_html(uri)
    return { error: "Failed to retrieve page content" } if html.blank?

    extract_page_data(uri, html)
  rescue => e
    { error: "Scraping failed: #{e.message}" }
  end

  private

  def valid_http_uri?(uri)
    uri.is_a?(URI::HTTP) || uri.is_a?(URI::HTTPS)
  end

  def extract_page_data(uri, html)
    doc = Nokogiri::HTML(html)
    doc.css("script, style, nav, footer, header, aside, noscript, iframe, svg").remove

    title = doc.at_css("title")&.text&.strip.presence || uri.host
    main = doc.at_css("article") || doc.at_css("main") || doc.at_css("[role=main]") || doc.at_css("body")
    text = main&.text.to_s.gsub(/\s+/, " ").strip.truncate(4000)

    {
      url: uri.to_s,
      title: title,
      content: text.presence || "No readable text content found."
    }
  end

  def fetch_html(uri, redirect_limit = 2)
    return nil if redirect_limit.negative?

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = (uri.scheme == "https")
    http.open_timeout = 6
    http.read_timeout = 8

    req = Net::HTTP::Get.new(uri)
    req["User-Agent"] = "Mozilla/5.0 (compatible; OpenUIBot/1.0)"

    res = http.request(req)
    if res.is_a?(Net::HTTPRedirection) && res["location"]
      fetch_html(URI.parse(res["location"]), redirect_limit - 1)
    else
      res.is_a?(Net::HTTPSuccess) ? res.body : nil
    end
  rescue
    nil
  end
end
