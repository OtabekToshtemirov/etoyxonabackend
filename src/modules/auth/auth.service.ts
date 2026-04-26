import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { VenueMember } from '../users/entities/venue-member.entity';
import { LoginDto, RegisterDto, SelectVenueDto, ChangePasswordDto, SendOtpDto, VerifyOtpDto, ResetPasswordDto } from './dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { SmsService } from '../sms/sms.service';
import { normalizePhone } from '../../common/utils/phone.util';

@Injectable()
export class AuthService {
  // In-memory OTP store: phone -> { code, expiresAt, lastSentAt, attempts }
  // ⚠️ Production: replace with Redis for multi-instance + persistence.
  private otpStore = new Map<
    string,
    { code: string; expiresAt: Date; lastSentAt: Date; attempts: number }
  >();

  // Periodic cleanup of expired entries to prevent memory leak
  private cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [phone, entry] of this.otpStore.entries()) {
      // remove if expired more than 1 hour ago
      if (entry.expiresAt.getTime() + 60 * 60 * 1000 < now) {
        this.otpStore.delete(phone);
      }
    }
  }, 10 * 60 * 1000);

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
  }

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(VenueMember)
    private readonly venueMemberRepo: Repository<VenueMember>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * Login with auto-tenant detection
   * Returns different responses based on number of venues:
   * - 0 venues: tokens with no venue, type='no_venue'
   * - 1 venue: auto-select venue, type='single_venue'
   * - 2+ venues: venue list to choose from, type='multiple_venues'
   */
  async login(dto: LoginDto) {
    // 1. Find user by phone (normalized)
    const phone = normalizePhone(dto.phone);
    const user = await this.userRepo.findOne({
      where: { phone, status: 'active' },
    });

    if (!user) {
      throw new UnauthorizedException('Telefon raqam yoki parol noto\'g\'ri');
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Telefon raqam yoki parol noto\'g\'ri');
    }

    // 3. Find user's venues
    const venueMembers = await this.venueMemberRepo.find({
      where: { userId: user.id, isActive: true },
      relations: ['venue'],
    });

    // 4. Update last login
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    // 5. Handle based on number of venues
    if (venueMembers.length === 0) {
      // No venues — return tokens without venue
      const tokens = await this.generateTokens({
        sub: user.id,
        phone: user.phone,
        role: user.role,
      });

      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        type: 'no_venue',
        user: this.sanitizeUser(user),
        venues: [],
        ...tokens,
      };
    }

    if (venueMembers.length === 1) {
      // Single venue — auto-select
      const member = venueMembers[0];
      const tokens = await this.generateTokens({
        sub: user.id,
        phone: user.phone,
        role: user.role,
        venue_id: member.venueId,
        venue_role: member.role,
      });

      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        type: 'single_venue',
        user: this.sanitizeUser(user),
        currentVenue: {
          id: member.venue.id,
          name: member.venue.name,
          role: member.role,
        },
        ...tokens,
      };
    }

    // Multiple venues — return list for selection
    const tempToken = this.jwtService.sign(
      { sub: user.id, phone: user.phone, role: user.role, temp: true },
      { expiresIn: '10m' },
    );

    return {
      type: 'multiple_venues',
      user: this.sanitizeUser(user),
      venues: venueMembers.map((vm) => ({
        id: vm.venue.id,
        name: vm.venue.name,
        role: vm.role,
        position: vm.position,
      })),
      tempToken,
    };
  }

  /**
   * Register a new user
   */
  async register(dto: RegisterDto) {
    const phone = normalizePhone(dto.phone);
    // Check if phone already exists
    const existingUser = await this.userRepo.findOne({
      where: { phone },
    });

    if (existingUser) {
      throw new ConflictException('Bu telefon raqam allaqachon ro\'yxatdan o\'tgan');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = this.userRepo.create({
      phone,
      passwordHash,
      fullName: dto.fullName,
      email: dto.email,
      role: 'client',
      status: 'active',
    });

    const savedUser = await this.userRepo.save(user);

    // Generate tokens (no venue yet)
    const tokens = await this.generateTokens({
      sub: savedUser.id,
      phone: savedUser.phone,
      role: savedUser.role,
    });

    await this.updateRefreshToken(savedUser.id, tokens.refreshToken);

    return {
      type: 'no_venue',
      user: this.sanitizeUser(savedUser),
      ...tokens,
    };
  }

  /**
   * Select venue after login (for users with multiple venues)
   */
  async selectVenue(userId: string, dto: SelectVenueDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    const member = await this.venueMemberRepo.findOne({
      where: { userId, venueId: dto.venueId, isActive: true },
      relations: ['venue'],
    });

    if (!member) {
      throw new BadRequestException('Siz bu to\'yxona a\'zosi emassiz');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      phone: user.phone,
      role: user.role,
      venue_id: member.venueId,
      venue_role: member.role,
    });

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      currentVenue: {
        id: member.venue.id,
        name: member.venue.name,
        role: member.role,
      },
      ...tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Token yaroqsiz');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Token yaroqsiz');
      }

      const tokens = await this.generateTokens({
        sub: payload.sub,
        phone: payload.phone,
        role: payload.role,
        venue_id: payload.venue_id,
        venue_role: payload.venue_role,
      });

      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch {
      throw new UnauthorizedException('Token muddati tugagan');
    }
  }

  /**
   * Logout — clear refresh token
   */
  async logout(userId: string) {
    await this.userRepo.update(userId, { refreshToken: null });
    return { message: 'Muvaffaqiyatli chiqildi' };
  }

  /**
   * Change password
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Joriy parol noto\'g\'ri');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepo.update(userId, { passwordHash: newHash });

    return { message: 'Parol muvaffaqiyatli o\'zgartirildi' };
  }

  /**
   * Send OTP code via SMS — with rate limit
   * Rate limit: 1 SMS / 60 seconds per phone, max 5 SMS / hour per phone.
   */
  async sendOtp(dto: SendOtpDto) {
    const phone = normalizePhone(dto.phone);
    const now = Date.now();
    const existing = this.otpStore.get(phone);

    if (existing) {
      const sinceLast = now - existing.lastSentAt.getTime();
      if (sinceLast < 60 * 1000) {
        const wait = Math.ceil((60 * 1000 - sinceLast) / 1000);
        throw new BadRequestException(
          `Iltimos ${wait} sekunddan keyin qayta urinib ko'ring`,
        );
      }
      if (existing.attempts >= 5) {
        // 5+ in 1 hour window → block until window expires
        if (existing.expiresAt.getTime() + 60 * 60 * 1000 > now) {
          throw new BadRequestException(
            'Juda ko\'p urinish. 1 soatdan keyin qayta urinib ko\'ring',
          );
        }
        // window passed → reset
        existing.attempts = 0;
      }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(now + 5 * 60 * 1000); // 5 daqiqa

    this.otpStore.set(phone, {
      code,
      expiresAt,
      lastSentAt: new Date(now),
      attempts: (existing?.attempts || 0) + 1,
    });

    await this.smsService.sendSms(
      phone,
      `iToyxona: Sizning tasdiqlash kodingiz: ${code}. Kod 5 daqiqa amal qiladi.`,
    );

    return { message: 'Tasdiqlash kodi yuborildi', expiresIn: 300 };
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(dto: VerifyOtpDto) {
    const phone = normalizePhone(dto.phone);
    const stored = this.otpStore.get(phone);
    if (!stored) {
      throw new BadRequestException('Tasdiqlash kodi topilmadi. Qaytadan yuboring.');
    }

    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(phone);
      throw new BadRequestException('Tasdiqlash kodi muddati tugagan');
    }

    if (stored.code !== dto.code) {
      throw new BadRequestException('Tasdiqlash kodi noto\'g\'ri');
    }

    this.otpStore.delete(phone);
    return { message: 'Telefon raqam tasdiqlandi', verified: true };
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(dto: ResetPasswordDto) {
    const phone = normalizePhone(dto.phone);
    const stored = this.otpStore.get(phone);
    if (!stored) {
      throw new BadRequestException('Tasdiqlash kodi topilmadi');
    }

    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(phone);
      throw new BadRequestException('Tasdiqlash kodi muddati tugagan');
    }

    if (stored.code !== dto.code) {
      throw new BadRequestException('Tasdiqlash kodi noto\'g\'ri');
    }

    const user = await this.userRepo.findOne({ where: { phone } });
    if (!user) {
      throw new BadRequestException('Foydalanuvchi topilmadi');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepo.update(user.id, { passwordHash: newHash });
    this.otpStore.delete(phone);

    return { message: 'Parol muvaffaqiyatli yangilandi' };
  }

  // ─── Private Methods ────────────────────────────────────

  private async generateTokens(payload: JwtPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedToken = await bcrypt.hash(refreshToken, 12);
    await this.userRepo.update(userId, { refreshToken: hashedToken });
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      language: user.language,
    };
  }
}
