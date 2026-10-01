# frozen_string_literal: true

class CreateEmployees < ActiveRecord::Migration[8.1]
  # A migration's `change` method is a single declarative block; splitting the
  # column list and index list into helpers would fight that convention for no
  # readability gain.
  # rubocop:disable Metrics/MethodLength
  def change
    create_table :employees do |t|
      t.string :first_name, null: false
      t.string :last_name, null: false
      t.string :email, null: false
      t.string :job_title, null: false
      t.string :department, null: false
      t.string :country, null: false
      t.decimal :salary_amount, precision: 12, scale: 2, null: false
      t.string :salary_currency, null: false
      t.date :hire_date, null: false

      t.timestamps
    end

    add_index :employees, :email, unique: true
    add_index :employees, :country
    add_index :employees, :department
    add_index :employees, :job_title
  end
  # rubocop:enable Metrics/MethodLength
end
