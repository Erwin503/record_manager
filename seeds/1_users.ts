import { Knex } from "knex";
import bcrypt from "bcryptjs";
import logger from "../src/utils/logger";

export async function seed(knex: Knex): Promise<void> {
  const users = [
    {
      name: "Super Admin",
      email: "superadmin@example.com",
      password: "ChangeMe123!",
      phone: "+7 (777) 777-77-77",
      role: "super_admin",
    },
    {
      name: "Business Admin",
      email: "owner@example.com",
      password: "OwnerPass1!",
      phone: "+7 (700) 111-11-11",
      role: "business_admin",
    },
    {
      name: "Alex Tire Master",
      email: "tire.master@example.com",
      password: "EmployeePass1!",
      phone: "+7 (900) 111-22-33",
      role: "employee",
    },
    {
      name: "Maria Beauty Master",
      email: "beauty.master@example.com",
      password: "EmployeePass2!",
      phone: "+7 (900) 222-33-44",
      role: "employee",
    },
    {
      name: "Client One",
      email: "client1@example.com",
      password: "ClientPass1!",
      phone: "+7 (910) 111-22-33",
      role: "client",
    },
    {
      name: "Client Two",
      email: "client2@example.com",
      password: "ClientPass2!",
      phone: "+7 (910) 222-33-44",
      role: "client",
    },
  ];

  for (const user of users) {
    const exists = await knex("Users").where({ email: user.email }).first();
    if (!exists) {
      await knex("Users").insert({
        name: user.name,
        email: user.email,
        password_hash: bcrypt.hashSync(user.password, 10),
        phone: user.phone,
        role: user.role,
      });
      logger.info(`Seeded user: ${user.email}`);
    }
  }
}
