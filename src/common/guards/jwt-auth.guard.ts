import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../decorators/current-user.decorator';
import { VenueMember } from '../../modules/users/entities/venue-member.entity';
import { Role } from '../enums';

/**
 * Combined Auth + Tenant guard.
 *
 * 1. Validates JWT (via passport).
 * 2. If URL contains :venueId, ensures the user actually belongs to that venue
 *    (either via JWT venue_id match, or active VenueMember row).
 *
 * SUPER_ADMIN bypasses the venue check.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    @InjectRepository(VenueMember)
    private readonly memberRepo: Repository<VenueMember>,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1) JWT validation — populates request.user
    const ok = (await super.canActivate(context)) as boolean;
    if (!ok) return false;

    // 2) Venue access check (only for tenant-scoped routes)
    const request = context.switchToHttp().getRequest();
    const venueId: string | undefined =
      request.params?.venueId || request.params?.venue_id;
    if (!venueId) return true;

    const user = request.user as JwtPayload;
    if (!user) {
      throw new ForbiddenException('Autentifikatsiya talab qilinadi');
    }

    // Super-admin can access any venue
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    // Fast-path: JWT-encoded venue matches URL venue
    if (user.venue_id && user.venue_id === venueId) {
      return true;
    }

    // Slow-path: user may belong to multiple venues — check membership table
    const member = await this.memberRepo.findOne({
      where: { userId: user.sub, venueId, isActive: true },
    });

    if (!member) {
      throw new ForbiddenException(
        "Bu to'yxonaga kirish huquqingiz yo'q",
      );
    }

    // Attach effective venue role for RolesGuard
    user.venue_role = member.role;
    user.venue_id = venueId;
    return true;
  }
}
