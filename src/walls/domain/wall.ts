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