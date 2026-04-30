import { Knex } from "knex";
import logger from "../src/utils/logger";

export async function seed(knex: Knex): Promise<void> {
  const pitstop = await knex("Businesses").where({ name: "PitStop Шиномонтаж" }).first();
  const beauty = await knex("Businesses").where({ name: "Beauty Point" }).first();

  const data = [
    {
      business: pitstop,
      category: "Шиномонтаж",
      service: "Смена шин",
      variants: [
        { name: "R13-R15", duration_minutes: 30, price: 2500 },
        { name: "R16-R18", duration_minutes: 45, price: 3500 },
        { name: "RunFlat", duration_minutes: 90, price: 8000 },
      ],
    },
    {
      business: beauty,
      category: "Волосы",
      service: "Стрижка",
      variants: [
        { name: "Короткие волосы", duration_minutes: 45, price: 2500 },
        { name: "Средние волосы", duration_minutes: 60, price: 3500 },
        { name: "Длинные волосы", duration_minutes: 90, price: 5000 },
      ],
    },
  ];

  for (const item of data) {
    if (!item.business) continue;
    const category = await knex("ServiceCategories")
      .where({ business_id: item.business.id, name: item.category })
      .first();
    let service = await knex("Services")
      .where({ business_id: item.business.id, name: item.service })
      .first();
    if (!service) {
      const [id] = await knex("Services").insert({
        business_id: item.business.id,
        category_id: category?.id ?? null,
        name: item.service,
        description: item.service,
        is_active: true,
      });
      service = await knex("Services").where({ id }).first();
      logger.info(`Seeded service: ${item.service}`);
    }

    for (const variant of item.variants) {
      const exists = await knex("ServiceVariants")
        .where({ service_id: service.id, name: variant.name })
        .first();
      if (!exists) {
        await knex("ServiceVariants").insert({
          service_id: service.id,
          ...variant,
          currency: "RUB",
          is_active: true,
        });
        logger.info(`Seeded service variant: ${variant.name}`);
      }
    }
  }
}
