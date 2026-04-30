import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("ScheduleSlots", (table) => {
    table.increments("id").primary();
    table
      .integer("employee_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("EmployeeProfiles")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .integer("branch_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("Branches")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table.dateTime("starts_at").notNullable();
    table.dateTime("ends_at").notNullable();
    table.enu("status", ["available", "blocked"]).notNullable().defaultTo("available");
    table.enu("source", ["manual", "generated"]).notNullable().defaultTo("manual");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index(["employee_id", "starts_at", "ends_at"]);
    table.index(["branch_id"]);
    table.index(["status"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("ScheduleSlots");
}
