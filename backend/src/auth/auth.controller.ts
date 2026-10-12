import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard, JwtPayload } from './jwt-auth.guard';

const AVATAR_MIME_PATTERN = /^image\/(png|jpe?g|webp)$/;

type AuthedRequest = Request & { user: JwtPayload };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Headers('user-agent') userAgent?: string) {
    return this.authService.login(dto.phone, dto.password, userAgent);
  }

  // Yangi access token (va almashtirilgan refresh token) olish.
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto, @Headers('user-agent') userAgent?: string) {
    return this.authService.refresh(dto.refreshToken, userAgent);
  }

  // Sessiyani serverda bekor qilish — refresh token boshqa ishlamaydi.
  @Post('logout')
  @HttpCode(204)
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthedRequest) {
    return this.authService.me(request.user.sub);
  }

  // ---------- Profil (telefon raqamni o'zgartirib bo'lmaydi) ----------

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(@Req() request: AuthedRequest, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(request.user.sub, dto.fullName);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', 'public', 'avatars'),
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: 3 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!AVATAR_MIME_PATTERN.test(file.mimetype)) {
          callback(new BadRequestException('Faqat PNG, JPG yoki WEBP rasm yuklash mumkin.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadAvatar(@Req() request: AuthedRequest, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Fayl yuborilmadi.');
    }
    return this.authService.setAvatar(request.user.sub, `/media/avatars/${file.filename}`);
  }

  @Delete('me/avatar')
  @UseGuards(JwtAuthGuard)
  removeAvatar(@Req() request: AuthedRequest) {
    return this.authService.setAvatar(request.user.sub, null);
  }

  @Put('me/password')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() request: AuthedRequest, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(request.user.sub, dto.currentPassword, dto.newPassword, dto.refreshToken);
  }
}
