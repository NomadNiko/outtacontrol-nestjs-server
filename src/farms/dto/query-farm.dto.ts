import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';
import { Farm } from '../domain/farm';

export class FilterFarmDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Filter by owner ID',
  })
  @IsOptional()
  @IsString()
  owner?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Filter by active status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    type: Number,
    description: 'Minimum level',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => (value ? Number(value) : value))
  levelMin?: number;

  @ApiPropertyOptional({
    type: Number,
    description: 'Maximum level',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => (value ? Number(value) : value))
  levelMax?: number;
}

export class LocationFilterDto {
  @ApiPropertyOptional({
    type: [Number],
    example: [-122.4194, 37.7749],
    description: 'Center coordinates [longitude, latitude]',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  @Min(-180, { each: true })
  @Max(180, { each: true })
  @Transform(({ value }) => value?.map(Number))
  center?: [number, number];

  @ApiPropertyOptional({
    type: Number,
    example: 1000,
    description: 'Search radius in meters',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50000) // Max 50km radius
  @Transform(({ value }) => (value ? Number(value) : value))
  radius?: number;
}

export class GeoFilterFarmDto extends FilterFarmDto {
  @ApiPropertyOptional({
    type: LocationFilterDto,
    description: 'Location-based filtering',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationFilterDto)
  location?: LocationFilterDto;
}

export class SortFarmDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  orderBy: keyof Farm;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  order: string;
}

export class QueryFarmDto {
  @ApiPropertyOptional({
    type: Number,
  })
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    type: Number,
  })
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) =>
    value ? plainToInstance(GeoFilterFarmDto, JSON.parse(value)) : undefined,
  )
  @ValidateNested()
  @Type(() => GeoFilterFarmDto)
  filters?: GeoFilterFarmDto | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) => {
    return value ? plainToInstance(SortFarmDto, JSON.parse(value)) : undefined;
  })
  @ValidateNested({ each: true })
  @Type(() => SortFarmDto)
  sort?: SortFarmDto[] | null;
}
