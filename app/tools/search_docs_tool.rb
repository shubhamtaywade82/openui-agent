# frozen_string_literal: true

class SearchDocsTool < ApplicationTool
  description "Search project documentation and knowledge base for relevant information"

  param :query, type: :string, desc: "Search query or keywords"

  DOCS_PATH = Rails.root.join("docs")
  MAX_RESULTS = 5
  MIN_TERM_LENGTH = 3
  STOP_WORDS = %w[and the for with about what how are does from that this into your].freeze

  def execute(query:)
    return error_result("Docs directory does not exist") unless DOCS_PATH.exist?

    terms = search_terms(query)
    return error_result("Query has no searchable words") if terms.empty?

    matched = find_matches(terms)
    return { message: "No documents found matching '#{query}'" } if matched.empty?

    { query: query, results: matched.first(MAX_RESULTS) }
  end

  private

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
