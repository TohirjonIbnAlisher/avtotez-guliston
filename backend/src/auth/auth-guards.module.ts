import { Module } from '@nestjs/common';
import { JwtConfigModule } from './jwt-config.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SuperAdminGuard } from './superadmin.guard';
import { StaffGuard } from './staff.guard';

@Module({
  imports: [JwtConfigModule],
  providers: [JwtAuthGuard, SuperAdminGuard, StaffGuard],
  exports: [JwtAuthGuard, SuperAdminGuard, StaffGuard, JwtConfigModule],
})
export class AuthGuardsModule {}
