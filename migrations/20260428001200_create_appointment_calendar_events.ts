import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("AppointmentCalendarEvents", (table) => {
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
      .integer("employee_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("EmployeeProfiles")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    table.string("calendar_id", 500).notNullable();
    table.string("external_event_id", 255).nullable();
    table.enu("sync_status", ["pending", "synced", "failed", "deleted"]).notNullable().defaultTo("pending");
    table.text("last_sync_error").nullable();
    table.dateTime("synced_at").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.unique(["appointment_id", "employee_id"]);
    table.index(["sync_status"]);
    table.index(["external_event_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("AppointmentCalendarEvents");
}
