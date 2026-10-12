import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface PublicUser {
  id: string;
  phone: string;
  fullName: string | null;
  role: User['role'];
  avatarUrl: string | null;
  createdAt: Date;
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone } });
  }

  save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<PublicUser[]> {
    const users = await this.usersRepository.find({ order: { createdAt: 'ASC' } });
    return users.map(toPublicUser);
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const existing = await this.findByPhone(dto.phone);
    if (existing) {
      throw new ConflictException("Bu telefon raqam bilan foydalanuvchi allaqachon mavjud.");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.usersRepository.create({
      phone: dto.phone,
      passwordHash,
      fullName: dto.fullName ?? null,
      role: dto.role,
    });
    return toPublicUser(await this.usersRepository.save(user));
  }

  async update(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    const user = await this.getEntityOrThrow(id);

    if (dto.phone && dto.phone !== user.phone) {
      const existing = await this.findByPhone(dto.phone);
      if (existing) {
        throw new ConflictException("Bu telefon raqam bilan foydalanuvchi allaqachon mavjud.");
      }
      user.phone = dto.phone;
    }
    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName;
    }
    const roleChanged = dto.role !== undefined && dto.role !== user.role;
    if (dto.role !== undefined) {
      user.role = dto.role;
    }
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    const saved = await this.usersRepository.save(user);
    if (dto.password || roleChanged) {
      // Parol yoki rol o'zgarsa — barcha qurilmalardagi sessiyalar tugatiladi (qayta login kerak).
      await this.dataSource.query(
        `UPDATE "refresh_tokens" SET "revoked_at" = now() WHERE "user_id" = $1 AND "revoked_at" IS NULL`,
        [user.id],
      );
    }
    return toPublicUser(saved);
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Foydalanuvchi topilmadi: ${id}`);
    }
  }

  private async getEntityOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Foydalanuvchi topilmadi: ${id}`);
    }
    return user;
  }
}
