import { Knex } from "knex";
import logger from "../src/utils/logger";

export async function seed(knex: Knex): Promise<void> {
  const tireMaster = await knex("Users").where({ email: "tire.master@example.com" }).first();
  const beautyMaster = await knex("Users").where({ email: "beauty.master@example.com" }).first();
  const pitstop = await knex("Businesses").where({ name: "PitStop Шиномонтаж" }).first();
  const beauty = await knex("Businesses").where({ name: "Beauty Point" }).first();
  const pitstopBranch = pitstop
    ? await knex("Branches").where({ business_id: pitstop.id }).first()
    : null;
  const beautyBranch = beauty
    ? await knex("Branches").where({ business_id: beauty.id }).first()
    : null;

  const profiles = [
    tireMaster &&
      pitstop && {
        user_id: tireMaster.id,
        business_id: pitstop.id,
        branch_id: pitstopBranch?.id ?? null,
        position: "Мастер шиномонтажа",
        bio: "Работает с легковыми авто, SUV и RunFlat.",
        is_active: true,
      },
    beautyMaster &&
      beauty && {
        user_id: beautyMaster.id,
        business_id: beauty.id,
        branch_id: beautyBranch?.id ?? null,
        position: "Стилист",
        bio: "Стрижки и уход для разных типов волос.",
        is_active: true,
      },
  ].filter(Boolean);

  for (const profile of profiles) {
    const exists = await knex("EmployeeProfiles")
      .where({ user_id: profile.user_id })
      .first();
    if (!exists) {
      await knex("EmployeeProfiles").insert(profile);
      logger.info(`Seeded employee profile for user ${profile.user_id}`);
    }
  }
}
