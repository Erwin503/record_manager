import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("ServiceVariants", "rebook_reminder_days");
  if (hasColumn) return;

  await knex.schema.alterTable("ServiceVariants", (table) => {
    table.integer("rebook_reminder_days").unsigned().nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("ServiceVariants", "rebook_reminder_days");
  if (!hasColumn) return;

  await knex.schema.alterTable("ServiceVariants", (table) => {
    table.dropColumn("rebook_reminder_days");
  });
}
