import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { VenueEventType } from './entities/event-type.entity';
import { CreateVenueEventTypeDto, UpdateVenueEventTypeDto } from './dto';

const DEFAULT_EVENT_TYPES = [
  { name: "To'y", slug: 'wedding', color: '#EC4899', sortOrder: 0 },
  { name: "Sunnat to'y", slug: 'sunnat_toy', color: '#8B5CF6', sortOrder: 1 },
  { name: 'Osh', slug: 'osh', color: '#F59E0B', sortOrder: 2 },
  { name: 'Tadbir', slug: 'tadbir', color: '#3B82F6', sortOrder: 3 },
  { name: 'Korporativ', slug: 'korporativ', color: '#10B981', sortOrder: 4 },
  { name: 'Bazm', slug: 'bazm', color: '#EF4444', sortOrder: 5 },
];

// Uzbek/Russian transliteration map
const TRANSLIT_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh',
  'ъ': '', 'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  'ў': 'o', 'қ': 'q', 'ғ': 'g', 'ҳ': 'h',
  "'": '', '`': '', '’': '', '‘': '',
};

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err as any).driverError?.code === '23505'
  );
}

@Injectable()
export class EventTypesService {
  constructor(
    @InjectRepository(VenueEventType)
    private readonly repo: Repository<VenueEventType>,
  ) {}

  async findAll(venueId: string): Promise<VenueEventType[]> {
    let types = await this.repo.find({
      where: { venueId, isActive: true },
      order: { sortOrder: 'ASC' },
    });

    if (types.length === 0) {
      await this.seedDefaults(venueId);
      types = await this.repo.find({
        where: { venueId, isActive: true },
        order: { sortOrder: 'ASC' },
      });
    }

    return types;
  }

  async create(
    venueId: string,
    dto: CreateVenueEventTypeDto,
  ): Promise<VenueEventType> {
    const name = (dto.name || '').trim();
    if (!name) throw new BadRequestException('Nom bo\'sh bo\'lmasligi kerak');

    const slug = await this.generateUniqueSlug(venueId, name);
    const entity = this.repo.create({ ...dto, name, venueId, slug });

    try {
      return await this.repo.save(entity);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Bu nomli tadbir turi allaqachon mavjud');
      }
      throw err;
    }
  }

  async update(
    venueId: string,
    id: string,
    dto: UpdateVenueEventTypeDto,
  ): Promise<VenueEventType> {
    const entity = await this.findOne(venueId, id);

    if (dto.name) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Nom bo\'sh bo\'lmasligi kerak');
      if (name !== entity.name) {
        entity.slug = await this.generateUniqueSlug(venueId, name, id);
      }
      entity.name = name;
    }

    if (dto.color !== undefined) entity.color = dto.color;
    if (dto.sortOrder !== undefined) entity.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) entity.isActive = dto.isActive;

    try {
      return await this.repo.save(entity);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Bu nomli tadbir turi allaqachon mavjud');
      }
      throw err;
    }
  }

  async remove(venueId: string, id: string): Promise<{ message: string }> {
    const entity = await this.findOne(venueId, id);
    await this.repo.remove(entity);
    return { message: "Tadbir turi o'chirildi" };
  }

  private async findOne(venueId: string, id: string): Promise<VenueEventType> {
    const entity = await this.repo.findOne({ where: { id, venueId } });
    if (!entity) throw new NotFoundException('Tadbir turi topilmadi');
    return entity;
  }

  private async seedDefaults(venueId: string): Promise<void> {
    // Har bir default uchun alohida INSERT ON CONFLICT DO NOTHING
    // Concurrent requestlar race-condition keltirmaydi
    for (const d of DEFAULT_EVENT_TYPES) {
      await this.repo
        .createQueryBuilder()
        .insert()
        .into(VenueEventType)
        .values({ ...d, venueId })
        .orIgnore() // ON CONFLICT DO NOTHING
        .execute();
    }
  }

  private async generateUniqueSlug(
    venueId: string,
    name: string,
    excludeId?: string,
  ): Promise<string> {
    const base = this.toSlug(name) || 'tadbir';
    let slug = base;
    let counter = 2;

    while (true) {
      const where: any = { venueId, slug };
      const existing = await this.repo.findOne({ where });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${base}_${counter++}`;
      if (counter > 100) return `${base}_${Date.now()}`; // safety
    }
  }

  private toSlug(name: string): string {
    const lower = name.toLowerCase();
    let result = '';
    for (const ch of lower) {
      if (TRANSLIT_MAP[ch] !== undefined) {
        result += TRANSLIT_MAP[ch];
      } else if (/[a-z0-9]/.test(ch)) {
        result += ch;
      } else if (/\s/.test(ch) || ch === '-' || ch === '_') {
        result += '_';
      }
      // boshqa simbollar tashlab yuboriladi
    }
    return result.replace(/_+/g, '_').replace(/^_|_$/g, '');
  }
}
