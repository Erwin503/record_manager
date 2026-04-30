require("ts-node/register");

const assert = require("node:assert/strict");
const test = require("node:test");
const { __testBuildIcs } = require("../src/utils/yandexCalendarService");

const baseAppointment = {
  id: 42,
  status: "confirmed",
  business_name: "PitStop",
  service_name: "Tire change",
  service_variant_name: "R16-R18",
  client_name: "Ivan",
  client_phone: "+79990000000",
  client_email: "client@example.com",
  comment: "No delay",
  starts_at: "2026-05-01T10:00:00.000Z",
  ends_at: "2026-05-01T10:45:00.000Z",
  branch_address: "Moscow, Avtozavodskaya 10",
};

test("calendar event includes appointment status", () => {
  const ics = __testBuildIcs(baseAppointment, "appointment-42");

  assert.match(ics, /STATUS:CONFIRMED/);
  assert.match(ics, /SUMMARY:\[Подтверждена\] Tire change - Ivan/);
  assert.match(ics, /DESCRIPTION:Status: Подтверждена/);
});
