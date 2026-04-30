import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (knex.client.config.client !== "mysql2" && knex.client.config.client !== "mysql") {
    return;
  }

  await knex.schema.alterTable("AppointmentReminders", (table) => {
    table.dateTime("sent_at").nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  if (knex.client.config.client !== "mysql2" && knex.client.config.client !== "mysql") {
    return;
  }

  await knex("AppointmentReminders").whereNull("sent_at").update({ sent_at: knex.fn.now() });
  await knex.schema.alterTable("AppointmentReminders", (table) => {
    table.dateTime("sent_at").notNullable().alter();
  });
}
