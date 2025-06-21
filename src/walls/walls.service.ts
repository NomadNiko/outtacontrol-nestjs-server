import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Wall } from './domain/wall';
import { CreateWallDto } from './dto/create-wall.dto';
import { UpdateWallDto } from './dto/update-wall.dto';
import { FilterWallDto, SortWallDto } from './dto/query-wall.dto';
import { WallRepository } from './infrastructure/persistence/wall.repository';
import { FarmsService } from '../farms/farms.service';
import { User } from '../users/domain/user';
import { WallGeometryService } from './services/wall-geometry.service';
import { WallHealthService, HealResult } from './services/wall-health.service';
import { PurchasesService } from '../purchases/purchases.service';
import { WALL_CREATION_COST, WALL_DELETION_REWARD, WALL_HEAL_COST } from '../purchases/config/purchase-costs.config';

@Injectable()
export class WallsService {
  private readonly logger = new Logger(WallsService.name);

  constructor(
    private readonly wallRepository: WallRepository,
    @Inject(forwardRef(() => FarmsService))
    private readonly farmsService: FarmsService,
    private readonly wallGeometryService: WallGeometryService,
    private readonly wallHealthService: WallHealthService,
    @Inject(forwardRef(() => PurchasesService))
    private readonly purchasesService: PurchasesService,
  ) {}

  async create(createWallDto: CreateWallDto, owner: User): Promise<{
    wall: Wall;
    loopFormed?: {
      farms: string[];
      upgraded: boolean;
    };
    purchaseResult: {
      cost: any;
      updatedUser: User;
    };
  }> {
    const { fromFarmId, toFarmId, userLocation } = createWallDto;

    // Validate that the farms are different
    if (fromFarmId === toFarmId) {
      throw new BadRequestException('Cannot create a wall connecting a farm to itself');
    }

    // Get both farms and validate ownership
    const fromFarm = await this.farmsService.findOne(fromFarmId);
    const toFarm = await this.farmsService.findOne(toFarmId);

    if (fromFarm.owner.id !== owner.id || toFarm.owner.id !== owner.id) {
      throw new BadRequestException('You can only create walls between your own farms');
    }

    // Check if user is within 40 meters of either farm
    const distanceToFromFarm = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      fromFarm.location.coordinates[1], // latitude
      fromFarm.location.coordinates[0], // longitude
    );

