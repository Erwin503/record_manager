import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("Users", (table) => {
    table.increments("id").primary();
    table.string("name", 150).notNullable();
    table.string("email", 150).notNullable().unique();
    table.string("password_hash", 255).notNullable();
    table.string("phone", 30).nullable();
    table
      .enu("role", ["super_admin", "business_admin", "employee", "client"])
      .notNullable()
      .defaultTo("client");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index(["role"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("Users");
}
