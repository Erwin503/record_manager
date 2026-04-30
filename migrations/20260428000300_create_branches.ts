import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("Branches", (table) => {
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
    table.string("address", 255).notNullable();
    table.string("city", 100).nullable();
    table.decimal("latitude", 10, 7).nullable();
    table.decimal("longitude", 10, 7).nullable();
    table.string("phone", 30).nullable();
    table.string("timezone", 64).notNullable().defaultTo("Europe/Moscow");
    table.boolean("is_main").notNullable().defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index(["business_id"]);
    table.index(["city"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("Branches");
}
