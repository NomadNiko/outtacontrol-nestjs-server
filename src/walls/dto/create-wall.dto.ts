import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWallDto {
  @ApiProperty({
    type: String,
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the first farm to connect',
  })
  @IsNotEmpty()
  @IsString()
  fromFarmId: string;

  @ApiProperty({
    type: String,
    example: '507f1f77bcf86cd799439012',
    description: 'ID of the second farm to connect',
  })
  @IsNotEmpty()
  @IsString()
  toFarmId: string;
}