class CreateTasks < ActiveRecord::Migration[8.1]
  def change
    create_table :tasks do |t|
      t.string :title, null: false
      t.string :priority, null: false, default: "medium"
      t.boolean :completed, null: false, default: false

      t.timestamps
    end
  end
end
