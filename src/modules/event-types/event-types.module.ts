import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenueEventType } from './entities/event-type.entity';
import { EventTypesController } from './event-types.controller';
import { EventTypesService } from './event-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([VenueEventType])],
  controllers: [EventTypesController],
  providers: [EventTypesService],
  exports: [EventTypesService],
})
export class EventTypesModule {}
