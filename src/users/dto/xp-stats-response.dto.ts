import { ApiProperty } from '@nestjs/swagger';

export class XpStatsResponseDto {
  @ApiProperty({
    example: 1250,
    description: 'Current total XP',
  })
  currentXp: number;

  @ApiProperty({
    example: 5,
    description: 'Current level',
  })
  level: number;

  @ApiProperty({
    example: 250,
    description: 'XP needed to reach next level',
  })
  xpToNextLevel: number;

  @ApiProperty({
    example: 500,
    description: 'Total XP required for next level',
  })
  xpRequiredForNextLevel: number;

  @ApiProperty({
    example: 1000,
    description: 'Total XP required for current level',
  })
  totalXpRequiredForCurrentLevel: number;

  @ApiProperty({
    example: 50,
    description: 'Progress percentage to next level',
    minimum: 0,
    maximum: 100,
  })
  progressPercent: number;
}
