import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak." })
  @MaxLength(72)
  newPassword: string;

  /** Joriy sessiya saqlanib qolishi uchun — qolgan qurilmalardagi sessiyalar tugatiladi. */
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
