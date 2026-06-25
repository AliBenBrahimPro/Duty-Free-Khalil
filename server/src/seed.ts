import "dotenv/config";
import prisma from "./config/prisma";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  const khalilPin = await bcrypt.hash("041997", 10);
  const buyerPin = await bcrypt.hash("123456", 10);
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
  const khalil = await prisma.user.upsert({
    where: { username: "khalil" },
    update: {},
    create: {
      firstName: "Khalil",
      lastName: "Duty Free",
      username: "khalil",
      pin: khalilPin,
      role: "SELLER",
    },
  });

  // Create a sample buyer
  const ahmed = await prisma.user.upsert({
    where: { username: "ahmed" },
    update: {},
    create: {
      firstName: "Ahmed",
      lastName: "Ben Ali",
      username: "ahmed",
      pin: buyerPin,
      role: "BUYER",
    },
  });

  // Create a sample request
  await prisma.request.create({
    data: {
      productName: "Dior Sauvage 100ml",
      description: "Looking for the EDT version",
      buyerId: ahmed.id,
      sellerId: khalil.id,
      deadline: new Date("2026-07-08T23:59:59.000Z"),
    },
  });

  console.log("Seed complete!");
  console.log(`SuperAdmin: admin (pin: 000000)`);
  console.log(`Seller: khalil (pin: 041997)`);
  console.log(`Buyer: ahmed (pin: 123456)`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
