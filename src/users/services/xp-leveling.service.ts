import { Injectable } from '@nestjs/common';

export interface LevelData {
  level: number;
  xpRequired: number;
  totalXpRequired: number;
}

export interface UserXpStats {
  currentXp: number;
  level: number;
  xpToNextLevel: number;
  xpRequiredForNextLevel: number;
  totalXpRequiredForCurrentLevel: number;
  progressPercent: number;
}

@Injectable()
export class XpLevelingService {
  // XP requirements table based on the provided leveling system
  private readonly levelTable: LevelData[] = [
    { level: 1, xpRequired: 100, totalXpRequired: 0 },
    { level: 2, xpRequired: 200, totalXpRequired: 100 },
    { level: 3, xpRequired: 300, totalXpRequired: 300 },
    { level: 4, xpRequired: 400, totalXpRequired: 600 },
    { level: 5, xpRequired: 500, totalXpRequired: 1000 },
    { level: 6, xpRequired: 600, totalXpRequired: 1500 },
    { level: 7, xpRequired: 700, totalXpRequired: 2100 },
    { level: 8, xpRequired: 800, totalXpRequired: 2800 },
    { level: 9, xpRequired: 900, totalXpRequired: 3600 },
    { level: 10, xpRequired: 1000, totalXpRequired: 4500 },
    { level: 11, xpRequired: 1200, totalXpRequired: 5500 },
    { level: 12, xpRequired: 1400, totalXpRequired: 6700 },
    { level: 13, xpRequired: 1600, totalXpRequired: 8100 },
    { level: 14, xpRequired: 1800, totalXpRequired: 9700 },
    { level: 15, xpRequired: 2000, totalXpRequired: 11500 },
    { level: 16, xpRequired: 2300, totalXpRequired: 13500 },
    { level: 17, xpRequired: 2600, totalXpRequired: 15800 },
    { level: 18, xpRequired: 3000, totalXpRequired: 18400 },
    { level: 19, xpRequired: 3400, totalXpRequired: 21400 },
    { level: 20, xpRequired: 4000, totalXpRequired: 24800 },
    { level: 21, xpRequired: 4500, totalXpRequired: 28800 },
    { level: 22, xpRequired: 5000, totalXpRequired: 33300 },
    { level: 23, xpRequired: 6000, totalXpRequired: 38300 },
    { level: 24, xpRequired: 7000, totalXpRequired: 44300 },
    { level: 25, xpRequired: 8000, totalXpRequired: 51300 },
    { level: 26, xpRequired: 9000, totalXpRequired: 59300 },
    { level: 27, xpRequired: 10000, totalXpRequired: 68300 },
    { level: 28, xpRequired: 12000, totalXpRequired: 78300 },
    { level: 29, xpRequired: 14000, totalXpRequired: 90300 },
    { level: 30, xpRequired: 16000, totalXpRequired: 104300 },
    { level: 31, xpRequired: 18000, totalXpRequired: 120300 },
    { level: 32, xpRequired: 20000, totalXpRequired: 138300 },
    { level: 33, xpRequired: 24000, totalXpRequired: 158300 },
    { level: 34, xpRequired: 28000, totalXpRequired: 182300 },
    { level: 35, xpRequired: 32000, totalXpRequired: 210300 },
    { level: 36, xpRequired: 36000, totalXpRequired: 242300 },
    { level: 37, xpRequired: 40000, totalXpRequired: 278300 },
    { level: 38, xpRequired: 45000, totalXpRequired: 318300 },
    { level: 39, xpRequired: 50000, totalXpRequired: 363300 },
    { level: 40, xpRequired: 60000, totalXpRequired: 413300 },
    { level: 41, xpRequired: 70000, totalXpRequired: 473300 },
    { level: 42, xpRequired: 80000, totalXpRequired: 543300 },
    { level: 43, xpRequired: 90000, totalXpRequired: 623300 },
    { level: 44, xpRequired: 100000, totalXpRequired: 713300 },
    { level: 45, xpRequired: 115000, totalXpRequired: 813300 },
    { level: 46, xpRequired: 130000, totalXpRequired: 928300 },
    { level: 47, xpRequired: 150000, totalXpRequired: 1058300 },
    { level: 48, xpRequired: 175000, totalXpRequired: 1208300 },
    { level: 49, xpRequired: 200000, totalXpRequired: 1383300 },
    { level: 50, xpRequired: 0, totalXpRequired: 1583300 }, // Max level
  ];

