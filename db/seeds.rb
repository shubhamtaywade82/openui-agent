# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

# Sample tasks so the task_manager tool has something to show on a fresh database
[
  [ "Review OpenUI pull request", "high", false ],
  [ "Configure Ollama model parameters", "medium", true ],
  [ "Verify SSE streaming latency", "urgent", false ]
].each do |title, priority, completed|
  Task.find_or_create_by!(title: title) { |task| task.assign_attributes(priority: priority, completed: completed) }
end
