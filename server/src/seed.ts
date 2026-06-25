import "dotenv/config";
import prisma from "./config/prisma.js";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  const khalilPin = await bcrypt.hash("230497", 10);
  const adminPin = await bcrypt.hash("000000", 10);

  // Create superadmin
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      firstName: "Super",
      lastName: "Admin",
      username: "admin",
      pin: adminPin,
      role: "SUPERADMIN",
    },
  });

  // Create seller (Khalil)
  await prisma.user.upsert({
    where: { username: "khalil" },
    update: { pin: khalilPin },
    create: {
      firstName: "Khalil",
      lastName: "Duty Free",
      username: "khalil",
      pin: khalilPin,
      role: "SELLER",
    },
  });

  console.log("Seed complete!");
  console.log(`SuperAdmin: admin (pin: 000000)`);
  console.log(`Seller: khalil (pin: 230497)`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
