import { Knex } from "knex";
import logger from "../src/utils/logger";

export async function seed(knex: Knex): Promise<void> {
  const owner = await knex("Users").where({ role: "business_admin" }).first();
  if (!owner) {
    logger.info("No business admin found, skipping businesses seed.");
    return;
  }

  const businesses = [
    {
      owner_id: owner.id,
      name: "PitStop Шиномонтаж",
      description: "Шиномонтаж, балансировка и сезонное хранение шин.",
      business_type: "tire_service",
      phone: "+7 (900) 100-10-10",
      email: "hello@pitstop.example",
      website: "https://pitstop.example",
      status: "active",
    },
    {
      owner_id: owner.id,
      name: "Beauty Point",
      description: "Салон красоты с услугами для волос, ногтей и бровей.",
      business_type: "beauty_salon",
      phone: "+7 (900) 200-20-20",
      email: "hello@beautypoint.example",
      website: "https://beautypoint.example",
      status: "active",
    },
  ];

  for (const business of businesses) {
    const exists = await knex("Businesses").where({ name: business.name }).first();
    if (!exists) {
      await knex("Businesses").insert(business);
      logger.info(`Seeded business: ${business.name}`);
    }
  }
}
