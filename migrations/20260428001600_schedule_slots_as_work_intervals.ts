import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (knex.client.config.client !== "mysql2" && knex.client.config.client !== "mysql") {
    return;
  }

  await knex("ScheduleSlots").where({ status: "booked" }).update({ status: "available" });
  await knex.raw(
    "ALTER TABLE ?? MODIFY ?? ENUM('available', 'blocked') NOT NULL DEFAULT 'available'",
    ["ScheduleSlots", "status"]
  );
}

export async function down(knex: Knex): Promise<void> {
  if (knex.client.config.client !== "mysql2" && knex.client.config.client !== "mysql") {
    return;
  }

  await knex.raw(
    "ALTER TABLE ?? MODIFY ?? ENUM('available', 'booked', 'blocked') NOT NULL DEFAULT 'available'",
    ["ScheduleSlots", "status"]
  );
}
