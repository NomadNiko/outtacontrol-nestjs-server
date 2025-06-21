import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WallsService } from '../walls.service';
import { WallHealthService } from './wall-health.service';
import { FarmLevelService } from '../../farms/services/farm-level.service';
import { FarmsService } from '../../farms/farms.service';

@Injectable()
export class WallDamageSchedulerService {
  private readonly logger = new Logger(WallDamageSchedulerService.name);

  constructor(
    private readonly wallsService: WallsService,
    private readonly wallHealthService: WallHealthService,
    private readonly farmLevelService: FarmLevelService,
    private readonly farmsService: FarmsService,
  ) {}

  /**
   * Run damage calculation every 5 minutes for testing
   * Cron expression: "0 ASTERISK/5 * * * *" (every 5 minutes)
   */
  @Cron('0 */5 * * * *')
  async applyHourlyDamage() {
    this.logger.log('🔨 Starting 5-minute wall damage calculation...');

    try {
      // Get all active walls
      const walls = await this.wallsService.findAllActive();

      if (!walls || walls.length === 0) {
        this.logger.log('No active walls found to damage');
        return;
      }

      this.logger.log(`Processing damage for ${walls.length} walls`);

      let wallsDestroyed = 0;
      let wallsDamaged = 0;
      const affectedFarmIds = new Set<string>();

      // Process each wall
      for (const wall of walls) {
        try {
          // Apply damage
          const damageResult = this.wallHealthService.applyDamage(wall);

          if (damageResult.damage > 0) {
            wallsDamaged++;

            // Handle wall destruction
            if (damageResult.isDestroyed) {
              wallsDestroyed++;

              // Add affected farms for level recalculation
              if (wall.fromFarm?.id)
                affectedFarmIds.add(String(wall.fromFarm.id));
              if (wall.toFarm?.id) affectedFarmIds.add(String(wall.toFarm.id));

              // Delete the wall through the service to ensure proper cleanup
              await this.wallsService.remove(wall.id);
              this.logger.log(
                `Wall ${wall.id} destroyed and removed due to health depletion`,
              );
            } else {
              // Update wall if not destroyed - use direct health update to avoid mapping issues
              await this.wallsService.updateHealthOnly(
                wall.id,
                damageResult.newHealth,
                new Date(),
              );
            }
          }
        } catch (error) {
          this.logger.error(`Error processing wall ${wall.id}:`, error);
        }
      }

      // Recalculate farm levels if any walls were destroyed
      if (affectedFarmIds.size > 0) {
        this.logger.log(
          `Recalculating levels for ${affectedFarmIds.size} affected farms`,
        );

        try {
          // Get all farms and walls for level recalculation
          const allFarms = await this.farmsService.findManyWithPagination({
            paginationOptions: { page: 1, limit: 1000 },
          });
          const allWalls = await this.wallsService.findAllActive();

          // Get extended list of affected farms (including neighbors)
          const extendedAffectedFarmIds =
            this.farmLevelService.getAffectedFarms(
              Array.from(affectedFarmIds),
              allWalls,
            );

          // Recalculate levels
          const newLevels = await this.farmLevelService.recalculateFarmLevels(
            extendedAffectedFarmIds,
            allFarms,
            allWalls,
          );

          // Update farm levels
          for (const [farmId, newLevel] of newLevels) {
            const farm = allFarms.find((f) => f.id === farmId);
            if (farm && farm.level !== newLevel) {
              // Update farm level without user check (system update)
              await this.farmsService.updateFarmLevel(farmId, newLevel);
              this.logger.log(
                `Farm ${farmId} level changed from ${farm.level} to ${newLevel}`,
              );
            }
          }
        } catch (error) {
          this.logger.error('Error recalculating farm levels:', error);
        }
      }

      this.logger.log(
        `✅ 5-minute damage complete: ${wallsDamaged} walls damaged, ${wallsDestroyed} walls destroyed`,
      );
    } catch (error) {
      this.logger.error('Error in 5-minute wall damage calculation:', error);
    }
  }

  /**
   * Apply damage to a specific wall (for testing or manual triggers)
   * @param wallId The wall ID to damage
   */
  async applyDamageToWall(wallId: string) {
    try {
      const wall = await this.wallsService.findOne(wallId);
      if (!wall) {
        throw new Error('Wall not found');
      }

      const damageResult = this.wallHealthService.applyDamage(wall);

      if (damageResult.isDestroyed) {
        // Delete the wall
        await this.wallsService.remove(wallId);
        return { message: 'Wall destroyed', ...damageResult };
      } else {
        // Update wall health
        const updateData: any = {
          health: damageResult.newHealth,
          lastDamageAt: new Date(),
        };

        if (damageResult.levelLost && wall.level > 1) {
          updateData.level = wall.level - 1;
        }

        await this.wallsService.update(wallId, updateData);
        return { message: 'Damage applied', ...damageResult };
      }
    } catch (error) {
      this.logger.error(`Error applying damage to wall ${wallId}:`, error);
      throw error;
    }
  }
}
