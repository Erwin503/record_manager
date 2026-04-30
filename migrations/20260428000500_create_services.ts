import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("Services", (table) => {
    table.increments("id").primary();
    table
      .integer("business_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("Businesses")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .integer("category_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("ServiceCategories")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table.string("name", 150).notNullable();
    table.text("description").nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index(["business_id"]);
    table.index(["category_id"]);
    table.index(["is_active"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("Services");
}
