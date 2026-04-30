import crypto from "crypto";
import { Knex } from "knex";
import knex from "../db/knex";
import logger from "./logger";

const DEFAULT_CALDAV_BASE_URL = "https://caldav.yandex.ru";

const getEncryptionKey = () =>
  crypto
    .createHash("sha256")
    .update(process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || "dev-calendar-secret")
    .digest();

const encrypt = (value: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
};

const decrypt = (value: string) => {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivRaw, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64")),
    decipher.final(),
  ]).toString("utf8");
};

const escapeIcs = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const formatIcsDate = (value: Date) =>
  value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

const buildAuthHeader = (username: string, password: string) =>
  `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

const getDefaultCalendarUrl = (username: string) => {
  const base = process.env.YANDEX_CALDAV_BASE_URL || DEFAULT_CALDAV_BASE_URL;
  return base;
};

const normalizeCalendarUrl = (calendarUrl: string) =>
  calendarUrl.endsWith("/") ? calendarUrl : `${calendarUrl}/`;

const resolveDavUrl = (baseUrl: string, href: string) => {
  if (/^https?:\/\//i.test(href)) return href;
  return new URL(href, normalizeCalendarUrl(baseUrl)).toString();
};

const extractFirstHref = (xml: string, propertyName: string) => {
  const propertyRegex = new RegExp(`<[^>]*:?${propertyName}[^>]*>([\\s\\S]*?)<\\/[^>]*:?${propertyName}>`, "i");
  const propertyMatch = xml.match(propertyRegex);
  const scope = propertyMatch?.[1] || xml;
  return scope.match(/<[^>]*:?href[^>]*>\s*([^<]+)\s*<\/[^>]*:?href>/i)?.[1];
};

const extractCalendarHrefs = (xml: string) => {
  const responses = xml.match(/<[^>]*:?response[\s\S]*?<\/[^>]*:?response>/gi) || [];
  return responses
    .filter((response) => /<[^>]*:?calendar[\s/>]/i.test(response))
    .map((response) => response.match(/<[^>]*:?href[^>]*>\s*([^<]+)\s*<\/[^>]*:?href>/i)?.[1])
    .filter((href): href is string => Boolean(href));
};

const limitLogText = (value: string, maxLength = 1000) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...<truncated>` : value;

class YandexCalDavRequestError extends Error {
  status: number;
  statusText: string;
  responseBody: string;

  constructor(status: number, statusText: string, responseBody: string) {
    super(`Yandex CalDAV request failed: ${status} ${responseBody}`);
    this.name = "YandexCalDavRequestError";
    this.status = status;
    this.statusText = statusText;
    this.responseBody = responseBody;
  }
}

const yandexCalDavPropfind = async (
  url: string,
  username: string,
  password: string,
  body: string,
  depth = "0"
) => {
  logger.debug("Yandex CalDAV PROPFIND request", { url, username, depth, bodyPreview: limitLogText(body) });

  const response = await fetch(url, {
    method: "PROPFIND",
    headers: {
      Authorization: buildAuthHeader(username, password),
      Depth: depth,
      "Content-Type": "application/xml; charset=utf-8",
    },
    body,
  });
  const responseBody = await response.text().catch(() => "");

  if (!response.ok && response.status !== 207) {
    logger.error("Yandex CalDAV PROPFIND failed", {
      url,
      username,
      depth,
      status: response.status,
      statusText: response.statusText,
      responseBody: limitLogText(responseBody),
    });
    throw new Error(`Yandex CalDAV discovery failed: ${response.status} ${responseBody}`);
  }

  logger.debug("Yandex CalDAV PROPFIND succeeded", {
    url,
    username,
    depth,
    status: response.status,
    responseBody: limitLogText(responseBody),
  });
  return responseBody;
};

const discoverCalendarUrl = async (baseUrl: string, username: string, password: string) => {
  const rootUrl = normalizeCalendarUrl(baseUrl);
  const principalXml = await yandexCalDavPropfind(
    rootUrl,
    username,
    password,
    `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:current-user-principal/>
  </d:prop>
</d:propfind>`
  );

  const principalHref = extractFirstHref(principalXml, "current-user-principal");
  if (!principalHref) {
    throw new Error("Yandex CalDAV discovery failed: current-user-principal not found");
  }

  const principalUrl = resolveDavUrl(rootUrl, principalHref);
  const homeSetXml = await yandexCalDavPropfind(
    principalUrl,
    username,
    password,
    `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <c:calendar-home-set/>
  </d:prop>
</d:propfind>`
  );

  const homeSetHref = extractFirstHref(homeSetXml, "calendar-home-set");
  if (!homeSetHref) {
    throw new Error("Yandex CalDAV discovery failed: calendar-home-set not found");
  }

  const homeSetUrl = resolveDavUrl(rootUrl, homeSetHref);
  const calendarsXml = await yandexCalDavPropfind(
    homeSetUrl,
    username,
    password,
    `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>`,
    "1"
  );

  const calendarHref = extractCalendarHrefs(calendarsXml)[0];
  if (!calendarHref) {
    throw new Error("Yandex CalDAV discovery failed: calendar collection not found");
  }

  return normalizeCalendarUrl(resolveDavUrl(rootUrl, calendarHref));
};

