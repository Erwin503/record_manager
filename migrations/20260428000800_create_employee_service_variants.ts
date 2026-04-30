import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("EmployeeServiceVariants", (table) => {
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
      .integer("service_variant_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("ServiceVariants")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");

    table.unique(["employee_id", "service_variant_id"]);
    table.index(["service_variant_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("EmployeeServiceVariants");
}
