import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../../users/dto/user.dto';
import { Exclude, Type } from 'class-transformer';

export class LocationDto {
  @ApiProperty({
    type: String,
    example: 'Point',
  })
  type: 'Point';

  @ApiProperty({
    type: [Number],
    example: [-122.4194, 37.7749],
  })
  coordinates: [number, number];
}

export class FarmDto {
  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty({
    type: String,
    example: 'Green Valley Farm',
  })
  name: string;

  @ApiProperty({
    type: String,
    example: 'A beautiful organic farm',
  })
  description?: string;

  @ApiProperty({
    type: LocationDto,
  })
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({
    type: () => UserDto,
  })
  @Type(() => UserDto)
  owner: UserDto;

  @ApiProperty({
    type: Number,
    example: 1,
  })
  level: number;

  @ApiProperty({
    type: Number,
    example: 0,
  })
  experience: number;

  @ApiProperty({
    type: Boolean,
    example: true,
  })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @Exclude()
  deletedAt?: Date;
}
