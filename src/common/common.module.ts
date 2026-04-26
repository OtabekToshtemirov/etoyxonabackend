import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { VenueMember } from '../modules/users/entities/venue-member.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * Global module that provides shared guards (JwtAuthGuard, RolesGuard) and
 * the repositories they depend on. Marked @Global so any controller using
 * @UseGuards(JwtAuthGuard) doesn't need to import VenueMember manually.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([VenueMember]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  providers: [JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard, TypeOrmModule, PassportModule],
})
export class CommonModule {}
