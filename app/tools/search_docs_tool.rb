# frozen_string_literal: true

class SearchDocsTool < ApplicationTool
  description "Search project documentation and knowledge base for relevant information"

  param :query, type: :string, desc: "Search query or keywords"

  DOCS_PATH = Rails.root.join("docs")
  MAX_RESULTS = 5
  MIN_TERM_LENGTH = 3
  RENDER_CARD_COUNT = 3
  # A small local model improvises DocPreviewCard arguments and invents URLs, so the tool hands it exact lines to copy.
  RENDER_INSTRUCTION = [
    "Copy the lines above exactly. Define root = Card([...]) once, listing those names plus one TextContent variable of 1-3 sentences " \
    "that answers the question using only the snippets above. Never invent paths, links or document names."
  ].freeze
  STOP_WORDS = %w[and the for with about what how are does from that this into your].freeze

  def execute(query:)
    return error_result("Docs directory does not exist") unless DOCS_PATH.exist?

    terms = search_terms(query)
    return error_result("Query has no searchable words") if terms.empty?

    matched = find_matches(terms)
    return { message: "No documents found matching '#{query}'" } if matched.empty?

    results = matched.first(MAX_RESULTS)
    { query: query, results: results, render_as: render_lines(results) + RENDER_INSTRUCTION }
  end

  private

  def render_lines(results)
    results.first(RENDER_CARD_COUNT).each_with_index.map do |result, index|
      snippet = result[:snippet].squish
      "docCard#{index + 1} = DocPreviewCard(#{result[:title].to_json}, #{snippet.to_json}, #{result[:path].to_json})"
    end
  end

  def search_terms(query)
    query.downcase.scan(/[[:alnum:]]+/).reject { |word| word.length < MIN_TERM_LENGTH || STOP_WORDS.include?(word) }.uniq
  end

  # Documents matching more of the query's words rank first.
  def find_matches(terms)
    scored = Dir.glob(DOCS_PATH.join("**/*.{md,txt,markdown}")).filter_map do |path|
      content = File.read(path)
      hits = terms.select { |term| content.downcase.include?(term) }
      next if hits.empty?

      [ hits.size, { title: File.basename(path), path: path.sub("#{Rails.root}/", ""),
                     matched_terms: hits, snippet: extract_snippet(content, hits.first) } ]
    end
    scored.sort_by { |score, _| -score }.map(&:last)
  end

  def extract_snippet(content, term, window: 300)
    idx = content.downcase.index(term) || 0
    start = [ idx - 60, 0 ].max
    content[start, window].strip
  end
end
