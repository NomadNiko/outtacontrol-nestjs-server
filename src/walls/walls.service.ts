import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
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

@Injectable()
export class WallsService {
  constructor(
    private readonly wallRepository: WallRepository,
    @Inject(forwardRef(() => FarmsService))
    private readonly farmsService: FarmsService,
    private readonly wallGeometryService: WallGeometryService,
    private readonly wallHealthService: WallHealthService,
  ) {}

  async create(createWallDto: CreateWallDto, owner: User): Promise<{
    wall: Wall;
    loopFormed?: {
      farms: string[];
      upgraded: boolean;
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

  async remove(id: string, currentUser?: User): Promise<void> {
    const wall = await this.findOne(id);
    
    // Check if user owns the wall (if currentUser is provided)
    if (currentUser && wall.owner.id !== currentUser.id) {
      throw new BadRequestException('You can only delete your own walls');
    }

    // Store affected farm IDs before deletion
    const affectedFarmIds = [String(wall.fromFarm.id), String(wall.toFarm.id)];

    await this.wallRepository.remove(id);

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
    const wall = await this.findOne(wallId);

    // Check if user owns the wall
    if (wall.owner.id !== currentUser.id) {
      throw new BadRequestException('You can only heal your own walls');
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

    // Apply healing
    const healResult = this.wallHealthService.healWall(wall);

    // Update wall health and lastHealAt
    await this.update(wallId, {
      health: healResult.newHealth,
      lastHealAt: new Date(),
    });

    return healResult;
  }

  /**
   * Get all active walls (not deleted and health > 0)
   * @returns Array of active walls
   */
  async findAllActive(): Promise<Wall[]> {
    return this.wallRepository.findAllActive();
  }
}