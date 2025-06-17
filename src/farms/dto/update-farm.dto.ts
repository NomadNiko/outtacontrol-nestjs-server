import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateFarmDto } from './create-farm.dto';
import { IsOptional, IsNumber, Min, Max, IsBoolean, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateFarmDto extends PartialType(CreateFarmDto) {
  @ApiPropertyOptional({
    type: Number,
    example: 100,
    description: 'Level of the farm',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  level?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 500,
    description: 'Experience points of the farm',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  experience?: number;

  @ApiPropertyOptional({
    type: Boolean,
    example: true,
    description: 'Whether the farm is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: Number,
    example: 100,
    description: 'Health of the farm (0-100)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  health?: number;

  @ApiPropertyOptional({
    type: Date,
    example: '2024-01-01T12:00:00Z',
    description: 'Last time the farm was harvested',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lastHarvestAt?: Date;
}