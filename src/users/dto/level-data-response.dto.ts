import { ApiProperty } from '@nestjs/swagger';

export class LevelDataDto {
  @ApiProperty({
    example: 5,
    description: 'Level number',
  })
  level: number;

  @ApiProperty({
    example: 500,
    description: 'XP required to advance from this level to the next',
  })
  xpRequired: number;

  @ApiProperty({
    example: 1000,
    description: 'Total XP required to reach this level',
  })
  totalXpRequired: number;
}

export class LevelDataResponseDto {
  @ApiProperty({
    type: [LevelDataDto],
    description: 'Array of all level data',
  })
  levels: LevelDataDto[];

  @ApiProperty({
    example: 50,
    description: 'Maximum level',
  })
  maxLevel: number;
}
