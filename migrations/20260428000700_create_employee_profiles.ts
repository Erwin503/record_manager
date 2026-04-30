import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("EmployeeProfiles", (table) => {
    table.increments("id").primary();
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("Users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .integer("business_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("Businesses")
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
    table.string("position", 150).nullable();
    table.text("bio").nullable();
    table.string("photo_url", 500).nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.unique(["user_id"]);
    table.index(["business_id"]);
    table.index(["branch_id"]);
    table.index(["is_active"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("EmployeeProfiles");
}