const getActiveConnection = async (employeeId: number) =>
  knex("YandexCalendarConnections")
    .where({ employee_id: employeeId, is_active: true })
    .orderBy("updated_at", "desc")
    .first();

const getActiveConnectionFromDb = async (db: Knex | Knex.Transaction, employeeId: number) =>
  db("YandexCalendarConnections")
    .where({ employee_id: employeeId, is_active: true })
    .orderBy("updated_at", "desc")
    .first();

export const upsertYandexCalendarConnection = async (data: {
  employeeId: number;
  username: string;
  appPassword: string;
  calendarUrl?: string;
}) => {
  const calendarUrl = data.calendarUrl
    ? normalizeCalendarUrl(data.calendarUrl)
    : await discoverCalendarUrl(getDefaultCalendarUrl(data.username), data.username, data.appPassword);
  const payload = {
    employee_id: data.employeeId,
    username: data.username,
    calendar_url: calendarUrl,
    app_password_encrypted: encrypt(data.appPassword),
    is_active: true,
    updated_at: new Date(),
  };

  const existing = await knex("YandexCalendarConnections")
    .where({ employee_id: data.employeeId, calendar_url: calendarUrl })
    .first();

  if (existing) {
    await knex("YandexCalendarConnections").where({ id: existing.id }).update(payload);
    return existing.id;
  }

  const [id] = await knex("YandexCalendarConnections").insert({
    ...payload,
    connected_at: new Date(),
  });
  return id;
};

const getAppointmentForCalendar = async (
  appointmentId: number,
  db: Knex | Knex.Transaction = knex
) =>
  db("Appointments as a")
    .join("Businesses as b", "a.business_id", "b.id")
    .join("Services as s", "a.service_id", "s.id")
    .join("ServiceVariants as sv", "a.service_variant_id", "sv.id")
    .join("EmployeeProfiles as ep", "a.employee_id", "ep.id")
    .join("Users as eu", "ep.user_id", "eu.id")
    .leftJoin("Branches as br", "a.branch_id", "br.id")
    .where("a.id", appointmentId)
    .select(
      "a.*",
      "b.name as business_name",
      "s.name as service_name",
      "sv.name as service_variant_name",
      "eu.name as employee_name",
      "br.address as branch_address"
    )
    .first();

