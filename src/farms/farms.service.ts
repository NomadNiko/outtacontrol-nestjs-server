import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Farm } from './domain/farm';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { GeoFilterFarmDto, SortFarmDto } from './dto/query-farm.dto';
import { FarmRepository } from './infrastructure/persistence/farm.repository';
import { User } from '../users/domain/user';
import { FarmHarvestService } from './services/farm-harvest.service';
import { FarmLevelService } from './services/farm-level.service';
import { UsersService } from '../users/users.service';
import { UserXpService } from '../users/services/user-xp.service';
import { Wall } from '../walls/domain/wall';
import { WallRepository } from '../walls/infrastructure/persistence/wall.repository';
import { PurchasesService } from '../purchases/purchases.service';
import {
  FARM_CREATION_COST,
  FARM_DELETION_REWARD,
} from '../purchases/config/purchase-costs.config';

@Injectable()
export class FarmsService {
  constructor(
    private readonly farmRepository: FarmRepository,
    private readonly farmHarvestService: FarmHarvestService,
    private readonly farmLevelService: FarmLevelService,
    private readonly usersService: UsersService,
    private readonly userXpService: UserXpService,
    @Inject(forwardRef(() => WallRepository))
    private readonly wallRepository: WallRepository,
    @Inject(forwardRef(() => PurchasesService))
    private readonly purchasesService: PurchasesService,
  ) {}

