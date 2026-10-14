import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtConfigModule } from './jwt-config.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SuperAdminGuard } from './superadmin.guard';
import { StaffGuard } from './staff.guard';

@Module({
  // guard'lar @UseGuards orqali har bir modulning o'zida yaratiladi — ularning bog'liqliklari ham eksport qilinadi
  imports: [JwtConfigModule, TypeOrmModule.forFeature([RefreshToken])],
  providers: [JwtAuthGuard, SuperAdminGuard, StaffGuard],
  exports: [JwtAuthGuard, SuperAdminGuard, StaffGuard, JwtConfigModule, TypeOrmModule],
})
export class AuthGuardsModule {}