const buildIcs = (appointment: any, uid: string) => {
  const description = [
    `Business: ${appointment.business_name}`,
    `Service: ${appointment.service_name}`,
    `Variant: ${appointment.service_variant_name}`,
    `Client: ${appointment.client_name}`,
    appointment.client_phone ? `Phone: ${appointment.client_phone}` : null,
    appointment.client_email ? `Email: ${appointment.client_email}` : null,
    appointment.comment ? `Comment: ${appointment.comment}` : null,
    `Appointment ID: ${appointment.id}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Record Manager//Yandex CalDAV//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(new Date(appointment.starts_at))}`,
    `DTEND:${formatIcsDate(new Date(appointment.ends_at))}`,
    `SUMMARY:${escapeIcs(`${appointment.service_name} - ${appointment.client_name}`)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    appointment.branch_address ? `LOCATION:${escapeIcs(appointment.branch_address)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ]
    .filter(Boolean)
    .join("\r\n");
};

const yandexCalDavRequest = async (
  connection: any,
  eventId: string,
  options: RequestInit
) => {
  const password = decrypt(connection.app_password_encrypted);
  const calendarUrl = normalizeCalendarUrl(connection.calendar_url);
  const method = options.method || "GET";
  const eventUrl = `${calendarUrl}${encodeURIComponent(eventId)}.ics`;
  const bodyPreview = typeof options.body === "string" ? limitLogText(options.body) : undefined;

  logger.debug("Yandex CalDAV request", {
    method,
    calendarUrl,
    eventUrl,
    eventId,
    username: connection.username,
    bodyPreview,
  });

  const response = await fetch(eventUrl, {
    ...options,
    headers: {
      Authorization: buildAuthHeader(connection.username, password),
      "Content-Type": "text/calendar; charset=utf-8",
      ...(options.headers || {}),
    },
  });

  if (!response.ok && response.status !== 204 && response.status !== 201) {
    const body = await response.text().catch(() => "");
    logger.error("Yandex CalDAV request failed", {
      method,
      calendarUrl,
      eventUrl,
      eventId,
      username: connection.username,
      status: response.status,
      statusText: response.statusText,
      responseBody: limitLogText(body),
      bodyPreview,
    });
    throw new YandexCalDavRequestError(response.status, response.statusText, body);
  }

  logger.debug("Yandex CalDAV request succeeded", {
    method,
    calendarUrl,
    eventUrl,
    eventId,
    status: response.status,
    statusText: response.statusText,
  });

  return response;
};

const refreshConnectionCalendarUrl = async (
  connection: any,
  db: Knex | Knex.Transaction = knex
) => {
  const password = decrypt(connection.app_password_encrypted);
  const discoveredCalendarUrl = await discoverCalendarUrl(
    process.env.YANDEX_CALDAV_BASE_URL || DEFAULT_CALDAV_BASE_URL,
    connection.username,
    password
  );

  if (discoveredCalendarUrl !== normalizeCalendarUrl(connection.calendar_url)) {
    await db("YandexCalendarConnections")
      .where({ id: connection.id })
      .update({ calendar_url: discoveredCalendarUrl, updated_at: new Date() });
  }

  logger.info("Yandex CalDAV calendar URL refreshed", {
    employeeId: connection.employee_id,
    username: connection.username,
    previousCalendarUrl: connection.calendar_url,
    discoveredCalendarUrl,
  });

  return {
    ...connection,
    calendar_url: discoveredCalendarUrl,
  };
};

const yandexCalDavRequestWithRediscovery = async (
  connection: any,
  eventId: string,
  options: RequestInit,
  db: Knex | Knex.Transaction = knex
) => {
  try {
    return await yandexCalDavRequest(connection, eventId, options);
  } catch (err) {
    if (!(err instanceof YandexCalDavRequestError) || err.status !== 409) {
      throw err;
    }

    logger.warn("Yandex CalDAV conflict, trying calendar URL rediscovery", {
      employeeId: connection.employee_id,
      username: connection.username,
      calendarUrl: connection.calendar_url,
      eventId,
    });

    const refreshedConnection = await refreshConnectionCalendarUrl(connection, db);
    return yandexCalDavRequest(refreshedConnection, eventId, options);
  }
};

const markCalendarSync = async (
  appointmentId: number,
  employeeId: number,
  data: {
    calendar_id?: string;
    external_event_id?: string | null;
    sync_status: "pending" | "synced" | "failed" | "deleted";
    last_sync_error?: string | null;
  },
  db: Knex | Knex.Transaction = knex
) => {
  const existing = await db("AppointmentCalendarEvents")
    .where({ appointment_id: appointmentId, employee_id: employeeId })
    .first();

  const payload = {
    calendar_id: data.calendar_id ?? existing?.calendar_id ?? "",
    external_event_id: data.external_event_id ?? existing?.external_event_id ?? null,
    sync_status: data.sync_status,
    last_sync_error: data.last_sync_error ?? null,
    synced_at: data.sync_status === "synced" || data.sync_status === "deleted" ? new Date() : null,
    updated_at: new Date(),
  };

  if (existing) {
    await db("AppointmentCalendarEvents").where({ id: existing.id }).update(payload);
  } else {
    await db("AppointmentCalendarEvents").insert({
      appointment_id: appointmentId,
      employee_id: employeeId,
      ...payload,
    });
  }
};

export class CalendarSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarSyncError";
  }
}

export const createAppointmentCalendarEventOrFail = async (
  appointmentId: number,
  db: Knex | Knex.Transaction = knex
) => {
  const appointment = await getAppointmentForCalendar(appointmentId, db);
  if (!appointment) throw new CalendarSyncError("Appointment not found");

  const connection = await getActiveConnectionFromDb(db, appointment.employee_id);
  if (!connection) {
    throw new CalendarSyncError("Employee has no active Yandex Calendar connection");
  }

  const eventId = `appointment-${appointment.id}-${crypto.randomUUID()}`;

  try {
    const requestConnection = await refreshConnectionCalendarUrl(connection, db);
    await yandexCalDavRequestWithRediscovery(
      requestConnection,
      eventId,
      {
        method: "PUT",
        body: buildIcs(appointment, eventId),
      },
      db
    );

    await markCalendarSync(
      appointment.id,
      appointment.employee_id,
      {
        calendar_id: requestConnection.calendar_url,
        external_event_id: eventId,
        sync_status: "synced",
      },
      db
    );

    return eventId;
  } catch (err) {
    logger.error("Failed to create Yandex Calendar event", { error: err, appointmentId });
    throw new CalendarSyncError((err as Error).message);
  }
};

