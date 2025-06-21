import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class SortWallDto {
  @ApiProperty({ example: 'createdAt' })
  @Type(() => String)
  @IsString()
  orderBy: keyof WallDto;

  @ApiProperty({ example: 'desc' })
  @IsString()
  order: string;
}

export class FilterWallDto {
  @ApiProperty({
    required: false,
    description: 'Filter by farm ID (finds walls connected to this farm)',
  })
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by owner ID',
  })
  @IsOptional()
  @IsString()
  ownerId?: string;
}

export class QueryWallDto {
  @ApiProperty({
    required: false,
    default: 1,
  })
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiProperty({
    required: false,
    default: 10,
  })
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? JSON.parse(value) : undefined))
  filters?: FilterWallDto | null;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => {
    return value ? JSON.parse(value) : undefined;
  })
  sort?: SortWallDto[] | null;
}

class WallDto {
  id: string;
  distance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
