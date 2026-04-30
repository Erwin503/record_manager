import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("YandexCalendarConnections", (table) => {
    table.increments("id").primary();
    table
      .integer("employee_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("EmployeeProfiles")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.string("username", 255).notNullable();
    table.string("calendar_url", 500).notNullable();
    table.text("app_password_encrypted").notNullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("connected_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index(["employee_id"]);
    table.index(["username"]);
    table.index(["is_active"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("YandexCalendarConnections");
}
