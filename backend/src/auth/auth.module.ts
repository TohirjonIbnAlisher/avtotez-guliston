import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtConfigModule } from './jwt-config.module';
import { AuthGuardsModule } from './auth-guards.module';

@Module({
  imports: [UsersModule, JwtConfigModule, AuthGuardsModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthGuardsModule],
})
export class AuthModule {}
