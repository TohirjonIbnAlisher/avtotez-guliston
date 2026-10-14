import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class SuperAdminGuard extends JwtAuthGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);

    const request = context.switchToHttp().getRequest();
    if (request.user?.role !== 'superadmin') {
      throw new ForbiddenException('Bu amal faqat superadmin uchun ruxsat etilgan.');
    }
    return true;
  }
}
