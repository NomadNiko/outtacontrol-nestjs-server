import { ApiProperty } from '@nestjs/swagger';
import { FarmDto } from '../../farms/dto/farm.dto';
import { UserDto } from '../../users/dto/user.dto';

export class WallDto {
  @ApiProperty({
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    type: () => FarmDto,
    description: 'First farm that this wall connects',
  })
  fromFarm: FarmDto;

  @ApiProperty({
    type: () => FarmDto,
    description: 'Second farm that this wall connects',
  })
  toFarm: FarmDto;

  @ApiProperty({
    type: () => UserDto,
    description: 'User who owns this wall',
  })
  owner: UserDto;

  @ApiProperty({
    type: Number,
    example: 35.5,
    description: 'Distance between the two farms in meters',
  })
  distance: number;

  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'Whether this wall is active',
  })
  isActive: boolean;

  @ApiProperty({
    type: Date,
    example: '2024-01-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: Date,
    example: '2024-01-01T12:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    type: Date,
    example: null,
    required: false,
  })
  deletedAt?: Date;
}