export const createAppointmentCalendarEvent = async (appointmentId: number) => {
  const appointment = await getAppointmentForCalendar(appointmentId);
  if (!appointment) throw new Error("Appointment not found");

  const connection = await getActiveConnection(appointment.employee_id);
  if (!connection) {
    await markCalendarSync(appointment.id, appointment.employee_id, {
      sync_status: "failed",
      last_sync_error: "Employee has no active Yandex Calendar connection",
    });
    return null;
  }

  const eventId = `appointment-${appointment.id}-${crypto.randomUUID()}`;

  try {
    const requestConnection = await refreshConnectionCalendarUrl(connection);
    await yandexCalDavRequestWithRediscovery(requestConnection, eventId, {
      method: "PUT",
      body: buildIcs(appointment, eventId),
    });

    await markCalendarSync(appointment.id, appointment.employee_id, {
      calendar_id: requestConnection.calendar_url,
      external_event_id: eventId,
      sync_status: "synced",
    });

    return eventId;
  } catch (err) {
    await markCalendarSync(appointment.id, appointment.employee_id, {
      calendar_id: connection.calendar_url,
      sync_status: "failed",
      last_sync_error: (err as Error).message,
    });
    logger.error("Failed to create Yandex Calendar event", { error: err, appointmentId });
    return null;
  }
};

export const updateAppointmentCalendarEvent = async (appointmentId: number) => {
  const appointment = await getAppointmentForCalendar(appointmentId);
  if (!appointment) throw new Error("Appointment not found");

  const calendarEvent = await knex("AppointmentCalendarEvents")
    .where({ appointment_id: appointment.id, employee_id: appointment.employee_id })
    .first();

  if (!calendarEvent?.external_event_id) {
    return createAppointmentCalendarEvent(appointmentId);
  }

  const connection = await getActiveConnection(appointment.employee_id);
  if (!connection) {
    await markCalendarSync(appointment.id, appointment.employee_id, {
      sync_status: "failed",
      last_sync_error: "Employee has no active Yandex Calendar connection",
    });
    return null;
  }

  try {
    const requestConnection = await refreshConnectionCalendarUrl(connection);
    await yandexCalDavRequestWithRediscovery(requestConnection, calendarEvent.external_event_id, {
      method: "PUT",
      body: buildIcs(appointment, calendarEvent.external_event_id),
    });

    await markCalendarSync(appointment.id, appointment.employee_id, {
      calendar_id: requestConnection.calendar_url,
      external_event_id: calendarEvent.external_event_id,
      sync_status: "synced",
    });

    return calendarEvent.external_event_id;
  } catch (err) {
    await markCalendarSync(appointment.id, appointment.employee_id, {
      calendar_id: connection.calendar_url,
      external_event_id: calendarEvent.external_event_id,
      sync_status: "failed",
      last_sync_error: (err as Error).message,
    });
    logger.error("Failed to update Yandex Calendar event", { error: err, appointmentId });
    return null;
  }
};

export const deleteAppointmentCalendarEvent = async (appointmentId: number) => {
  const appointment = await knex("Appointments").where({ id: appointmentId }).first();
  if (!appointment) throw new Error("Appointment not found");

  const calendarEvent = await knex("AppointmentCalendarEvents")
    .where({ appointment_id: appointment.id, employee_id: appointment.employee_id })
    .first();

  if (!calendarEvent?.external_event_id) {
    await markCalendarSync(appointment.id, appointment.employee_id, { sync_status: "deleted" });
    return null;
  }

  const connection = await getActiveConnection(appointment.employee_id);
  if (!connection) {
    await markCalendarSync(appointment.id, appointment.employee_id, {
      sync_status: "failed",
      last_sync_error: "Employee has no active Yandex Calendar connection",
    });
    return null;
  }

  try {
    const requestConnection = await refreshConnectionCalendarUrl(connection);
    await yandexCalDavRequestWithRediscovery(requestConnection, calendarEvent.external_event_id, {
      method: "DELETE",
    });

    await markCalendarSync(appointment.id, appointment.employee_id, {
      calendar_id: requestConnection.calendar_url,
      external_event_id: calendarEvent.external_event_id,
      sync_status: "deleted",
    });
    return true;
  } catch (err) {
    await markCalendarSync(appointment.id, appointment.employee_id, {
      calendar_id: connection.calendar_url,
      external_event_id: calendarEvent.external_event_id,
      sync_status: "failed",
      last_sync_error: (err as Error).message,
    });
    logger.error("Failed to delete Yandex Calendar event", { error: err, appointmentId });
    return null;
  }
};
