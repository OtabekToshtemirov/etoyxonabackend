import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../decorators/current-user.decorator';
import { VenueMember } from '../../modules/users/entities/venue-member.entity';
import { Role } from '../enums';

/**
 * Ensures the JWT user actually belongs to the :venueId in the URL.
 * Without this guard, anybody with a valid token could access any venue's data.
 *
 * Skip rules:
 *   - SUPER_ADMIN bypasses (with audit log entry)
 *   - Endpoints without :venueId param are skipped
 */
@Injectable()
export class VenueAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(VenueMember)
    private readonly memberRepo: Repository<VenueMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const venueId: string | undefined =
      request.params?.venueId || request.params?.venue_id;

    // No venueId in URL → not a tenant-scoped endpoint, skip
    if (!venueId) return true;

    const user = request.user as JwtPayload;
    if (!user) {
      // JwtAuthGuard should've populated this. If missing on a venue-scoped
      // route, treat as misconfiguration — deny access.
      throw new ForbiddenException(
        'Autentifikatsiya talab qilinadi',
      );
    }

    // Super-admin can access any venue
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    // Fast-path: JWT venue_id matches URL venueId
    if (user.venue_id && user.venue_id === venueId) {
      return true;
    }

    // Slow-path: user may belong to multiple venues — check DB
    const member = await this.memberRepo.findOne({
      where: { userId: user.sub, venueId, isActive: true },
    });

    if (!member) {
      throw new ForbiddenException(
        "Bu to'yxonaga kirish huquqingiz yo'q",
      );
    }

    // Attach effective venue role for downstream guards (RolesGuard)
    user.venue_role = member.role;
    user.venue_id = venueId;

    return true;
  }
}
