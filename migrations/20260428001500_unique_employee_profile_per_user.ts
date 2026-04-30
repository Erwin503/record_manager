import { Knex } from "knex";

const COMPOSITE_UNIQUE = "employeeprofiles_user_id_business_id_unique";
const USER_UNIQUE = "employeeprofiles_user_id_unique";

const hasMySqlIndex = async (knex: Knex, tableName: string, indexName: string) => {
  const rows = await knex.raw("SHOW INDEX FROM ?? WHERE Key_name = ?", [tableName, indexName]);
  return Array.isArray(rows?.[0]) && rows[0].length > 0;
};

export async function up(knex: Knex): Promise<void> {
  if (knex.client.config.client !== "mysql2" && knex.client.config.client !== "mysql") {
    return;
  }

  const hasUserUnique = await hasMySqlIndex(knex, "EmployeeProfiles", USER_UNIQUE);
  if (!hasUserUnique) {
    await knex.schema.alterTable("EmployeeProfiles", (table) => {
      table.unique(["user_id"], USER_UNIQUE);
    });
  }

  const hasCompositeUnique = await hasMySqlIndex(knex, "EmployeeProfiles", COMPOSITE_UNIQUE);
  if (hasCompositeUnique) {
    await knex.schema.alterTable("EmployeeProfiles", (table) => {
      table.dropUnique(["user_id", "business_id"], COMPOSITE_UNIQUE);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (knex.client.config.client !== "mysql2" && knex.client.config.client !== "mysql") {
    return;
  }

  const hasUserUnique = await hasMySqlIndex(knex, "EmployeeProfiles", USER_UNIQUE);
  if (hasUserUnique) {
    await knex.schema.alterTable("EmployeeProfiles", (table) => {
      table.dropUnique(["user_id"], USER_UNIQUE);
    });
  }

  const hasCompositeUnique = await hasMySqlIndex(knex, "EmployeeProfiles", COMPOSITE_UNIQUE);
  if (!hasCompositeUnique) {
    await knex.schema.alterTable("EmployeeProfiles", (table) => {
      table.unique(["user_id", "business_id"], COMPOSITE_UNIQUE);
    });
  }
}
