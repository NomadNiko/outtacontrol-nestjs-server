import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  MinLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { FileDto } from '../../files/dto/file.dto';
import { RoleDto } from '../../roles/dto/role.dto';
import { StatusDto } from '../../statuses/dto/status.dto';
import { lowerCaseTransformer } from '../../utils/transformers/lower-case.transformer';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ example: 'test1@example.com', type: String })
  @Transform(lowerCaseTransformer)
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({ example: 'johndoe', type: String })
  @IsOptional()
  @Transform(lowerCaseTransformer)
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @MinLength(6)
  password?: string;

  provider?: string;

  socialId?: string | null;

  @ApiPropertyOptional({ example: 'John', type: String })
  @IsOptional()
  firstName?: string | null;

  @ApiPropertyOptional({ example: 'Doe', type: String })
  @IsOptional()
  lastName?: string | null;

  @ApiPropertyOptional({ type: () => FileDto })
  @IsOptional()
  photo?: FileDto | null;

  @ApiPropertyOptional({ type: () => RoleDto })
  @IsOptional()
  @Type(() => RoleDto)
  role?: RoleDto | null;

  @ApiPropertyOptional({ type: () => StatusDto })
  @IsOptional()
  @Type(() => StatusDto)
  status?: StatusDto;

  @ApiPropertyOptional({
    example: 0,
    type: Number,
    description: 'Amount of platinum currency owned',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  platinum?: number;

  @ApiPropertyOptional({
    example: 0,
    type: Number,
    description: 'Amount of gold currency owned',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gold?: number;

  @ApiPropertyOptional({
    example: 0,
    type: Number,
    description: 'Amount of silver currency owned',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  silver?: number;

  @ApiPropertyOptional({
    example: 0,
    type: Number,
    description: 'Total experience points earned',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  xp?: number;

  @ApiPropertyOptional({
    example: 1,
    type: Number,
    description: 'Current user level',
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  level?: number;
}
