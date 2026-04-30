import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("Appointments", (table) => {
    table.index(["starts_at", "status"], "appointments_starts_at_status_index");
    table.index(["client_id", "starts_at"], "appointments_client_id_starts_at_index");
  });

  await knex.schema.createTable("AppointmentReminders", (table) => {
    table.increments("id").primary();
    table
      .integer("appointment_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("Appointments")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("Users")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.string("reminder_type", 50).notNullable();
    table.dateTime("scheduled_for").notNullable();
    table.dateTime("sent_at").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.unique(["appointment_id", "user_id", "reminder_type"]);
    table.index(["scheduled_for"]);
    table.index(["user_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("AppointmentReminders");
  await knex.schema.alterTable("Appointments", (table) => {
    table.dropIndex(["client_id", "starts_at"], "appointments_client_id_starts_at_index");
    table.dropIndex(["starts_at", "status"], "appointments_starts_at_status_index");
  });
}
