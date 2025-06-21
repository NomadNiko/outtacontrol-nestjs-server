import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PurchasesService } from '../purchases.service';
import { FarmsService } from '../../farms/farms.service';
import { WallsService } from '../../walls/walls.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class MidnightRewardService {
  private readonly logger = new Logger(MidnightRewardService.name);

  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly farmsService: FarmsService,
    private readonly wallsService: WallsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Distribute daily platinum rewards at midnight (00:00)
   * 1 platinum per farm owned + 1 platinum per wall owned
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async distributeDailyRewards() {
    this.logger.log('🌙 [MIDNIGHT REWARDS] Starting daily platinum distribution...');
    
    try {
      // Get all active users (we'll need to implement a method to get all users)
      const allUsers = await this.getAllActiveUsers();
      
      if (!allUsers || allUsers.length === 0) {
        this.logger.log('ℹ️ [MIDNIGHT REWARDS] No active users found');
        return;
      }

      this.logger.log(`🎯 [MIDNIGHT REWARDS] Processing rewards for ${allUsers.length} users`);
      
      let totalUsersRewarded = 0;
      let totalPlatinumDistributed = 0;

      // Process each user
      for (const user of allUsers) {
        try {
          // Get user's farms and walls count
          const userFarms = await this.farmsService.findByOwner(String(user.id));
          const userWalls = await this.wallsService.findByOwner(String(user.id));
          
          const farmCount = userFarms?.length || 0;
          const wallCount = userWalls?.length || 0;

          // Only give rewards if user has farms or walls
          if (farmCount > 0 || wallCount > 0) {
            const rewardResult = await this.purchasesService.giveMidnightRewards(
              user.id,
              farmCount,
              wallCount
            );

            if (rewardResult.success) {
              totalUsersRewarded++;
              totalPlatinumDistributed += rewardResult.reward.platinum;
              
              this.logger.log(
                `✅ [MIDNIGHT REWARDS] User ${user.id} (${user.email || 'no email'}) received ${rewardResult.reward.platinum} platinum (${farmCount} farms + ${wallCount} walls)`
              );
            }
          } else {
            this.logger.log(
              `ℹ️ [MIDNIGHT REWARDS] User ${user.id} (${user.email || 'no email'}) has no farms or walls, skipping`
            );
          }
        } catch (error) {
          this.logger.error(`❌ [MIDNIGHT REWARDS] Error processing user ${user.id}:`, error);
          // Continue with other users
        }
      }

      this.logger.log(
        `🎉 [MIDNIGHT REWARDS] Daily distribution complete! ${totalUsersRewarded} users rewarded with ${totalPlatinumDistributed} total platinum`
      );
    } catch (error) {
      this.logger.error('❌ [MIDNIGHT REWARDS] Error in daily reward distribution:', error);
    }
  }

  /**
   * Get all active users for reward distribution
   * This is a helper method to get users who should receive rewards
   */
  private async getAllActiveUsers() {
    try {
      // Get a large page of users (assuming most games won't have more than 1000 active users initially)
      // In a real production environment, you might want to implement pagination or streaming
      const users = await this.usersService.findManyWithPagination({
        paginationOptions: { page: 1, limit: 1000 }
      });

      // Filter out inactive users (you might want to add additional criteria)
      return users.filter(user => 
        user.status && 
        user.status.id === 1 && // Assuming 1 = active status
        !user.deletedAt
      );
    } catch (error) {
      this.logger.error('Error fetching active users for midnight rewards:', error);
      return [];
    }
  }

  /**
   * Replenish currency for all users who are below minimum thresholds
   * This is called at midnight along with platinum rewards
   */
  async replenishCurrency(): Promise<{
    usersReplenished: number;
    totalSilver: number;
    totalGold: number;
  }> {
    this.logger.log('💰 [CURRENCY REPLENISHMENT] Starting currency replenishment check...');
    
    try {
      const allUsers = await this.getAllActiveUsers();
      
      if (!allUsers || allUsers.length === 0) {
        this.logger.log('ℹ️ [CURRENCY REPLENISHMENT] No active users found');
        return { usersReplenished: 0, totalSilver: 0, totalGold: 0 };
      }

      let usersReplenished = 0;
      let totalSilverReplenished = 0;
      let totalGoldReplenished = 0;

      // Check each user for replenishment needs
      for (const user of allUsers) {
        try {
          const replenishResult = await this.purchasesService.replenishCurrency(user.id);
          
          if (replenishResult) {
            usersReplenished++;
            totalSilverReplenished += replenishResult.reward.silver;
            totalGoldReplenished += replenishResult.reward.gold;
            
            this.logger.log(
              `✅ [CURRENCY REPLENISHMENT] User ${user.id} (${user.email || 'no email'}) replenished with ${replenishResult.reward.silver} silver, ${replenishResult.reward.gold} gold`
            );
          }
        } catch (error) {
          this.logger.error(`❌ [CURRENCY REPLENISHMENT] Error replenishing user ${user.id}:`, error);
          // Continue with other users
        }
      }

      this.logger.log(
        `🎉 [CURRENCY REPLENISHMENT] Replenishment complete! ${usersReplenished} users replenished with ${totalSilverReplenished} total silver and ${totalGoldReplenished} total gold`
      );

      return {
        usersReplenished,
        totalSilver: totalSilverReplenished,
        totalGold: totalGoldReplenished,
      };
    } catch (error) {
      this.logger.error('❌ [CURRENCY REPLENISHMENT] Error in currency replenishment:', error);
      return { usersReplenished: 0, totalSilver: 0, totalGold: 0 };
    }
  }

  /**
   * Manual trigger for testing currency replenishment (admin only)
   * This method can be called manually for testing purposes
   */
  async triggerManualReplenishment(): Promise<{
    success: boolean;
    usersReplenished: number;
    totalSilver: number;
    totalGold: number;
    message: string;
  }> {
    this.logger.log('🧪 [MANUAL TRIGGER] Starting manual currency replenishment...');
    
    try {
      const result = await this.replenishCurrency();
      
      return {
        success: true,
        usersReplenished: result.usersReplenished,
        totalSilver: result.totalSilver,
        totalGold: result.totalGold,
        message: 'Manual currency replenishment completed successfully'
      };
    } catch (error) {
      this.logger.error('Error in manual currency replenishment:', error);
      return {
        success: false,
        usersReplenished: 0,
        totalSilver: 0,
        totalGold: 0,
        message: `Failed to replenish currency: ${error.message}`
      };
    }
  }
}