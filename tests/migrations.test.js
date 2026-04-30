require("ts-node/register");

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const createKnex = require("knex");

const rootDir = path.resolve(__dirname, "..");
const migrationsDir = path.join(rootDir, "migrations");

const createTestDb = () =>
  createKnex({
    client: "sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
  });

const loadMigrations = () =>
  fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".ts"))
    .sort()
    .map((file) => ({
      name: file,
      module: require(path.join(migrationsDir, file)),
    }));

const getTables = async (db) => {
  const rows = await db.raw("SELECT name FROM sqlite_master WHERE type = 'table'");
  return rows.map((row) => row.name).filter((name) => !name.startsWith("sqlite_"));
};

const getColumns = async (db, tableName) => {
  const rows = await db.raw(`PRAGMA table_info("${tableName}")`);
  return rows.map((row) => row.name);
};

const getIndexes = async (db, tableName) => db.raw(`PRAGMA index_list("${tableName}")`);

test("migrations create the business booking schema table by table", async (t) => {
  const db = createTestDb();
  t.after(() => db.destroy());

  for (const migration of loadMigrations()) {
    await migration.module.up(db);
  }

  const tables = await getTables(db);
  assert.deepEqual(
    [
      "AppointmentCalendarEvents",
      "AppointmentQrTokens",
      "AppointmentReminders",
      "Appointments",
      "Branches",
      "Businesses",
      "EmployeeProfiles",
      "EmployeeServiceVariants",
      "Notifications",
      "ScheduleSlots",
      "ServiceCategories",
      "ServiceVariants",
      "Services",
      "Users",
      "YandexCalendarConnections",
    ].sort(),
    tables.sort()
  );

  for (const oldTable of [
    "Districts",
    "Directions",
    "Categories",
    "Sessions",
    "WorkingHours",
    "EmployeeDetails",
    "QueueQrTokens",
  ]) {
    assert.equal(tables.includes(oldTable), false, `${oldTable} should not be recreated`);
  }
});

test("service variants keep duration and employees are linked to variants", async (t) => {
  const db = createTestDb();
  t.after(() => db.destroy());

  for (const migration of loadMigrations()) {
    await migration.module.up(db);
  }

  const variantColumns = await getColumns(db, "ServiceVariants");
  assert.ok(variantColumns.includes("duration_minutes"));
  assert.ok(variantColumns.includes("rebook_reminder_days"));
  assert.ok(variantColumns.includes("price"));
  assert.ok(variantColumns.includes("currency"));

  const employeeVariantColumns = await getColumns(db, "EmployeeServiceVariants");
  assert.deepEqual(
    ["employee_id", "service_variant_id"].every((column) => employeeVariantColumns.includes(column)),
    true
  );

  const indexes = await getIndexes(db, "EmployeeServiceVariants");
  assert.ok(indexes.some((index) => index.unique === 1), "employee/service variant pair must be unique");

  const profileIndexes = await getIndexes(db, "EmployeeProfiles");
  assert.ok(profileIndexes.some((index) => index.unique === 1), "one employee profile per user is required");
});

test("appointments store snapshots and Yandex calendar sync state", async (t) => {
  const db = createTestDb();
  t.after(() => db.destroy());

  for (const migration of loadMigrations()) {
    await migration.module.up(db);
  }

  const appointmentColumns = await getColumns(db, "Appointments");
  for (const column of [
    "business_id",
    "branch_id",
    "service_id",
    "service_variant_id",
    "employee_id",
    "schedule_slot_id",
    "starts_at",
    "ends_at",
    "price_snapshot",
    "duration_snapshot_minutes",
    "status",
  ]) {
    assert.ok(appointmentColumns.includes(column), `Appointments.${column} is required`);
  }

  const connectionColumns = await getColumns(db, "YandexCalendarConnections");
  assert.ok(connectionColumns.includes("app_password_encrypted"));
  assert.ok(connectionColumns.includes("calendar_url"));

  const eventColumns = await getColumns(db, "AppointmentCalendarEvents");
  for (const column of ["appointment_id", "employee_id", "calendar_id", "external_event_id", "sync_status"]) {
    assert.ok(eventColumns.includes(column), `AppointmentCalendarEvents.${column} is required`);
  }
});

test("appointment reminders prevent duplicate client reminders", async (t) => {
  const db = createTestDb();
  t.after(() => db.destroy());

  for (const migration of loadMigrations()) {
    await migration.module.up(db);
  }

  const reminderColumns = await getColumns(db, "AppointmentReminders");
  for (const column of ["appointment_id", "user_id", "reminder_type", "scheduled_for", "sent_at"]) {
    assert.ok(reminderColumns.includes(column), `AppointmentReminders.${column} is required`);
  }

  const reminderIndexes = await getIndexes(db, "AppointmentReminders");
  assert.ok(reminderIndexes.some((index) => index.unique === 1), "appointment reminders must be unique per type");
});
