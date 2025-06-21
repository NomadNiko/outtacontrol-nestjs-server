import { Exclude, Expose } from 'class-transformer';
import { FileType } from '../../files/domain/file';
import { Role } from '../../roles/domain/role';
import { Status } from '../../statuses/domain/status';
import { ApiProperty } from '@nestjs/swagger';
import databaseConfig from '../../database/config/database.config';
import { DatabaseConfig } from '../../database/config/database-config.type';

// <database-block>
const idType = (databaseConfig() as DatabaseConfig).isDocumentDatabase
  ? String
  : Number;
// </database-block>

export class User {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: String,
    example: 'john.doe@example.com',
  })
  @Expose({ groups: ['me', 'admin'] })
  email: string | null;

  @ApiProperty({
    type: String,
    example: 'johndoe',
  })
  username: string;

  @Exclude({ toPlainOnly: true })
  password?: string;

  @ApiProperty({
    type: String,
    example: 'email',
  })
  @Expose({ groups: ['me', 'admin'] })
  provider: string;

  @ApiProperty({
    type: String,
    example: '1234567890',
  })
  @Expose({ groups: ['me', 'admin'] })
  socialId?: string | null;

  @ApiProperty({
    type: String,
    example: 'John',
  })
  firstName: string | null;

  @ApiProperty({
    type: String,
    example: 'Doe',
  })
  lastName: string | null;

  @ApiProperty({
    type: () => FileType,
  })
  photo?: FileType | null;

  @ApiProperty({
    type: () => Role,
  })
  role?: Role | null;

  @ApiProperty({
    type: () => Status,
  })
  status?: Status;

  @ApiProperty({
    type: Number,
    example: 0,
    description: 'Amount of platinum currency owned',
    default: 0,
  })
  platinum: number;

  @ApiProperty({
    type: Number,
    example: 0,
    description: 'Amount of gold currency owned',
    default: 0,
  })
  gold: number;

  @ApiProperty({
    type: Number,
    example: 0,
    description: 'Amount of silver currency owned',
    default: 0,
  })
  silver: number;

  @ApiProperty({
    type: Number,
    example: 0,
    description: 'Total experience points earned',
    default: 0,
  })
  xp: number;

  @ApiProperty({
    type: Number,
    example: 1,
    description: 'Current user level',
    default: 1,
    minimum: 1,
    maximum: 50,
  })
  level: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  deletedAt: Date;
}
