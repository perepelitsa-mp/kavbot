import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  const phone = '79940122603';
  const password = 'tnghe7tm';
  const firstName = 'Admin';
  const lastName = 'User';

  console.log('Creating admin user...');

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { phone },
  });

  if (existing) {
    console.log('User already exists, updating to admin role...');
    const hashedPassword = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { phone },
      data: {
        password: hashedPassword,
        role: 'admin',
        firstName,
        lastName,
      },
    });

    console.log('✅ User updated successfully!');
    console.log(`   Phone: +${phone}`);
    console.log(`   Role: ${updated.role}`);
    console.log(`   Name: ${updated.firstName} ${updated.lastName}`);
  } else {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        phone,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'admin',
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   Phone: +${phone}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
  }
}

createAdmin()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
