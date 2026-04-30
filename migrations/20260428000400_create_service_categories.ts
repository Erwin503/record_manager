import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("ServiceCategories", (table) => {
    table.increments("id").primary();
    table
      .integer("business_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("Businesses")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.string("name", 150).notNullable();
    table.text("description").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.unique(["business_id", "name"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("ServiceCategories");
}
