import { ApiProperty } from '@nestjs/swagger';
import { User } from '../domain/user';
import { XpStatsResponseDto } from './xp-stats-response.dto';

export class UserWithXpStatsDto extends User {
  @ApiProperty({
    type: XpStatsResponseDto,
    description: 'Detailed XP statistics',
  })
  xpStats: XpStatsResponseDto;
}
