import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/domain/user';
import databaseConfig from '../../database/config/database.config';
import { DatabaseConfig } from '../../database/config/database-config.type';

// <database-block>
const idType = (databaseConfig() as DatabaseConfig).isDocumentDatabase
  ? String
  : Number;
// </database-block>

export interface Location {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export class Farm {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: String,
    example: 'Green Valley Farm',
    description: 'Name of the farm',
  })
  name: string;

  @ApiProperty({
    type: String,
    example: 'A beautiful organic farm with fresh vegetables',
    description: 'Description of the farm',
  })
  description?: string;

  @ApiProperty({
    type: Object,
    example: {
      type: 'Point',
      coordinates: [-122.4194, 37.7749], // [longitude, latitude]
    },
    description: 'Farm location in GeoJSON format',
  })
  location: Location;

  @ApiProperty({
    type: () => User,
    description: 'Owner of the farm',
  })
  owner: User;

  @ApiProperty({
    type: Number,
    example: 100,
    description: 'Level of the farm',
    default: 1,
  })
  level: number;

  @ApiProperty({
    type: Number,
    example: 500,
    description: 'Experience points of the farm',
    default: 0,
  })
  experience: number;

  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'Whether the farm is active',
    default: true,
  })
  isActive: boolean;

  @ApiProperty({
    type: Number,
    example: 100,
    description: 'Health of the farm (0-100)',
    default: 100,
  })
  health: number;

  @ApiProperty({
    type: Date,
    example: '2024-01-01T12:00:00Z',
    description: 'Last time the farm was harvested',
  })
  lastHarvestAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  deletedAt?: Date;
}