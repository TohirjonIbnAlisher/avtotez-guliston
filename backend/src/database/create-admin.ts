import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { User, UserRole } from '../users/entities/user.entity';

const PHONE = process.env.ADMIN_PHONE || '+998956782402';
const FULL_NAME = process.env.ADMIN_FULL_NAME || 'Tohirjon';
const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';

function generatePassword(length = 14): string {
  return Array.from(randomBytes(length))
    .map((b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length])
    .join('');
}

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersRepo = app.get<Repository<User>>(getRepositoryToken(User));

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await usersRepo.findOne({ where: { phone: PHONE } });
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = UserRole.SUPERADMIN;
    existing.fullName = FULL_NAME;
    await usersRepo.save(existing);
  } else {
    await usersRepo.save(
      usersRepo.create({
        phone: PHONE,
        passwordHash,
        fullName: FULL_NAME,
        role: UserRole.SUPERADMIN,
      }),
    );
  }

  console.log('\n=== SUPERADMIN HISOBI ===');
  console.log('Telefon: ', PHONE);
  console.log('Parol:   ', password);
  console.log('=========================\n');

  await app.close();
}

run().catch((err) => {
  console.error('Superadmin yaratishda xato:', err);
  process.exit(1);
});
