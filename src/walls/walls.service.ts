import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Wall } from './domain/wall';
import { CreateWallDto } from './dto/create-wall.dto';
import { UpdateWallDto } from './dto/update-wall.dto';
import { FilterWallDto, SortWallDto } from './dto/query-wall.dto';
import { WallRepository } from './infrastructure/persistence/wall.repository';
import { FarmsService } from '../farms/farms.service';
import { User } from '../users/domain/user';
import { WallGeometryService } from './services/wall-geometry.service';

@Injectable()
export class WallsService {
  constructor(
    private readonly wallRepository: WallRepository,
    private readonly farmsService: FarmsService,
    private readonly wallGeometryService: WallGeometryService,
  ) {}

  async create(createWallDto: CreateWallDto, owner: User): Promise<{
    wall: Wall;
    loopFormed?: {
      farms: string[];
      upgraded: boolean;
    };
  }> {
    const { fromFarmId, toFarmId } = createWallDto;

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

    const createdWall = await this.wallRepository.create(wall);

    // If a loop was formed, upgrade the farms
    if (loopResult) {
      try {
        await this.upgradeFarmsInLoop(loopResult.farms);
        loopResult.upgraded = true;
      } catch (error) {
        console.error('Error upgrading farms in loop:', error);
        // Don't fail the wall creation if upgrade fails
      }
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

  async update(id: string, updateWallDto: UpdateWallDto, currentUser: User): Promise<Wall> {
    const wall = await this.findOne(id);
    
    // Check if user owns the wall
    if (wall.owner.id !== currentUser.id) {
      throw new BadRequestException('You can only update your own walls');
    }

    // For now, walls are not updatable after creation due to complexity
    // of re-validating geometry and loops
    throw new BadRequestException('Walls cannot be updated after creation');
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const wall = await this.findOne(id);
    
    // Check if user owns the wall
    if (wall.owner.id !== currentUser.id) {
      throw new BadRequestException('You can only delete your own walls');
    }

    await this.wallRepository.remove(id);

    // TODO: Implement logic to downgrade farms if removing this wall breaks a loop
    // This is complex and should be implemented in a future iteration
  }

  private async upgradeFarmsInLoop(farmIds: string[]): Promise<void> {
    // Upgrade all farms in the loop to level 2
    for (const farmId of farmIds) {
      try {
        const farm = await this.farmsService.findOne(farmId);
        if (farm.level === 1) {
          // Update farm to level 2
          await this.farmsService.update(farmId, { level: 2 }, farm.owner);
        }
      } catch (error) {
        console.error(`Error upgrading farm ${farmId}:`, error);
        // Continue with other farms even if one fails
      }
    }
  }
}