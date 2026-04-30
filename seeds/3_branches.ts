import { Knex } from "knex";
import logger from "../src/utils/logger";

export async function seed(knex: Knex): Promise<void> {
  const pitstop = await knex("Businesses").where({ name: "PitStop Шиномонтаж" }).first();
  const beauty = await knex("Businesses").where({ name: "Beauty Point" }).first();

  const branches = [
    pitstop && {
      business_id: pitstop.id,
      name: "PitStop Центральный",
      address: "Москва, ул. Автозаводская, 10",
      city: "Москва",
      phone: "+7 (900) 100-10-10",
      timezone: "Europe/Moscow",
      is_main: true,
    },
    beauty && {
      business_id: beauty.id,
      name: "Beauty Point Центр",
      address: "Москва, ул. Тверская, 7",
      city: "Москва",
      phone: "+7 (900) 200-20-20",
      timezone: "Europe/Moscow",
      is_main: true,
    },
  ].filter(Boolean);

  for (const branch of branches) {
    const exists = await knex("Branches")
      .where({ business_id: branch.business_id, name: branch.name })
      .first();
    if (!exists) {
      await knex("Branches").insert(branch);
      logger.info(`Seeded branch: ${branch.name}`);
    }
  }
}
