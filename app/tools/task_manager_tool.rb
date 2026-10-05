# frozen_string_literal: true

class TaskManagerTool < RubyLLM::Tool
  description "Manage tasks (list, add, or complete tasks) for the current user session."

  param :action, type: :string, desc: "Action to perform: 'list', 'create', or 'complete'"
  param :title, type: :string, desc: "Task title (required for create)", required: false
  param :priority, type: :string, desc: "Priority: low, medium, high, urgent", required: false

  # Ephemeral in-memory store for session tasks without heavy database overhead
  @tasks = [
    { id: 1, title: "Review OpenUI pull request", priority: "high", completed: false },
    { id: 2, title: "Configure Ollama model parameters", priority: "medium", completed: true },
    { id: 3, title: "Verify SSE streaming latency", priority: "urgent", completed: false }
  ]

  class << self
    attr_reader :tasks
  end

  def execute(action:, title: nil, priority: "medium")
    case action.to_s.downcase
    when "create"
      create_task(title, priority)
    when "complete"
      complete_task(title)
    else
      { tasks: self.class.tasks }
    end
  end

  private

  def create_task(title, priority)
    return { error: "Title is required to create a task" } if title.to_s.strip.empty?

    task = {
      id: self.class.tasks.size + 1,
      title: title.strip,
      priority: priority.to_s.presence || "medium",
      completed: false
    }
    self.class.tasks << task
    { success: true, task: task, total_tasks: self.class.tasks.size }
  end

  def complete_task(title)
    task = self.class.tasks.find { |t| t[:title].casecmp?(title.to_s.strip) }
    return { error: "Task not found: #{title}" } unless task

    task[:completed] = true
    { success: true, task: task }
  end
end
