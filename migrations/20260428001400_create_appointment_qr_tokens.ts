import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("AppointmentQrTokens", (table) => {
    table.increments("id").primary();
    table.uuid("token").notNullable().unique();
    table
      .integer("appointment_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("Appointments")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.timestamp("expires_at").nullable();
    table.boolean("used").notNullable().defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index(["appointment_id"]);
    table.index(["used"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("AppointmentQrTokens");
}
