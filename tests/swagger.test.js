require("ts-node/register");

const assert = require("node:assert/strict");
const test = require("node:test");
const { swaggerSpec } = require("../src/swagger");

test("swagger documents the current business booking API", () => {
  assert.equal(swaggerSpec.openapi, "3.0.0");
  assert.equal(swaggerSpec.info.title, "Record Manager API");
  assert.equal(swaggerSpec.servers[0].url, "/api");

  for (const path of [
    "/businesses",
    "/branches",
    "/services",
    "/services/variants",
    "/admin/users",
    "/employees",
    "/schedule-slots",
    "/appointments/available-employees",
    "/appointments/available-times",
    "/appointments",
    "/calendar/yandex/connect",
  ]) {
    assert.ok(swaggerSpec.paths[path], `${path} must be documented`);
  }
});

test("swagger does not expose removed medical/district API names", () => {
  const serialized = JSON.stringify(swaggerSpec).toLowerCase();

  for (const removedName of [
    "district",
    "\"/dir",
    "session",
    "workinghours",
    "employeedetails",
    "queueqrtokens",
    "google calendar",
  ]) {
    assert.equal(serialized.includes(removedName), false, `${removedName} should not be documented`);
  }
});

test("swagger describes service duration and appointment booking payload", () => {
  const serviceVariant = swaggerSpec.components.schemas.ServiceVariant.properties;
  assert.equal(serviceVariant.duration_minutes.type, "integer");
  assert.equal(serviceVariant.price.type, "number");

  const appointmentRequest =
    swaggerSpec.paths["/appointments"].post.requestBody.content["application/json"].schema;
  assert.deepEqual(appointmentRequest.required, [
    "service_variant_id",
    "employee_id",
    "starts_at",
  ]);
  assert.equal(appointmentRequest.properties.schedule_slot_id, undefined);
});

test("swagger requires only employeeId for Yandex Calendar connection", () => {
  const calendarRequest =
    swaggerSpec.paths["/calendar/yandex/connect"].post.requestBody.content["application/json"].schema;

  assert.deepEqual(calendarRequest.required, ["employeeId", "username", "app_password"]);
  assert.ok(calendarRequest.properties.employeeId);
  assert.equal(calendarRequest.properties.employee_id, undefined);
  assert.equal(calendarRequest.properties.user_id, undefined);
});
