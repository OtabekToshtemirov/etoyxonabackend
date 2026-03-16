import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectVenueDto {
  @ApiProperty({ description: 'Tanlangan to\'yxona ID' })
  @IsNotEmpty()
  @IsUUID()
  venueId: string;
}
