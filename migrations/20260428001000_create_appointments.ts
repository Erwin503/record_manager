import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("Appointments", (table) => {
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
      .integer("branch_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("Branches")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table
      .integer("service_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("Services")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .integer("service_variant_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("ServiceVariants")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .integer("employee_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("EmployeeProfiles")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");
    table
      .integer("client_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("Users")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table
      .integer("schedule_slot_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("ScheduleSlots")
      .onDelete("SET NULL")
      .onUpdate("CASCADE");
    table.dateTime("starts_at").notNullable();
    table.dateTime("ends_at").notNullable();
    table
      .enu("status", ["pending", "confirmed", "in_progress", "completed", "canceled", "no_show"])
      .notNullable()
      .defaultTo("pending");
    table.decimal("price_snapshot", 12, 2).notNullable().defaultTo(0);
    table.integer("duration_snapshot_minutes").unsigned().notNullable();
    table.string("client_name", 150).notNullable();
    table.string("client_phone", 30).nullable();
    table.string("client_email", 150).nullable();
    table.text("comment").nullable();
    table.text("cancel_reason").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index(["business_id", "starts_at"]);
    table.index(["employee_id", "starts_at", "ends_at"]);
    table.index(["client_id"]);
    table.index(["status"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("Appointments");
}
