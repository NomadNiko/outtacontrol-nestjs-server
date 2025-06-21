import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @ApiProperty({
    type: String,
    example: 'Point',
    description: 'GeoJSON type, must be "Point"',
  })
  @IsString()
  @IsNotEmpty()
  type: 'Point';

  @ApiProperty({
    type: [Number],
    example: [-122.4194, 37.7749],
    description: 'Coordinates array [longitude, latitude]',
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  @Min(-180, { each: true })
  @Max(180, { each: true })
  coordinates: [number, number];
}

export class CreateFarmDto {
  @ApiProperty({
    type: String,
    example: 'Green Valley Farm',
    description: 'Name of the farm',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    type: String,
    example: 'A beautiful organic farm with fresh vegetables',
    description: 'Description of the farm',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    type: LocationDto,
    description: 'Farm location in GeoJSON format',
  })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;
}
