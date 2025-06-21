import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { User } from '../users/domain/user';
import { UsersService } from '../users/users.service';
import {
  PurchaseCost,
  PurchaseReward,
  needsReplenishment,
  calculateReplenishment,
} from './config/purchase-costs.config';

export interface PurchaseResult {
  success: boolean;
  updatedUser: User;
  cost: PurchaseCost;
}

export interface RewardResult {
  success: boolean;
  updatedUser: User;
  reward: PurchaseReward;
}

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Validate if user has sufficient currency for a purchase
   */
  private validateSufficientFunds(user: User, cost: PurchaseCost): void {
    const userSilver = user.silver || 0;
    const userGold = user.gold || 0;
    const userPlatinum = user.platinum || 0;

    if (
      userSilver < cost.silver ||
      userGold < cost.gold ||
      userPlatinum < cost.platinum
    ) {
      const required: string[] = [];
      const available: string[] = [];

      if (cost.silver > 0) {
        required.push(`${cost.silver} silver`);
        available.push(`${userSilver} silver`);
      }
      if (cost.gold > 0) {
        required.push(`${cost.gold} gold`);
        available.push(`${userGold} gold`);
      }
      if (cost.platinum > 0) {
        required.push(`${cost.platinum} platinum`);
        available.push(`${userPlatinum} platinum`);
      }

      throw new BadRequestException(
        `Insufficient funds. Required: ${required.join(', ')}. Available: ${available.join(', ')}.`,
      );
    }
  }

  /**
   * Deduct currency from user for a purchase
   */
  async makePurchase(
    userId: User['id'],
    cost: PurchaseCost,
    itemType: string,
  ): Promise<PurchaseResult> {
    this.logger.log(
      `💰 [PURCHASE] Making purchase for user ${userId}: ${itemType}`,
    );
    this.logger.log(
      `💸 [PURCHASE] Cost: ${cost.silver} silver, ${cost.gold} gold, ${cost.platinum} platinum`,
    );

    // Get fresh user data
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Validate sufficient funds
    this.validateSufficientFunds(user, cost);

    // Calculate new currency amounts
    const newSilver = (user.silver || 0) - cost.silver;
    const newGold = (user.gold || 0) - cost.gold;
    const newPlatinum = (user.platinum || 0) - cost.platinum;

    // Update user currency
    const updatedUser = await this.usersService.update(userId, {
      silver: newSilver,
      gold: newGold,
      platinum: newPlatinum,
    });

    if (!updatedUser) {
      throw new BadRequestException('Failed to update user currency');
    }

    this.logger.log(
      `✅ [PURCHASE] Purchase successful. New balances: ${newSilver} silver, ${newGold} gold, ${newPlatinum} platinum`,
    );

    return {
      success: true,
      updatedUser,
      cost,
    };
  }

  /**
   * Give currency reward to user for a deletion
   */
  async giveReward(
    userId: User['id'],
    reward: PurchaseReward,
    itemType: string,
  ): Promise<RewardResult> {
    this.logger.log(
      `🎁 [REWARD] Giving reward to user ${userId}: ${itemType} deletion`,
    );
    this.logger.log(
      `💰 [REWARD] Reward: ${reward.silver} silver, ${reward.gold} gold, ${reward.platinum} platinum`,
    );

    // Get fresh user data
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Calculate new currency amounts
    const newSilver = (user.silver || 0) + reward.silver;
    const newGold = (user.gold || 0) + reward.gold;
    const newPlatinum = (user.platinum || 0) + reward.platinum;

    // Update user currency
    const updatedUser = await this.usersService.update(userId, {
      silver: newSilver,
      gold: newGold,
      platinum: newPlatinum,
    });

    if (!updatedUser) {
      throw new BadRequestException('Failed to update user currency');
    }

    this.logger.log(
      `✅ [REWARD] Reward given successfully. New balances: ${newSilver} silver, ${newGold} gold, ${newPlatinum} platinum`,
    );

    return {
      success: true,
      updatedUser,
      reward,
    };
  }

  /**
   * Replenish user currency to minimum amounts if below threshold
   */
  async replenishCurrency(userId: User['id']): Promise<RewardResult | null> {
    // Get fresh user data
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if replenishment is needed
    if (!needsReplenishment(user)) {
      return null; // No replenishment needed
    }

    this.logger.log(
      `🌙 [REPLENISH] User ${userId} needs currency replenishment`,
    );
    this.logger.log(
      `💰 [REPLENISH] Current: ${user.silver} silver, ${user.gold} gold`,
    );

    // Calculate replenishment amount
    const replenishment = calculateReplenishment(user);

    // Calculate new currency amounts
    const newSilver = (user.silver || 0) + replenishment.silver;
    const newGold = (user.gold || 0) + replenishment.gold;
    const newPlatinum = (user.platinum || 0) + replenishment.platinum;

    // Update user currency
    const updatedUser = await this.usersService.update(userId, {
      silver: newSilver,
      gold: newGold,
      platinum: newPlatinum,
    });

    if (!updatedUser) {
      throw new BadRequestException('Failed to update user currency');
    }

    this.logger.log(
      `✅ [REPLENISH] Currency replenished successfully. Added: ${replenishment.silver} silver, ${replenishment.gold} gold. New balances: ${newSilver} silver, ${newGold} gold, ${newPlatinum} platinum`,
    );

    return {
      success: true,
      updatedUser,
      reward: replenishment,
    };
  }

  /**
   * Give midnight rewards based on farms and walls owned
   * 1 platinum per farm + 1 platinum per wall
   */
  async giveMidnightRewards(
    userId: User['id'],
    farmCount: number,
    wallCount: number,
  ): Promise<RewardResult> {
    this.logger.log(
      `🌙 [MIDNIGHT REWARD] Giving midnight rewards to user ${userId}`,
    );
    this.logger.log(
      `🏛️ [MIDNIGHT REWARD] Farms: ${farmCount}, Walls: ${wallCount}`,
    );

    // Calculate platinum reward: 1 per farm + 1 per wall
    const platinumReward = farmCount + wallCount;

    const reward: PurchaseReward = {
      silver: 0,
      gold: 0,
      platinum: platinumReward,
    };

    // Use the existing giveReward method to handle the reward
    return this.giveReward(userId, reward, 'midnight reward');
  }
}
