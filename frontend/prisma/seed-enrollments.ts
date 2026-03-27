import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.users.findMany({
    select: { id: true },
  });

  const courses = await prisma.courses.findMany({
    select: { id: true },
  });

  if (!users.length || !courses.length) {
    console.log("Nessun utente o corso trovato, nessuna iscrizione creata.");
    return;
  }

  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);

  const pairs = new Set<string>();
  const data: { course_id: bigint; user_id: bigint; start_date: Date }[] = [];

  for (const user of users) {
    // ogni utente tra 1 e 3 corsi, se disponibili
    const maxCourses = Math.min(3, courses.length);
    const minCourses = 1;
    const count =
      Math.floor(Math.random() * (maxCourses - minCourses + 1)) + minCourses;

    const shuffled = [...courses].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    for (const course of selected) {
      const key = `${user.id}-${course.id}`;
      if (pairs.has(key)) continue;
      pairs.add(key);

      data.push({
        course_id: course.id,
        user_id: user.id,
        start_date: startDate,
      });
    }
  }

  if (!data.length) {
    console.log("Nessuna coppia corso/utente da inserire.");
    return;
  }

  await prisma.course_enrollments.createMany({
    data,
    skipDuplicates: true,
  });

  console.log(`Create ${data.length} iscrizioni corso/utente.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

