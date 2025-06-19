import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsNumber, Min, Max, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateWallDto {
  @ApiPropertyOptional({
    description: 'Whether the wall is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Current health of the wall',
    example: 100,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  health?: number;

  @ApiPropertyOptional({
    description: 'Level of the wall',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  level?: number;

  @ApiPropertyOptional({
    description: 'Last time the wall took damage',
    example: '2024-01-01T12:00:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastDamageAt?: Date;

  @ApiPropertyOptional({
    description: 'Last time the wall was healed',
    example: '2024-01-01T12:00:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastHealAt?: Date;
}