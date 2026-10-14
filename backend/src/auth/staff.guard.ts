import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

const STAFF_ROLES = ['admin', 'superadmin'];

@Injectable()
export class StaffGuard extends JwtAuthGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);

    const request = context.switchToHttp().getRequest();
    if (!STAFF_ROLES.includes(request.user?.role)) {
      throw new ForbiddenException('Bu amal admin yoki superadmin uchun ruxsat etilgan.');
    }
    return true;
  }
}
