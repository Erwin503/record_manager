import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("Businesses", (table) => {
    table.increments("id").primary();
    table
      .integer("owner_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("Users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.string("name", 150).notNullable();
    table.text("description").nullable();
    table
      .enu("business_type", [
        "tire_service",
        "beauty_salon",
        "barbershop",
        "spa",
        "repair_service",
        "other",
      ])
      .notNullable()
      .defaultTo("other");
    table.string("phone", 30).nullable();
    table.string("email", 150).nullable();
    table.string("website", 255).nullable();
    table.enu("status", ["active", "inactive", "suspended"]).notNullable().defaultTo("active");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index(["owner_id"]);
    table.index(["business_type"]);
    table.index(["status"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("Businesses");
}
