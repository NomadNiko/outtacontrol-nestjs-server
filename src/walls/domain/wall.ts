import { ApiProperty } from '@nestjs/swagger';
import { Farm } from '../../farms/domain/farm';
import { User } from '../../users/domain/user';

export class Wall {
  @ApiProperty({
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    type: () => Farm,
    description: 'First farm that this wall connects',
  })
  fromFarm: Farm;

  @ApiProperty({
    type: () => Farm,
    description: 'Second farm that this wall connects',
  })
  toFarm: Farm;

  @ApiProperty({
    type: () => User,
    description: 'User who owns this wall',
  })
  owner: User;

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
    default: true,
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
    description: 'Last time the wall took damage',
    required: false,
  })
  lastDamageAt?: Date;

  @ApiProperty({
    type: Date,
    example: '2024-01-01T12:00:00Z',
    description: 'Last time the wall was healed',
    required: false,
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