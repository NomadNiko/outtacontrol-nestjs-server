import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UserLocationDto {
  @ApiProperty({ 
    example: 37.7749,
    description: 'User current latitude',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ 
    example: -122.4194,
    description: 'User current longitude',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

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

  @ApiProperty({
    type: UserLocationDto,
    description: 'User current location for distance validation',
  })
  @ValidateNested()
  @Type(() => UserLocationDto)
  userLocation: UserLocationDto;
}