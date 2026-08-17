import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

export interface PublicUser {
  id: string;
  phone: string;
  fullName: string | null;
  role: User['role'];
}

export interface LoginResult {
  accessToken: string;
  user: PublicUser;
}

function toPublicUser(user: User): PublicUser {
  return { id: user.id, phone: user.phone, fullName: user.fullName, role: user.role };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(phone: string, password: string): Promise<LoginResult> {
    const user = await this.usersService.findByPhone(phone);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException("Telefon raqam yoki parol noto'g'ri.");
    }

    const accessToken = this.jwtService.sign({ sub: user.id, role: user.role });
    return { accessToken, user: toPublicUser(user) };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return toPublicUser(user);
  }
}
