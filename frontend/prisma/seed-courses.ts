import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const titles = [
    "BASE",
    "INTERMEDIO 1",
    "INTERMEDIO 2",
    "SUPER AVANZATO",
    "COREOGRAFICO",
    "AGONISTI",
    "BAMBINI",
    "ADOLESCENTI",
  ];

  await prisma.courses.createMany({
    data: titles.map((title) => ({ title })),
    skipDuplicates: true,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

