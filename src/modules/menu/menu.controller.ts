import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateMenuCategoryDto, UpdateMenuCategoryDto, CreateMenuItemDto, UpdateMenuItemDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('menu')
@Controller('venues/:venueId/menu')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ─── Categories ─────────
  @Post('categories')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Yangi menyu kategoriya' })
  async createCategory(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() data: CreateMenuCategoryDto,
  ) {
    return this.menuService.createCategory(venueId, data);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Menyu kategoriyalari' })
  async findCategories(@Param('venueId', ParseUUIDPipe) venueId: string) {
    return this.menuService.findCategories(venueId);
  }

  @Patch('categories/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateMenuCategoryDto,
  ) {
    return this.menuService.updateCategory(id, data);
  }
  @Delete('categories/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  async removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.removeCategory(id);
  }

  // ─── Items ──────────────
  @Post('items')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Yangi taom qo\'shish' })
  async createItem(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() data: CreateMenuItemDto,
  ) {
    return this.menuService.createItem(venueId, data);
  }
  @Get('items')
  @ApiOperation({ summary: 'Taomlar ro\'yxati' })
  async findItems(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.menuService.findItems(venueId, categoryId);
  }

  @Get('items/:id')
  async findOneItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.findOneItem(id);
  }

  @Patch('items/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  async updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateMenuItemDto,
  ) {
    return this.menuService.updateItem(id, data);
  }
  @Delete('items/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  async removeItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.removeItem(id);
  }

  // ─── Packages ───────────
  @Post('packages')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Yangi menyu paketi' })
  async createPackage(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() data: any,
  ) {
    return this.menuService.createPackage(venueId, data);
  }

  @Get('packages')
  @ApiOperation({ summary: 'Menyu paketlari' })
  async findPackages(@Param('venueId', ParseUUIDPipe) venueId: string) {
    return this.menuService.findPackages(venueId);
  }

  @Get('packages/:id')
  async findOnePackage(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.findOnePackage(id);
  }

  @Patch('packages/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  async updatePackage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ) {
    return this.menuService.updatePackage(id, data);
  }

  @Delete('packages/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  async removePackage(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.removePackage(id);
  }

  // ─── Package Items ──────
  @Post('packages/:packageId/items')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Paketga taom qo\'shish' })
  async addPackageItem(
    @Param('packageId', ParseUUIDPipe) packageId: string,
    @Body() data: any,
  ) {
    return this.menuService.addPackageItem(packageId, data);
  }

  @Delete('packages/:packageId/items/:itemId')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Paketdan taomni olib tashlash' })
  async removePackageItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.menuService.removePackageItem(itemId);
  }
}
