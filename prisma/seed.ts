import bcrypt from 'bcrypt';

import prisma from '@/lib/prisma';

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.appUser.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'admin',
      isActive: true,
      displayName: 'Administrator',
    },
    create: {
      email,
      passwordHash,
      role: 'admin',
      isActive: true,
      displayName: 'Administrator',
    },
  });

  console.log(`Seeded admin user: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
