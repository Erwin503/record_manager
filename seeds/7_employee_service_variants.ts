import { Knex } from "knex";
import logger from "../src/utils/logger";

export async function seed(knex: Knex): Promise<void> {
  const profiles = await knex("EmployeeProfiles as ep")
    .join("Businesses as b", "ep.business_id", "b.id")
    .select("ep.id", "b.name as business_name");

  for (const profile of profiles) {
    const variants = await knex("ServiceVariants as sv")
      .join("Services as s", "sv.service_id", "s.id")
      .join("Businesses as b", "s.business_id", "b.id")
      .where("b.name", profile.business_name)
      .select("sv.id");

    for (const variant of variants) {
      const record = {
        employee_id: profile.id,
        service_variant_id: variant.id,
      };
      const exists = await knex("EmployeeServiceVariants").where(record).first();
      if (!exists) {
        await knex("EmployeeServiceVariants").insert(record);
        logger.info(`Linked employee ${profile.id} to variant ${variant.id}`);
      }
    }
  }
}
