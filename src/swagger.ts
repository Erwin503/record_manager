export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Record Manager API",
    version: "1.0.0",
    description: "API for client appointments in service businesses.",
  },
  servers: [{ url: "/api", description: "Current API server" }],
  tags: [
    { name: "Auth" },
    { name: "Businesses" },
    { name: "Branches" },
    { name: "Services" },
    { name: "Employees" },
    { name: "Schedule Slots" },
    { name: "Appointments" },
    { name: "Calendar" },
    { name: "Notifications" },
    { name: "Stats" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          role: {
            type: "string",
            enum: ["super_admin", "business_admin", "employee", "client"],
          },
        },
      },
      Business: {
        type: "object",
        properties: {
          id: { type: "integer" },
          owner_id: { type: "integer" },
          name: { type: "string" },
          description: { type: "string" },
          business_type: {
            type: "string",
            enum: ["tire_service", "beauty_salon", "barbershop", "spa", "repair_service", "other"],
          },
          phone: { type: "string" },
          email: { type: "string" },
          website: { type: "string" },
          status: { type: "string", enum: ["active", "inactive", "suspended"] },
        },
      },
      Branch: {
        type: "object",
        properties: {
          id: { type: "integer" },
          business_id: { type: "integer" },
          name: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          timezone: { type: "string" },
          is_main: { type: "boolean" },
        },
      },
      Service: {
        type: "object",
        properties: {
          id: { type: "integer" },
          business_id: { type: "integer" },
          category_id: { type: "integer", nullable: true },
          name: { type: "string" },
          description: { type: "string" },
          is_active: { type: "boolean" },
        },
      },
      ServiceVariant: {
        type: "object",
        properties: {
          id: { type: "integer" },
          service_id: { type: "integer" },
          name: { type: "string" },
          duration_minutes: { type: "integer" },
          price: { type: "number" },
          currency: { type: "string" },
          rebook_reminder_days: { type: "integer", nullable: true },
          is_active: { type: "boolean" },
        },
      },
      EmployeeProfile: {
        type: "object",
        properties: {
          id: { type: "integer" },
          user_id: { type: "integer" },
          business_id: { type: "integer" },
          branch_id: { type: "integer", nullable: true },
          position: { type: "string" },
          bio: { type: "string" },
          is_active: { type: "boolean" },
        },
      },
      ScheduleSlot: {
        type: "object",
        properties: {
          id: { type: "integer" },
          employee_id: { type: "integer" },
          branch_id: { type: "integer", nullable: true },
          starts_at: { type: "string", format: "date-time" },
          ends_at: { type: "string", format: "date-time" },
          status: { type: "string", enum: ["available", "blocked"] },
          source: { type: "string", enum: ["manual", "generated"] },
        },
      },
      Appointment: {
        type: "object",
        properties: {
          id: { type: "integer" },
          business_id: { type: "integer" },
          branch_id: { type: "integer", nullable: true },
          service_id: { type: "integer" },
          service_variant_id: { type: "integer" },
          employee_id: { type: "integer" },
          client_id: { type: "integer", nullable: true },
          starts_at: { type: "string", format: "date-time" },
          ends_at: { type: "string", format: "date-time" },
          status: {
            type: "string",
            enum: ["pending", "confirmed", "in_progress", "completed", "canceled", "no_show"],
          },
          price_snapshot: { type: "number" },
          duration_snapshot_minutes: { type: "integer" },
          client_name: { type: "string" },
          client_phone: { type: "string" },
          client_email: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/users": {
      post: {
        tags: ["Auth"],
        summary: "Register client",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                  phone: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Registered" } },
      },
    },
    "/users/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "JWT token" } },
      },
    },
    "/users/profile": {
      get: {
        tags: ["Auth"],
        summary: "Get current profile",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Current user", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } } },
      },
      put: {
        tags: ["Auth"],
        summary: "Update current profile",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Auth"],
        summary: "Delete current profile",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Deleted" } },
      },
    },
    "/admin/users": {
      get: {
        tags: ["Auth"],
        summary: "List users for admin",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, default: 10 } },
          {
            name: "role",
            in: "query",
            schema: {
              type: "string",
              enum: ["client", "employee", "business_admin", "super_admin"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Users with pagination metadata",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    users: { type: "array", items: { $ref: "#/components/schemas/User" } },
                    meta: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        page: { type: "integer" },
                        limit: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "403": { description: "Access denied" },
        },
      },
    },
    "/businesses": {
      get: {
        tags: ["Businesses"],
        summary: "List businesses",
        responses: { "200": { description: "Businesses", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Business" } } } } } },
      },
      post: {
        tags: ["Businesses"],
        summary: "Create business",
        security: [{ bearerAuth: [] }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Business" } } } },
        responses: {
          "201": { description: "Created" },
          "429": { description: "Daily appointment limit reached for this employee" },
          "502": { description: "Appointment was not created because calendar sync failed" },
        },
      },
    },
    "/businesses/{id}": {
      get: {
        tags: ["Businesses"],
        summary: "Get business by id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Business" } },
      },
      put: {
        tags: ["Businesses"],
        summary: "Update business",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Businesses"],
        summary: "Delete business",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "204": { description: "Deleted" } },
      },
    },
    "/branches": {
      get: {
        tags: ["Branches"],
        summary: "List branches",
        parameters: [{ name: "business_id", in: "query", schema: { type: "integer" } }],
        responses: { "200": { description: "Branches" } },
      },
      post: {
        tags: ["Branches"],
        summary: "Create branch",
        security: [{ bearerAuth: [] }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Branch" } } } },
        responses: { "201": { description: "Created" } },
      },
    },
    "/services": {
      get: {
        tags: ["Services"],
        summary: "List services",
        parameters: [
          { name: "business_id", in: "query", schema: { type: "integer" } },
          { name: "category_id", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Services" } },
      },
      post: {
        tags: ["Services"],
        summary: "Create service",
        security: [{ bearerAuth: [] }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Service" } } } },
        responses: { "201": { description: "Created" } },
      },
    },
    "/services/categories": {
      get: {
        tags: ["Services"],
        summary: "List service categories",
        parameters: [{ name: "business_id", in: "query", schema: { type: "integer" } }],
        responses: { "200": { description: "Categories" } },
      },
      post: {
        tags: ["Services"],
        summary: "Create service category",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/services/variants": {
      get: {
        tags: ["Services"],
        summary: "List service variants",
        parameters: [{ name: "service_id", in: "query", schema: { type: "integer" } }],
        responses: { "200": { description: "Variants" } },
      },
      post: {
        tags: ["Services"],
        summary: "Create service variant",
        security: [{ bearerAuth: [] }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/ServiceVariant" } } } },
        responses: { "201": { description: "Created" } },
      },
    },
    "/employees": {
      get: {
        tags: ["Employees"],
        summary: "List employees",
        parameters: [
          { name: "business_id", in: "query", schema: { type: "integer" } },
          { name: "branch_id", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Employees" } },
      },
      post: {
        tags: ["Employees"],
        summary: "Create employee profile",
        security: [{ bearerAuth: [] }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/EmployeeProfile" } } } },
        responses: {
          "201": { description: "Created" },
          "409": { description: "Employee profile already exists for this user" },
        },
      },
    },
    "/schedule-slots": {
      get: {
        tags: ["Schedule Slots"],
        summary: "List schedule slots",
        parameters: [
          { name: "employee_id", in: "query", schema: { type: "integer" } },
          { name: "branch_id", in: "query", schema: { type: "integer" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Schedule slots" } },
      },
      post: {
        tags: ["Schedule Slots"],
        summary: "Create schedule slot",
        security: [{ bearerAuth: [] }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/ScheduleSlot" } } } },
        responses: { "201": { description: "Created" } },
      },
    },
    "/appointments/available-employees": {
      get: {
        tags: ["Appointments"],
        summary: "Get employees who can perform selected service variant",
        parameters: [
          { name: "business_id", in: "query", required: true, schema: { type: "integer" } },
          { name: "service_variant_id", in: "query", required: true, schema: { type: "integer" } },
          { name: "branch_id", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Available employees" } },
      },
    },
    "/appointments/available-times": {
      get: {
        tags: ["Appointments"],
        summary: "Get available appointment times",
        parameters: [
          { name: "service_variant_id", in: "query", required: true, schema: { type: "integer" } },
          { name: "business_id", in: "query", schema: { type: "integer" } },
          { name: "branch_id", in: "query", schema: { type: "integer" } },
          { name: "employee_id", in: "query", schema: { type: "integer" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: { "200": { description: "Available times" } },
      },
    },
    "/appointments": {
      get: {
        tags: ["Appointments"],
        summary: "List appointments",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Appointments" } },
      },
      post: {
        tags: ["Appointments"],
        summary: "Create appointment",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["service_variant_id", "employee_id", "starts_at"],
                properties: {
                  service_variant_id: { type: "integer" },
                  employee_id: { type: "integer" },
                  branch_id: { type: "integer", nullable: true },
                  starts_at: { type: "string", format: "date-time" },
                  client_name: { type: "string" },
                  client_phone: { type: "string" },
                  client_email: { type: "string" },
                  comment: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/appointments/{id}/status": {
      patch: {
        tags: ["Appointments"],
        summary: "Change appointment status",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["pending", "confirmed", "in_progress", "completed", "canceled", "no_show"] },
                  cancel_reason: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated" },
          "400": { description: "Invalid status change or cancellation less than 24 hours before start time" },
        },
      },
    },
    "/calendar/yandex/connect": {
      post: {
        tags: ["Calendar"],
        summary: "Connect Yandex Calendar via CalDAV",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["employeeId", "username", "app_password"],
                properties: {
                  employeeId: {
                    type: "integer",
                    description: "EmployeeProfiles.id.",
                  },
                  username: { type: "string" },
                  app_password: { type: "string" },
                  calendar_url: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Connected" } },
      },
    },
    "/notification": {
      get: {
        tags: ["Notifications"],
        summary: "List current user notifications",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Notifications" } },
      },
    },
    "/stats/services": {
      get: {
        tags: ["Stats"],
        summary: "Completed appointments by service",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Stats" } },
      },
    },
  },
};
