import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("ServiceVariants", (table) => {
    table.increments("id").primary();
    table
      .integer("service_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("Services")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.string("name", 150).notNullable();
    table.integer("duration_minutes").unsigned().notNullable();
    table.decimal("price", 12, 2).notNullable().defaultTo(0);
    table.string("currency", 3).notNullable().defaultTo("RUB");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.unique(["service_id", "name"]);
    table.index(["service_id"]);
    table.index(["is_active"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("ServiceVariants");
}
