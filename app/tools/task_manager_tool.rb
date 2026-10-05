# frozen_string_literal: true

class TaskManagerTool < ApplicationTool
  description "Manage tasks (list, add, or complete tasks) for the current user session."

  param :action, type: :string, desc: "Action to perform: 'list', 'create', or 'complete'"
  param :title, type: :string, desc: "Task title (required for create)", required: false
  param :priority, type: :string, desc: "Priority: low, medium, high, urgent", required: false

  def execute(action:, title: nil, priority: "medium")
    case action.to_s.downcase
    when "create"
      create_task(title, priority)
    when "complete"
      complete_task(title)
    else
      { tasks: Task.in_creation_order.map { |task| task_payload(task) } }
    end
  end

  private

  def create_task(title, priority)
    return error_result("Title is required to create a task") if title.to_s.strip.empty?

    task = Task.new(title: title.strip, priority: priority.to_s.presence || "medium")
    return error_result(task.errors.full_messages.to_sentence) unless task.save

    { success: true, task: task_payload(task), total_tasks: Task.count }
  end

  def complete_task(title)
    task = Task.find_by("lower(title) = ?", title.to_s.strip.downcase)
    return error_result("Task not found: #{title}") unless task

    task.update!(completed: true)
    { success: true, task: task_payload(task) }
  end

  def task_payload(task)
    { id: task.id, title: task.title, priority: task.priority, completed: task.completed }
  end
end
