require("ts-node/register");
require("dotenv").config();

const { spawnSync } = require("node:child_process");
const createKnex = require("knex");
const knexConfig = require("../knexfile");

const tables = [
  "AppointmentQrTokens",
  "QueueQrTokens",
  "Notifications",
  "AppointmentCalendarEvents",
  "YandexCalendarConnections",
  "Appointments",
  "Sessions",
  "ScheduleSlots",
  "WorkingHours",
  "EmployeeServiceVariants",
  "EmployeeProfiles",
  "EmployeeDetails",
  "ServiceVariants",
  "Services",
  "Directions",
  "ServiceCategories",
  "Categories",
  "Branches",
  "Districts",
  "Businesses",
  "Users",
  "knex_migrations_lock",
  "knex_migrations",
];

async function dropKnownTables() {
  const db = createKnex(knexConfig.development);
  const client = knexConfig.development.client;

  try {
    if (client === "mysql2" || client === "mysql") {
      await db.raw("SET FOREIGN_KEY_CHECKS = 0");
    }

    for (const table of tables) {
      await db.schema.dropTableIfExists(table);
    }

    if (client === "mysql2" || client === "mysql") {
      await db.raw("SET FOREIGN_KEY_CHECKS = 1");
    }
  } finally {
    await db.destroy();
  }
}

async function main() {
  await dropKnownTables();

  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(npx, ["knex", "migrate:latest"], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
  });

  process.exit(result.status ?? 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
