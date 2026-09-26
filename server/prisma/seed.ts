import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'demo@medminders.app' },
    create: { id: 'demo-patient', email: 'demo@medminders.app', role: 'patient' },
    update: {},
  });
  console.log('Seeded demo user: demo-patient');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
