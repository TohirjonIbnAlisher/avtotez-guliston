import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface PublicUser {
  id: string;
  phone: string;
  fullName: string | null;
  role: User['role'];
  createdAt: Date;
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { phone } });
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
    if (dto.role !== undefined) {
      user.role = dto.role;
    }
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    return toPublicUser(await this.usersRepository.save(user));
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