  /**
   * Calculate the current level based on total XP
   */
  calculateLevel(totalXp: number): number {
    if (totalXp < 0) return 1;

    // Find the highest level where totalXpRequired <= totalXp
    for (let i = this.levelTable.length - 1; i >= 0; i--) {
      if (totalXp >= this.levelTable[i].totalXpRequired) {
        return this.levelTable[i].level;
      }
    }

    return 1; // Default to level 1
  }

  /**
   * Get detailed XP statistics for a user
   */
  getXpStats(totalXp: number): UserXpStats {
    const currentLevel = this.calculateLevel(totalXp);
    const currentLevelData = this.levelTable.find(
      (l) => l.level === currentLevel,
    );
    const nextLevelData = this.levelTable.find(
      (l) => l.level === currentLevel + 1,
    );

    if (!currentLevelData) {
      throw new Error(`Invalid level data for level ${currentLevel}`);
    }

    // If at max level
    if (!nextLevelData || currentLevel >= 50) {
      return {
        currentXp: totalXp,
        level: currentLevel,
        xpToNextLevel: 0,
        xpRequiredForNextLevel: 0,
        totalXpRequiredForCurrentLevel: currentLevelData.totalXpRequired,
        progressPercent: 100,
      };
    }

    const xpInCurrentLevel = totalXp - currentLevelData.totalXpRequired;
    const xpToNextLevel = nextLevelData.totalXpRequired - totalXp;
    const progressPercent = Math.floor(
      (xpInCurrentLevel / currentLevelData.xpRequired) * 100,
    );

    return {
      currentXp: totalXp,
      level: currentLevel,
      xpToNextLevel,
      xpRequiredForNextLevel: currentLevelData.xpRequired,
      totalXpRequiredForCurrentLevel: currentLevelData.totalXpRequired,
      progressPercent,
    };
  }

  /**
   * Check if adding XP would result in a level up
   */
  wouldLevelUp(currentXp: number, xpToAdd: number): boolean {
    const currentLevel = this.calculateLevel(currentXp);
    const newLevel = this.calculateLevel(currentXp + xpToAdd);
    return newLevel > currentLevel;
  }

  /**
   * Get levels gained from adding XP
   */
  getLevelsGained(currentXp: number, xpToAdd: number): number[] {
    const currentLevel = this.calculateLevel(currentXp);
    const newLevel = this.calculateLevel(currentXp + xpToAdd);

    const levelsGained: number[] = [];
    for (let level = currentLevel + 1; level <= newLevel; level++) {
      levelsGained.push(level);
    }

    return levelsGained;
  }

  /**
   * Get the XP required to reach a specific level
   */
  getXpRequiredForLevel(level: number): number {
    const levelData = this.levelTable.find((l) => l.level === level);
    return levelData ? levelData.totalXpRequired : 0;
  }

  /**
   * Get the maximum level
   */
  getMaxLevel(): number {
    return 50;
  }

  /**
   * Validate if a level is valid
   */
  isValidLevel(level: number): boolean {
    return level >= 1 && level <= 50;
  }

  /**
   * Get all level data (useful for admin interfaces)
   */
  getAllLevelData(): LevelData[] {
    return [...this.levelTable];
  }

  /**
   * Calculate XP needed to reach next level from current XP
   */
  getXpToNextLevel(currentXp: number): number {
    const stats = this.getXpStats(currentXp);
    return stats.xpToNextLevel;
  }

  /**
   * Get level data for a specific level
   */
  getLevelData(level: number): LevelData | null {
    return this.levelTable.find((l) => l.level === level) || null;
  }
}
