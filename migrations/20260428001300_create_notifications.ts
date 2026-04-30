import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("Notifications", (table) => {
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
      .integer("appointment_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("Appointments")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table.string("title", 255).notNullable();
    table.text("message").nullable();
    table.enu("type", ["internal", "email", "sms", "calendar"]).notNullable().defaultTo("internal");
    table.boolean("is_read").notNullable().defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index(["user_id", "created_at"]);
    table.index(["appointment_id"]);
    table.index(["is_read"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("Notifications");
}
