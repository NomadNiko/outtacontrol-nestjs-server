import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, Max } from 'class-validator';

export class AddXpDto {
  @ApiProperty({
    example: 100,
    description: 'Amount of XP to add to the user',
    minimum: 1,
    maximum: 1000000,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Max(1000000)
  xp: number;
}