    const distanceToToFarm = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      toFarm.location.coordinates[1], // latitude
      toFarm.location.coordinates[0], // longitude
    );

    if (distanceToFromFarm > 40 && distanceToToFarm > 40) {
      throw new BadRequestException(
        `You must be within 40 meters of one of the farms to create a wall. You are ${distanceToFromFarm.toFixed(1)}m from ${fromFarm.name} and ${distanceToToFarm.toFixed(1)}m from ${toFarm.name}.`
      );
    }

    // Check if wall already exists between these farms
    const existingWall = await this.wallRepository.findBetweenFarms(fromFarmId, toFarmId);
    if (existingWall) {
      throw new BadRequestException('A wall already exists between these farms');
    }

    // Calculate distance and validate it's within 60 meters
    const distance = this.wallGeometryService.calculateDistance(fromFarm, toFarm);
    if (distance > 60) {
      throw new BadRequestException(
        `Distance between farms is ${distance.toFixed(1)}m. Walls can only span up to 60 meters.`
      );
    }

    // Get all existing walls to check for intersections and loops
    const existingWalls = await this.wallRepository.getAllWalls();

    // Check for wall intersections
    const wouldIntersect = this.wallGeometryService.checkWallIntersection(
      { fromFarm, toFarm },
      existingWalls
    );
    if (wouldIntersect) {
      throw new BadRequestException('This wall would intersect with an existing wall');
    }

    // Check chain length before adding (prevent chains longer than 6 without closing)
    const fromChainCheck = this.wallGeometryService.checkChainLength(fromFarmId, existingWalls);
    const toChainCheck = this.wallGeometryService.checkChainLength(toFarmId, existingWalls);
    
    if (fromChainCheck.isTooLong || toChainCheck.isTooLong) {
      throw new BadRequestException(
        'Cannot create wall: This would create a chain of 7+ connections without closing the loop. You must close an existing loop first.'
      );
    }

    // Check if this wall would create a loop
    const potentialLoop = this.wallGeometryService.detectLoop(fromFarmId, toFarmId, existingWalls);
    
    let loopResult: { farms: string[]; upgraded: boolean } | undefined;

    if (potentialLoop) {
      // Validate the loop
      const loopValidation = this.wallGeometryService.validateLoop(potentialLoop);
      if (!loopValidation.isValid) {
        throw new BadRequestException(`Cannot create loop: ${loopValidation.reason}`);
      }

      // Loop is valid, prepare for farm upgrades
      loopResult = {
        farms: potentialLoop,
        upgraded: false, // Will be set to true after upgrades
      };
    }

    // Calculate and process purchase cost
    const wallCost = WALL_CREATION_COST;
    
    console.log(`💰 [WALL CREATE] Processing purchase for wall creation - Distance: ${distance.toFixed(1)}m, Cost: ${wallCost.silver} silver, ${wallCost.gold} gold, ${wallCost.platinum} platinum`);
    
    // Make the purchase (this will validate funds and deduct currency)
    const purchaseResult = await this.purchasesService.makePurchase(
      owner.id,
      wallCost,
      'wall creation'
    );

    console.log(`✅ [WALL CREATE] Purchase successful, creating wall...`);

    // Create the wall
    const wall = new Wall();
    wall.fromFarm = fromFarm;
    wall.toFarm = toFarm;
    wall.owner = owner;
    wall.distance = distance;
    wall.isActive = true;
    wall.health = 100; // Start with full health
    wall.level = 1; // All walls start at level 1

    const createdWall = await this.wallRepository.create(wall);

    // Recalculate farm levels after wall creation
    try {
      const allWallsAfterCreation = await this.wallRepository.getAllWalls();
      await this.farmsService.recalculateFarmLevelsAfterWallChange(
        [String(fromFarmId), String(toFarmId)],
        allWallsAfterCreation
      );
      
      if (loopResult) {
        loopResult.upgraded = true;
      }
    } catch (error) {
      console.error('Error recalculating farm levels after wall creation:', error);
      // Don't fail the wall creation if level calculation fails
    }

    return {
      wall: createdWall,
      loopFormed: loopResult,
      purchaseResult: {
        cost: purchaseResult.cost,
        updatedUser: purchaseResult.updatedUser,
      },
    };
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterWallDto | null;
    sortOptions?: SortWallDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Wall[]> {
    return this.wallRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  async findOne(id: string): Promise<Wall> {
    const wall = await this.wallRepository.findById(id);
    if (!wall) {
      throw new NotFoundException('Wall not found');
    }
    return wall;
  }

  async findByOwner(ownerId: string): Promise<Wall[]> {
    return this.wallRepository.findByOwner(ownerId);
  }

  async findByFarm(farmId: string): Promise<Wall[]> {
    return this.wallRepository.findByFarm(farmId);
  }

  async update(id: string, updateWallDto: UpdateWallDto, currentUser?: User): Promise<Wall> {
    const wall = await this.findOne(id);
    
    // Check if user owns the wall (if currentUser is provided)
    if (currentUser && wall.owner.id !== currentUser.id) {
      throw new BadRequestException('You can only update your own walls');
    }

    // Update the wall with provided data
    Object.assign(wall, updateWallDto);
    const updatedWall = await this.wallRepository.update(id, wall);
    
    if (!updatedWall) {
      throw new NotFoundException('Failed to update wall');
    }
    
    return updatedWall;
  }

  async remove(id: string, currentUser?: User): Promise<{
    success: boolean;
    rewardResult?: {
      reward: any;
      updatedUser: User;
    };
  }> {
    const wall = await this.findOne(id);
    
    // Check if user owns the wall (if currentUser is provided)
    if (currentUser && wall.owner.id !== currentUser.id) {
      throw new BadRequestException('You can only delete your own walls');
    }

    console.log(`🗑️ [WALL DELETE] Deleting wall ${id} between ${wall.fromFarm.name} and ${wall.toFarm.name}`);

    // Calculate deletion reward before deleting
    const deletionReward = WALL_DELETION_REWARD;
    
    console.log(`💰 [WALL DELETE] Calculated deletion reward: ${deletionReward.silver} silver, ${deletionReward.gold} gold, ${deletionReward.platinum} platinum`);

    // Store affected farm IDs before deletion
    const affectedFarmIds = [String(wall.fromFarm.id), String(wall.toFarm.id)];

    await this.wallRepository.remove(id);

    // Give deletion reward to the user
    let rewardResult;
    if (currentUser && (deletionReward.silver > 0 || deletionReward.gold > 0 || deletionReward.platinum > 0)) {
      rewardResult = await this.purchasesService.giveReward(
        currentUser.id,
        deletionReward,
        `wall deletion (${wall.fromFarm.name} ↔ ${wall.toFarm.name})`
      );
    }

    // Recalculate farm levels after wall removal
    try {
      const allWallsAfterRemoval = await this.wallRepository.getAllWalls();
      await this.farmsService.recalculateFarmLevelsAfterWallChange(
        affectedFarmIds,
        allWallsAfterRemoval
      );
    } catch (error) {
      console.error('Error recalculating farm levels after wall removal:', error);
      // Don't fail the wall deletion if level calculation fails
    }

    console.log(`✅ [WALL DELETE] Successfully deleted wall with reward`);
    
    return {
      success: true,
      rewardResult: rewardResult ? {
        reward: rewardResult.reward,
        updatedUser: rewardResult.updatedUser,
      } : undefined,
    };
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
   * Heal a wall by 25% of its maximum health
   * @param wallId The wall ID to heal
   * @param currentUser The user attempting to heal
   * @param userLocation The user's current location
   * @returns HealResult with healing details
   */
  async healWall(
    wallId: string,
    currentUser: User,
    userLocation: { latitude: number; longitude: number }
  ): Promise<HealResult> {
    try {
      const wall = await this.findOne(wallId);

      // Validate wall data
      if (!wall) {
        throw new BadRequestException('Wall not found');
      }

      if (!wall.owner || !wall.owner.id) {
        throw new BadRequestException('Wall owner information is missing');
      }

      // Check if user owns the wall
      if (wall.owner.id !== currentUser.id) {
        throw new BadRequestException('You can only heal your own walls');
      }

      // Validate farm data
      if (!wall.fromFarm || !wall.fromFarm.location || !wall.fromFarm.location.coordinates) {
        throw new BadRequestException('From farm location data is missing');
      }

      if (!wall.toFarm || !wall.toFarm.location || !wall.toFarm.location.coordinates) {
        throw new BadRequestException('To farm location data is missing');
      }

      // Validate coordinate arrays
      if (!Array.isArray(wall.fromFarm.location.coordinates) || wall.fromFarm.location.coordinates.length < 2) {
        throw new BadRequestException('From farm coordinates are invalid');
      }

      if (!Array.isArray(wall.toFarm.location.coordinates) || wall.toFarm.location.coordinates.length < 2) {
        throw new BadRequestException('To farm coordinates are invalid');
      }

      // Check if user is within 40 meters of either connected farm
      const distanceToFromFarm = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        wall.fromFarm.location.coordinates[1], // latitude
        wall.fromFarm.location.coordinates[0], // longitude
      );

      const distanceToToFarm = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        wall.toFarm.location.coordinates[1], // latitude
        wall.toFarm.location.coordinates[0], // longitude
      );

      if (distanceToFromFarm > 40 && distanceToToFarm > 40) {
        throw new BadRequestException(
          `You must be within 40 meters of one of the connected farms to heal this wall. ` +
          `You are ${distanceToFromFarm.toFixed(1)}m from ${wall.fromFarm.name} and ` +
          `${distanceToToFarm.toFixed(1)}m from ${wall.toFarm.name}.`
        );
      }

      // Check if wall can be healed
      if (!this.wallHealthService.canHeal(wall)) {
        if (wall.health >= 100) {
          throw new BadRequestException('Wall is already at full health');
        }
        
        const minutesRemaining = this.wallHealthService.getTimeUntilNextHeal(wall);
        throw new BadRequestException(
          `You can heal this wall again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}`
        );
      }

      // Process payment for healing before applying the heal
      const healCost = WALL_HEAL_COST;
      
      console.log(`💰 [WALL HEAL] Processing payment for wall healing - Cost: ${healCost.silver} silver, ${healCost.gold} gold, ${healCost.platinum} platinum`);
      
      // Make the purchase (this will validate funds and deduct currency)
      const purchaseResult = await this.purchasesService.makePurchase(
        currentUser.id,
        healCost,
        `wall healing (${wall.fromFarm.name} ↔ ${wall.toFarm.name})`
      );

      console.log(`✅ [WALL HEAL] Payment successful, applying healing...`);

      // Apply healing
      const healResult = this.wallHealthService.healWall(wall);

      // Update wall health and lastHealAt
      await this.update(wallId, {
        health: healResult.newHealth,
        lastHealAt: new Date(),
      });

      return healResult;
    } catch (error) {
      this.logger.error(`Error healing wall ${wallId}:`, error);
      
      // If it's already a BadRequestException, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // For any other error, throw a generic internal server error
      throw new BadRequestException('Failed to heal wall. Please try again.');
    }
  }

  /**
   * Get all active walls (not deleted and health > 0)
   * @returns Array of active walls
   */
  async findAllActive(): Promise<Wall[]> {
    return this.wallRepository.findAllActive();
  }

  /**
   * Update only health-related fields without full domain mapping
   * Used by scheduler to avoid mapping issues with unpopulated references
   */
  async updateHealthOnly(id: string, health: number, lastDamageAt?: Date, level?: number): Promise<void> {
    return this.wallRepository.updateHealthOnly(id, health, lastDamageAt, level);
  }
}