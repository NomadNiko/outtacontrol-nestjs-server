import { Injectable } from '@nestjs/common';
import { UsersService } from '../users.service';
import { XpLevelingService, UserXpStats } from './xp-leveling.service';
import { User } from '../domain/user';
import { XpStatsResponseDto } from '../dto/xp-stats-response.dto';
import { LevelUpResponseDto } from '../dto/level-up-response.dto';

@Injectable()
export class UserXpService {
  constructor(
    private readonly usersService: UsersService,
    private readonly xpLevelingService: XpLevelingService,
  ) {}

  /**
   * Add XP to a user and handle automatic leveling
   */
  async addXp(
    userId: string | number,
    xpAmount: number,
  ): Promise<LevelUpResponseDto> {
    // Get current user
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentXp = user.xp || 0;
    const currentLevel = user.level || 1;
    const newXp = currentXp + xpAmount;

    // Calculate new level
    const newLevel = this.xpLevelingService.calculateLevel(newXp);
    const levelsGained = this.xpLevelingService.getLevelsGained(
      currentXp,
      xpAmount,
    );
    const leveledUp = newLevel > currentLevel;

    // Update user in database
    await this.usersService.update(userId, {
      xp: newXp,
      level: newLevel,
    });

    // Get updated XP stats
    const xpStats = this.xpLevelingService.getXpStats(newXp);

    return {
      leveledUp,
      levelsGained,
      previousLevel: currentLevel,
      newLevel,
      xpAdded: xpAmount,
      xpStats: {
        currentXp: xpStats.currentXp,
        level: xpStats.level,
        xpToNextLevel: xpStats.xpToNextLevel,
        xpRequiredForNextLevel: xpStats.xpRequiredForNextLevel,
        totalXpRequiredForCurrentLevel: xpStats.totalXpRequiredForCurrentLevel,
        progressPercent: xpStats.progressPercent,
      },
    };
  }

  /**
   * Get XP statistics for a user
   */
  async getUserXpStats(userId: string | number): Promise<XpStatsResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const xpStats = this.xpLevelingService.getXpStats(user.xp || 0);

    return {
      currentXp: xpStats.currentXp,
      level: xpStats.level,
      xpToNextLevel: xpStats.xpToNextLevel,
      xpRequiredForNextLevel: xpStats.xpRequiredForNextLevel,
      totalXpRequiredForCurrentLevel: xpStats.totalXpRequiredForCurrentLevel,
      progressPercent: xpStats.progressPercent,
    };
  }

  /**
   * Get user's current level
   */
  async getUserLevel(userId: string | number): Promise<number> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user.level || 1;
  }

  /**
   * Check if user would level up with additional XP
   */
  async wouldLevelUp(
    userId: string | number,
    xpAmount: number,
  ): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.xpLevelingService.wouldLevelUp(user.xp || 0, xpAmount);
  }

  /**
   * Calculate what levels would be gained with additional XP
   */
  async getProjectedLevelsGained(
    userId: string | number,
    xpAmount: number,
  ): Promise<number[]> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.xpLevelingService.getLevelsGained(user.xp || 0, xpAmount);
  }

  /**
   * Update user's level based on their current XP (useful for data correction)
   */
  async recalculateUserLevel(userId: string | number): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const correctLevel = this.xpLevelingService.calculateLevel(user.xp || 0);

    if (correctLevel !== user.level) {
      await this.usersService.update(userId, {
        level: correctLevel,
      });
    }

    const updatedUser = await this.usersService.findById(userId);
    if (!updatedUser) {
      throw new Error('User not found after update');
    }
    return updatedUser;
  }

  /**
   * Get enriched user data with XP statistics
   */
  async getUserWithXpStats(
    userId: string | number,
  ): Promise<User & { xpStats: UserXpStats }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const xpStats = this.xpLevelingService.getXpStats(user.xp || 0);

    return {
      ...user,
      xpStats,
    };
  }
}
