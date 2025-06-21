import { ApiProperty } from '@nestjs/swagger';
import { XpStatsResponseDto } from './xp-stats-response.dto';

export class LevelUpResponseDto {
  @ApiProperty({
    example: true,
    description: 'Whether the user leveled up',
  })
  leveledUp: boolean;

  @ApiProperty({
    example: [6, 7],
    description: 'Array of levels gained (empty if no level up)',
    type: [Number],
  })
  levelsGained: number[];

  @ApiProperty({
    example: 5,
    description: 'Previous level',
  })
  previousLevel: number;

  @ApiProperty({
    example: 7,
    description: 'New level',
  })
  newLevel: number;

  @ApiProperty({
    example: 150,
    description: 'XP that was added',
  })
  xpAdded: number;

  @ApiProperty({
    type: XpStatsResponseDto,
    description: 'Updated XP statistics',
  })
  xpStats: XpStatsResponseDto;
}
