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
    type: Number,
    example: 100,
    description: 'Current health of the wall (0-100)',
    default: 100,
    minimum: 0,
    maximum: 100,
  })
  health: number;

  @ApiProperty({
    type: Number,
    example: 1,
    description: 'Level of the wall',
    default: 1,
    minimum: 1,
  })
  level: number;

  @ApiProperty({
    type: Date,
    example: '2024-01-01T12:00:00Z',
    required: false,
    description: 'Timestamp when the wall was last damaged',
  })
  lastDamageAt?: Date;

  @ApiProperty({
    type: Date,
    example: '2024-01-01T12:00:00Z',
    required: false,
    description: 'Timestamp when the wall was last healed',
  })
  lastHealAt?: Date;

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