  async create(
    createFarmDto: CreateFarmDto,
    owner: User,
  ): Promise<{
    farm: Farm;
    purchaseResult: {
      cost: any;
      updatedUser: User;
    };
    xpReward?: {
      xpAdded: number;
      leveledUp: boolean;
      newLevel: number;
      xpStats: any;
    };
  }> {
    // Check for farms within 10 meters
    const nearbyFarms = await this.farmRepository.findNearby({
      longitude: createFarmDto.location.coordinates[0],
      latitude: createFarmDto.location.coordinates[1],
      radiusInMeters: 10, // 10 meter radius
    });

    if (nearbyFarms.length > 0) {
      throw new BadRequestException(
        'Cannot place farm here. Another farm exists within 10 meters of this location.',
      );
    }

    // Calculate and process purchase cost
    const farmLevel = 1; // All new farms start at level 1
    const farmCost = FARM_CREATION_COST;

    console.log(
      `💰 [FARM CREATE] Processing purchase for farm creation - Cost: ${farmCost.silver} silver, ${farmCost.gold} gold, ${farmCost.platinum} platinum`,
    );

    // Make the purchase (this will validate funds and deduct currency)
    const purchaseResult = await this.purchasesService.makePurchase(
      owner.id,
      farmCost,
      'farm creation',
    );

    console.log(`✅ [FARM CREATE] Purchase successful, creating farm...`);

    // Create the farm after successful purchase
    const farm = new Farm();
    farm.name = createFarmDto.name;
    farm.description = createFarmDto.description;
    farm.location = {
      type: 'Point',
      coordinates: createFarmDto.location.coordinates,
    };
    farm.owner = purchaseResult.updatedUser; // Use the updated user with new currency
    farm.level = farmLevel;
    farm.experience = 0;
    farm.isActive = true;
    farm.health = 100; // Start with full health
    farm.lastHarvestAt = new Date(); // Set initial harvest time to now

    const createdFarm = await this.farmRepository.create(farm);

    console.log(
      `🚜 [FARM CREATE] Farm "${farm.name}" created successfully at level ${farmLevel}`,
    );

    // Add XP for creating a farm
    console.log(`🎯 [FARM CREATE] Adding 100 XP to user for creating farm`);
    const xpResult = await this.userXpService.addXp(owner.id, 100);
    
    if (xpResult.leveledUp) {
      console.log(
        `🎉 [FARM CREATE] User leveled up! From level ${xpResult.previousLevel} to ${xpResult.newLevel}`,
      );
    }

    return {
      farm: createdFarm,
      purchaseResult: {
        cost: purchaseResult.cost,
        updatedUser: purchaseResult.updatedUser,
      },
      xpReward: {
        xpAdded: xpResult.xpAdded,
        leveledUp: xpResult.leveledUp,
        newLevel: xpResult.newLevel,
        xpStats: xpResult.xpStats,
      },
    };
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: GeoFilterFarmDto | null;
    sortOptions?: SortFarmDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Farm[]> {
    return this.farmRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  async findOne(id: string): Promise<Farm> {
    const farm = await this.farmRepository.findById(id);
    if (!farm) {
      throw new NotFoundException('Farm not found');
    }
    return farm;
  }

  async findNearby({
    longitude,
    latitude,
    radiusInMeters = 1000, // Default 1km radius
  }: {
    longitude: number;
    latitude: number;
    radiusInMeters?: number;
  }): Promise<Farm[]> {
    return this.farmRepository.findNearby({
      longitude,
      latitude,
      radiusInMeters,
    });
  }

  async findByOwner(ownerId: string): Promise<Farm[]> {
    return this.farmRepository.findByOwner(ownerId);
  }

  async update(
    id: string,
    updateFarmDto: UpdateFarmDto,
    currentUser: User,
  ): Promise<Farm> {
    const farm = await this.findOne(id);

    // Check if user owns the farm
    if (farm.owner.id !== currentUser.id) {
      throw new BadRequestException('You can only update your own farms');
    }

    // If location is being updated, check for nearby farms
    if (updateFarmDto.location) {
      const nearbyFarms = await this.farmRepository.findNearby({
        longitude: updateFarmDto.location.coordinates[0],
        latitude: updateFarmDto.location.coordinates[1],
        radiusInMeters: 10,
        excludeIds: [id], // Exclude current farm from check
      });

      if (nearbyFarms.length > 0) {
        throw new BadRequestException(
          'Cannot move farm here. Another farm exists within 10 meters of this location.',
        );
      }
    }

    const updatedFarm = await this.farmRepository.update(id, updateFarmDto);
    if (!updatedFarm) {
      throw new NotFoundException('Farm not found');
    }
    return updatedFarm;
  }

  async remove(
    id: string,
    currentUser: User,
  ): Promise<{
    success: boolean;
    rewardResult?: {
      reward: any;
      updatedUser: User;
    };
  }> {
    const farm = await this.findOne(id);

    // Check if user owns the farm
    if (farm.owner.id !== currentUser.id) {
      throw new BadRequestException('You can only delete your own farms');
    }

    console.log(`🗑️ [FARM DELETE] Deleting farm ${farm.name} (${id})`);

    // Calculate deletion reward before deleting
    const deletionReward = FARM_DELETION_REWARD;

    console.log(
      `💰 [FARM DELETE] Calculated deletion reward: ${deletionReward.silver} silver, ${deletionReward.gold} gold, ${deletionReward.platinum} platinum`,
    );

    // First, find and delete all walls connected to this farm
    console.log(`🗑️ [FARM DELETE] Finding walls connected to farm ${id}`);
    const connectedWalls = await this.wallRepository.findByFarm(id);
    console.log(
      `🗑️ [FARM DELETE] Found ${connectedWalls.length} walls connected to farm ${farm.name}`,
    );

    // Delete all connected walls (Note: Wall deletion rewards are handled separately in walls service)
    for (const wall of connectedWalls) {
      console.log(
        `🗑️ [FARM DELETE] Deleting wall ${wall.id} (${wall.fromFarm.name} ↔ ${wall.toFarm.name})`,
      );
      await this.wallRepository.remove(wall.id);
    }

    // Then delete the farm
    console.log(`🗑️ [FARM DELETE] Deleting farm ${farm.name}`);
    await this.farmRepository.remove(id);

    // Give deletion reward to the user
    let rewardResult;
    if (
      deletionReward.silver > 0 ||
      deletionReward.gold > 0 ||
      deletionReward.platinum > 0
    ) {
      rewardResult = await this.purchasesService.giveReward(
        currentUser.id,
        deletionReward,
        `farm deletion (${farm.name})`,
      );
    }

    console.log(
      `✅ [FARM DELETE] Successfully deleted farm ${farm.name} and ${connectedWalls.length} connected walls with reward`,
    );

    return {
      success: true,
      rewardResult: rewardResult
        ? {
            reward: rewardResult.reward,
            updatedUser: rewardResult.updatedUser,
          }
        : undefined,
    };
  }

  async harvest(
    id: string,
    currentUser: User,
    userLocation: { latitude: number; longitude: number },
  ): Promise<{
    farm: Farm;
    harvest: {
      silverEarned: number;
      goldEarned: number;
      platinumEarned: number;
      totalMinutes: number;
    };
    userCurrency: {
      platinum: number;
      gold: number;
      silver: number;
    };
  }> {
    console.log('🌾 [HARVEST] Starting harvest for farm:', id);
    console.log('👤 [HARVEST] JWT user ID:', currentUser.id);

    // Fetch fresh user data to get current currency values
    const freshUser = await this.usersService.findById(currentUser.id);
    if (!freshUser) {
      throw new BadRequestException('User not found');
    }

    console.log('👤 [HARVEST] Fresh user data:', {
      id: freshUser.id,
      email: freshUser.email,
      platinum: freshUser.platinum,
      gold: freshUser.gold,
      silver: freshUser.silver,
    });

    const farm = await this.findOne(id);

    // Determine if this is the owner or someone stealing
    const isOwner = farm.owner.id === currentUser.id;
    const isSteal = !isOwner;

    console.log('🔍 [HARVEST] Ownership check:', {
      farmOwnerId: farm.owner.id,
      currentUserId: currentUser.id,
      isOwner,
      isSteal,
    });

    // Check if user is within 40 meters of the farm
    const distance = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      farm.location.coordinates[1], // latitude
      farm.location.coordinates[0], // longitude
    );

    if (distance > 40) {
      throw new BadRequestException(
        `You must be within 40 meters of the farm to harvest. You are ${distance.toFixed(1)} meters away.`,
      );
    }

    // Check if farm is active
    if (!farm.isActive) {
      throw new BadRequestException('Cannot harvest inactive farms');
    }

    // Check if farm health is above 0
    if (farm.health <= 0) {
      throw new BadRequestException('Cannot harvest farms with no health');
    }

    // Calculate harvest
    console.log('🧮 [HARVEST] Calculating harvest...');
    const baseHarvestResult = this.farmHarvestService.calculateHarvest(farm);
    console.log(
      '💰 [HARVEST] Base harvest calculation result:',
      baseHarvestResult,
    );

    // Apply steal rate if not the owner (25% rounded down)
    let finalHarvestResult = baseHarvestResult;
    if (isSteal) {
      const stealRate = 0.25; // 25%
      finalHarvestResult = {
        ...baseHarvestResult,
        silverEarned: Math.floor(baseHarvestResult.silverEarned * stealRate),
        goldEarned: Math.floor(baseHarvestResult.goldEarned * stealRate),
        platinumEarned: Math.floor(
          baseHarvestResult.platinumEarned * stealRate,
        ),
      };
      console.log('🏴‍☠️ [HARVEST] Applied 25% steal rate:', finalHarvestResult);
    }

    // Check if there's anything to harvest
    if (
      finalHarvestResult.silverEarned === 0 &&
      finalHarvestResult.goldEarned === 0 &&
      finalHarvestResult.platinumEarned === 0
    ) {
      const action = isSteal
        ? 'steal from this farm'
        : 'harvest from this farm';
      throw new BadRequestException(`No currency available to ${action} yet`);
    }

    // Update farm's last harvest time
    console.log('🚜 [HARVEST] Updating farm lastHarvestAt...');
    farm.lastHarvestAt = baseHarvestResult.lastHarvestAt;
    const updatedFarm = await this.farmRepository.update(id, {
      lastHarvestAt: farm.lastHarvestAt,
    });
    console.log('✅ [HARVEST] Farm updated successfully');

    // Calculate new currency values using fresh user data
    const newPlatinum =
      (freshUser.platinum || 0) + finalHarvestResult.platinumEarned;
    const newGold = (freshUser.gold || 0) + finalHarvestResult.goldEarned;
    const newSilver = (freshUser.silver || 0) + finalHarvestResult.silverEarned;

    console.log('💸 [HARVEST] Updating user currency:');
    console.log(
      '  - Current platinum:',
      freshUser.platinum || 0,
      '+ earned:',
      finalHarvestResult.platinumEarned,
      '= new:',
      newPlatinum,
    );
    console.log(
      '  - Current gold:',
      freshUser.gold || 0,
      '+ earned:',
      finalHarvestResult.goldEarned,
      '= new:',
      newGold,
    );
    console.log(
      '  - Current silver:',
      freshUser.silver || 0,
      '+ earned:',
      finalHarvestResult.silverEarned,
      '= new:',
      newSilver,
    );

    // Update user's currency
    const updatedUser = await this.usersService.update(freshUser.id, {
      platinum: newPlatinum,
      gold: newGold,
      silver: newSilver,
    });

    console.log('👤 [HARVEST] Updated user result:', {
      id: updatedUser?.id,
      platinum: updatedUser?.platinum,
      gold: updatedUser?.gold,
      silver: updatedUser?.silver,
      updateReceived: !!updatedUser,
    });

    // Check if farm should be auto-deleted due to low health
    await this.checkAndRemoveUnhealthyFarms();

    const response = {
      farm: updatedFarm!,
      harvest: {
        silverEarned: finalHarvestResult.silverEarned,
        goldEarned: finalHarvestResult.goldEarned,
        platinumEarned: finalHarvestResult.platinumEarned,
        totalMinutes: finalHarvestResult.totalMinutes,
      },
      userCurrency: {
        platinum: updatedUser?.platinum || newPlatinum,
        gold: updatedUser?.gold || newGold,
        silver: updatedUser?.silver || newSilver,
      },
      isSteal, // Add flag to indicate if this was a steal
    };

    console.log('📦 [HARVEST] Final response:', response);
    return response;
  }

  /**
   * Check and remove farms with 0 health
   * This method should be called periodically or after certain events
   */
  checkAndRemoveUnhealthyFarms(): Promise<number> {
    // This is a placeholder for now - in the future you might want to:
    // 1. Add a scheduled job to check all farms
    // 2. Implement health degradation over time
    // 3. Add notifications before deletion

    // For now, we'll just return 0 since health doesn't decrease automatically yet
    return Promise.resolve(0);
  }

  async checkProximity({
    longitude,
    latitude,
    radiusInMeters = 10,
  }: {
    longitude: number;
    latitude: number;
    radiusInMeters?: number;
  }): Promise<{ hasNearbyFarms: boolean; nearbyFarms: Farm[] }> {
    const nearbyFarms = await this.farmRepository.findNearby({
      longitude,
      latitude,
      radiusInMeters,
    });

    return {
      hasNearbyFarms: nearbyFarms.length > 0,
      nearbyFarms,
    };
  }

  /**
   * Recalculate farm levels after walls are added or removed
   */
  async recalculateFarmLevelsAfterWallChange(
    affectedFarmIds: string[],
    allWalls: Wall[],
  ): Promise<void> {
    try {
      // Get all farms that might be affected
      const extendedAffectedIds = this.farmLevelService.getAffectedFarms(
        affectedFarmIds,
        allWalls,
      );

      // Get all affected farms
      const affectedFarms: Farm[] = [];
      for (const farmId of extendedAffectedIds) {
        try {
          const farm = await this.findOne(farmId);
          affectedFarms.push(farm);
        } catch (error) {
          console.error(`Error finding farm ${farmId}:`, error);
          // Continue with other farms
        }
      }

      // Calculate new levels
      const newLevels = await this.farmLevelService.recalculateFarmLevels(
        extendedAffectedIds,
        affectedFarms,
        allWalls,
      );

      // Update farms with new levels
      for (const [farmId, newLevel] of newLevels.entries()) {
        const farm = affectedFarms.find((f) => String(f.id) === String(farmId));
        if (farm && farm.level !== newLevel) {
          console.log(
            `Updating farm ${farm.name} from level ${farm.level} to level ${newLevel}`,
          );
          await this.farmRepository.update(farmId, { level: newLevel });
        }
      }
    } catch (error) {
      console.error('Error recalculating farm levels:', error);
      // Don't throw error to prevent breaking the wall operation
    }
  }

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * @returns Distance in meters
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Update farm level (for system use, bypasses ownership check)
   * Used by wall damage scheduler when walls are destroyed
   */
  async updateFarmLevel(id: string, newLevel: number): Promise<Farm> {
    // Verify farm exists
    await this.findOne(id);

    // Update the farm level
    const updatedFarm = await this.farmRepository.update(id, {
      level: newLevel,
    });

    if (!updatedFarm) {
      throw new NotFoundException('Farm not found');
    }

    return updatedFarm;
  }
}
