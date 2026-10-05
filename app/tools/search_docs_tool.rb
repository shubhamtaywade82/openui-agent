# frozen_string_literal: true

class SearchDocsTool < ApplicationTool
  description "Search project documentation and knowledge base for relevant information"

  param :query, type: :string, desc: "Search query or keywords"

  DOCS_PATH = Rails.root.join("docs")

  def execute(query:)
    return error_result("Docs directory does not exist") unless DOCS_PATH.exist?

    matched = find_matches(query)
    return { message: "No documents found matching '#{query}'" } if matched.empty?

    { query: query, results: matched.first(5) }
  end

  private

  def find_matches(query)
    term = query.downcase.strip
    Dir.glob(DOCS_PATH.join("**/*.{md,txt,markdown}")).filter_map do |path|
      content = File.read(path)
      next unless content.downcase.include?(term)

      {
        title: File.basename(path),
        path: path.sub("#{Rails.root}/", ""),
        snippet: extract_snippet(content, term)
      }
    end
  end

  def extract_snippet(content, term, window: 300)
    idx = content.downcase.index(term) || 0
    start = [ idx - 60, 0 ].max
    content[start, window].strip
  end
end
