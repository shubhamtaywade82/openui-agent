require "net/http"
require "uri"
require "resolv"
require "ipaddr"
require "nokogiri"

class WebScrapeTool < ApplicationTool
  description "Fetch and extract web content. Prefers clean LLM-friendly Markdown when available."

  param :url, type: :string, desc: "Full URL starting with http:// or https://"

  def execute(url:)
    uri = URI.parse(url.to_s.strip) rescue nil
    return error_result("Invalid URL. Must begin with http:// or https://") unless valid_http_uri?(uri)
    return error_result("Access to private/local network addresses is prohibited") unless safe_host?(uri.host)

    markdown = try_markdown_variants(uri)
    if markdown.present?
      return {
        url: url,
        format: "markdown",
        title: extract_title_from_markdown(markdown) || uri.host,
        content: markdown.truncate(8000)
      }
    end

    extract_html_content(uri, url)
  rescue StandardError => e
    error_result("Scraping failed: #{e.message}")
  end

  private

  def valid_http_uri?(uri)
    uri.is_a?(URI::HTTP) || uri.is_a?(URI::HTTPS)
  end

  def safe_host?(host)
    return false if host.blank?

    # Resolve IP address to detect internal, loopback, or cloud-metadata destinations
    ips = Resolv.getaddresses(host)
    return false if ips.empty?

    ips.none? do |ip_str|
      ip = IPAddr.new(ip_str)
      ip.loopback? || ip.private? || ip.link_local?
    end
  rescue StandardError
    false
  end

  def try_markdown_variants(original_uri)
    markdown_candidate_uris(original_uri).each do |cand|
      body = fetch(cand, accept: "text/markdown, text/plain")
      return body if looks_like_markdown?(body)
    end
    nil
  end

  def markdown_candidate_uris(uri)
    candidates = [
      build_query_variant(uri, "plain=1"),
      build_query_variant(uri, "markdown=1"),
      build_path_variant(uri, ".md"),
      github_raw_variant(uri)
    ].compact.uniq

    candidates.select { |u| valid_http_uri?(u) }
  end

  def build_query_variant(uri, query_param)
    uri.dup.tap { |u| u.query = [ u.query, query_param ].compact.join("&") }
  end

  def build_path_variant(uri, extension)
    path = uri.path.presence || "/"
    return nil if path.end_with?(extension)

    clean = path.sub(%r{/+$}, "")
    new_path = clean.empty? ? "/index#{extension}" : "#{clean}#{extension}"
    uri.dup.tap { |u| u.path = new_path }
  rescue URI::Error
    nil
  end

  def github_raw_variant(uri)
    return nil unless uri.host == "github.com" && uri.path.include?("/blob/")

    raw_str = uri.to_s.sub("github.com", "raw.githubusercontent.com").sub("/blob/", "/")
    URI.parse(raw_str) rescue nil
  end

  def looks_like_markdown?(text)
    return false if text.blank? || text.length < 40

    text.include?("# ") || text.include?("```") || text.match?(/^[-*]\s+\w+/) || text.match?(/\[.+\]\(.+\)/)
  end

  def extract_title_from_markdown(md)
    md.lines.find { |l| l.start_with?("# ") }&.sub(/^#\s+/, "")&.strip
  end

  def extract_html_content(uri, url)
    html = fetch(uri, accept: "text/html")
    return { error: "Failed to retrieve page content" } if html.blank?

    doc = Nokogiri::HTML(html)
    doc.css("script, style, nav, footer, header, aside, noscript, iframe, svg, .sidebar, .menu").remove

    title = doc.at_css("title")&.text&.strip.presence || doc.at_css("h1")&.text&.strip.presence || uri.host
    main = doc.at_css("article") || doc.at_css("main") || doc.at_css("[role=main]") || doc.at_css("body")
    text = main&.text.to_s.gsub(/\s+/, " ").strip.truncate(6000)

    {
      url: url,
      format: "html_extracted",
      title: title,
      content: text.presence || "No readable content found."
    }
  end

  def fetch(uri, accept:, redirect_limit: 2)
    return nil if redirect_limit.negative?

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = (uri.scheme == "https")
    http.open_timeout = 5
    http.read_timeout = 8

    req = Net::HTTP::Get.new(uri)
    req["User-Agent"] = "Mozilla/5.0 (compatible; OpenUIBot/1.0)"
    req["Accept"] = accept

    res = http.request(req)
    if res.is_a?(Net::HTTPRedirection) && res["location"]
      fetch(URI.parse(res["location"]), accept: accept, redirect_limit: redirect_limit - 1)
    else
      res.is_a?(Net::HTTPSuccess) ? res.body.force_encoding("UTF-8") : nil
    end
  rescue
    nil
  end
end
