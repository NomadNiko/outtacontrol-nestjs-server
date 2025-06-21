import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UserXpService } from './services/user-xp.service';
import { XpLevelingService } from './services/xp-leveling.service';
import { AddXpDto } from './dto/add-xp.dto';
import { XpStatsResponseDto } from './dto/xp-stats-response.dto';
import { LevelUpResponseDto } from './dto/level-up-response.dto';
import { LevelDataResponseDto } from './dto/level-data-response.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@ApiTags('User XP')
@Controller({
  path: 'users',
  version: '1',
})
export class XpController {
  constructor(
    private readonly userXpService: UserXpService,
    private readonly xpLevelingService: XpLevelingService,
  ) {}

  @ApiOperation({
    summary: 'Get current user XP statistics',
    description: 'Returns detailed XP statistics for the authenticated user',
  })
  @ApiOkResponse({
    description: 'User XP statistics retrieved successfully',
    type: XpStatsResponseDto,
  })
  @Get('me/xp/stats')
  @HttpCode(HttpStatus.OK)
  async getMyXpStats(@Request() request): Promise<XpStatsResponseDto> {
    return this.userXpService.getUserXpStats(request.user.id);
  }

  @ApiOperation({
    summary: 'Get current user level',
    description: 'Returns the current level of the authenticated user',
  })
  @ApiOkResponse({
    description: 'User level retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        level: {
          type: 'number',
          example: 5,
          description: 'Current user level',
        },
      },
    },
  })
  @Get('me/xp/level')
  @HttpCode(HttpStatus.OK)
  async getMyLevel(@Request() request): Promise<{ level: number }> {
    const level = await this.userXpService.getUserLevel(request.user.id);
    return { level };
  }

  @ApiOperation({
    summary: 'Add XP to user (Admin only)',
    description:
      'Add experience points to a specific user and handle automatic leveling',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiCreatedResponse({
    description: 'XP added successfully',
    type: LevelUpResponseDto,
  })
  @Roles(RoleEnum.admin)
  @UseGuards(RolesGuard)
  @Post(':id/xp/add')
  @HttpCode(HttpStatus.CREATED)
  async addXpToUser(
    @Param('id') id: string,
    @Body() addXpDto: AddXpDto,
  ): Promise<LevelUpResponseDto> {
    return this.userXpService.addXp(id, addXpDto.xp);
  }

  @ApiOperation({
    summary: 'Get user XP statistics (Admin only)',
    description: 'Get detailed XP statistics for any user',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'User XP statistics retrieved successfully',
    type: XpStatsResponseDto,
  })
  @Roles(RoleEnum.admin)
  @UseGuards(RolesGuard)
  @Get(':id/xp/stats')
  @HttpCode(HttpStatus.OK)
  async getUserXpStats(@Param('id') id: string): Promise<XpStatsResponseDto> {
    return this.userXpService.getUserXpStats(id);
  }

  @ApiOperation({
    summary: 'Get user level (Admin only)',
    description: 'Get the current level of any user',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'User level retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        level: {
          type: 'number',
          example: 5,
          description: 'User level',
        },
      },
    },
  })
  @Roles(RoleEnum.admin)
  @UseGuards(RolesGuard)
  @Get(':id/xp/level')
  @HttpCode(HttpStatus.OK)
  async getUserLevel(@Param('id') id: string): Promise<{ level: number }> {
    const level = await this.userXpService.getUserLevel(id);
    return { level };
  }

  @ApiOperation({
    summary: 'Recalculate user level (Admin only)',
    description: 'Recalculate and fix user level based on their current XP',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'User level recalculated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Level recalculated successfully',
        },
        level: {
          type: 'number',
          example: 5,
        },
      },
    },
  })
  @Roles(RoleEnum.admin)
  @UseGuards(RolesGuard)
  @Post(':id/xp/recalculate')
  @HttpCode(HttpStatus.OK)
  async recalculateUserLevel(
    @Param('id') id: string,
  ): Promise<{ message: string; level: number }> {
    const user = await this.userXpService.recalculateUserLevel(id);
    return {
      message: 'Level recalculated successfully',
      level: user.level || 1,
    };
  }

  @ApiOperation({
    summary: 'Get all level data',
    description: 'Returns the complete leveling table with XP requirements',
  })
  @ApiOkResponse({
    description: 'Level data retrieved successfully',
    type: LevelDataResponseDto,
  })
  @Get('xp/levels')
  @HttpCode(HttpStatus.OK)
  getLevelData(): LevelDataResponseDto {
    const levels = this.xpLevelingService.getAllLevelData();
    return {
      levels: levels.map((level) => ({
        level: level.level,
        xpRequired: level.xpRequired,
        totalXpRequired: level.totalXpRequired,
      })),
      maxLevel: this.xpLevelingService.getMaxLevel(),
    };
  }

  @ApiOperation({
    summary: 'Check if XP would cause level up',
    description:
      'Check if adding specific amount of XP would cause the user to level up',
  })
  @ApiOkResponse({
    description: 'Level up check completed',
    schema: {
      type: 'object',
      properties: {
        wouldLevelUp: {
          type: 'boolean',
          example: true,
        },
        levelsGained: {
          type: 'array',
          items: { type: 'number' },
          example: [6, 7],
        },
      },
    },
  })
  @Post('me/xp/check-level-up')
  @HttpCode(HttpStatus.OK)
  async checkLevelUp(
    @Request() request,
    @Body() addXpDto: AddXpDto,
  ): Promise<{ wouldLevelUp: boolean; levelsGained: number[] }> {
    const wouldLevelUp = await this.userXpService.wouldLevelUp(
      request.user.id,
      addXpDto.xp,
    );
    const levelsGained = await this.userXpService.getProjectedLevelsGained(
      request.user.id,
      addXpDto.xp,
    );

    return {
      wouldLevelUp,
      levelsGained,
    };
  }
}
