import { Knex } from "knex";
import logger from "../src/utils/logger";

export async function seed(knex: Knex): Promise<void> {
  const businesses = await knex("Businesses").select("id", "name");

  for (const business of businesses) {
    const names =
      business.name === "PitStop Шиномонтаж"
        ? ["Шиномонтаж", "Балансировка"]
        : ["Волосы", "Ногти"];

    for (const name of names) {
      const exists = await knex("ServiceCategories")
        .where({ business_id: business.id, name })
        .first();
      if (!exists) {
        await knex("ServiceCategories").insert({
          business_id: business.id,
          name,
          description: `${name} services`,
        });
        logger.info(`Seeded service category: ${name}`);
      }
    }
  }
}
