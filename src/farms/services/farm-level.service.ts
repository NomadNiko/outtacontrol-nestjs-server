import { Injectable } from '@nestjs/common';
import { Farm } from '../domain/farm';
import { Wall } from '../../walls/domain/wall';

@Injectable()
export class FarmLevelService {
  /**
   * Calculate the appropriate level for a farm based on its connections
   * Level 1: Basic farm (no connections or part of open chains)
   * Level 2: Village (farm is part of exactly one closed triangle)
   * Level 3: Town (farm is part of exactly two closed triangles)
   * Level 4: City (farm is part of three closed triangles)
   * Level 5: Metropolis (farm is part of four closed triangles)
   * Level 6: Megacity (farm is part of five or more closed triangles)
   */
  calculateFarmLevel(farm: Farm, allWalls: Wall[]): number {
    console.log(
      `🏘️ [LEVEL] Calculating level for farm: ${farm.name} (${farm.id})`,
    );

    // Get all walls connected to this farm
    const connectedWalls = allWalls.filter((wall) => {
      if (
        !wall.fromFarm ||
        !wall.toFarm ||
        !wall.fromFarm.id ||
        !wall.toFarm.id
      ) {
        return false;
      }
      return (
        String(wall.fromFarm.id) === String(farm.id) ||
        String(wall.toFarm.id) === String(farm.id)
      );
    });

    console.log(
      `🏘️ [LEVEL] Found ${connectedWalls.length} connected walls for farm ${farm.name}`,
    );

    if (connectedWalls.length === 0) {
      console.log(`🏘️ [LEVEL] Farm ${farm.name} has no connections - level 1`);
      return 1; // No connections, basic farm
    }

    if (connectedWalls.length < 2) {
      console.log(
        `🏘️ [LEVEL] Farm ${farm.name} has only 1 connection (can't form triangles) - level 1`,
      );
      return 1; // Can't form triangles with less than 2 connections
    }

    // Find all triangles that this farm participates in
    const triangles = this.findTrianglesForFarm(farm, allWalls);

    console.log(
      `🏘️ [LEVEL] Farm ${farm.name} participates in ${triangles.length} triangles`,
    );

    // Return level based on number of triangles
    const level = Math.min(6, Math.max(1, triangles.length + 1));
    console.log(`🏘️ [LEVEL] Farm ${farm.name} final level: ${level}`);

    return level;
  }

  /**
   * Find all triangles (3-farm closed loops) that a specific farm participates in
   */
  private findTrianglesForFarm(targetFarm: Farm, allWalls: Wall[]): Farm[][] {
    console.log(
      `🔍 [TRIANGLE] Finding triangles for farm: ${targetFarm.name} (${targetFarm.id})`,
    );
    const triangles: Farm[][] = [];
    const visited = new Set<string>();

    // Build adjacency list for this farm's neighbors
    const neighbors = this.getFarmNeighbors(targetFarm, allWalls);

    console.log(
      `🔍 [TRIANGLE] Found ${neighbors.length} neighbors for ${targetFarm.name}: ${neighbors.map((f) => f.name).join(', ')}`,
    );

    // Check all pairs of neighbors to see if they form triangles with the target farm
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const neighbor1 = neighbors[i];
        const neighbor2 = neighbors[j];

        // Check if neighbor1 and neighbor2 are connected (forming a triangle)
        const areConnected = this.areFarmsConnected(
          neighbor1,
          neighbor2,
          allWalls,
        );

        if (areConnected) {
          const triangle = [targetFarm, neighbor1, neighbor2];
          const triangleKey = this.getTriangleKey(triangle);

          if (!visited.has(triangleKey)) {
            triangles.push(triangle);
            visited.add(triangleKey);
            console.log(
              `✅ [TRIANGLE] Found triangle: ${triangle.map((f) => f.name).join(' - ')}`,
            );
          }
        }
      }
    }

    console.log(
      `🔍 [TRIANGLE] Total triangles found for ${targetFarm.name}: ${triangles.length}`,
    );
    return triangles;
  }

  /**
   * Get all direct neighbors of a farm
   */
  private getFarmNeighbors(farm: Farm, allWalls: Wall[]): Farm[] {
    const neighbors: Farm[] = [];

    for (const wall of allWalls) {
      if (
        !wall.fromFarm ||
        !wall.toFarm ||
        !wall.fromFarm.id ||
        !wall.toFarm.id
      ) {
        continue;
      }

      if (String(wall.fromFarm.id) === String(farm.id)) {
        neighbors.push(wall.toFarm);
      } else if (String(wall.toFarm.id) === String(farm.id)) {
        neighbors.push(wall.fromFarm);
      }
    }

    return neighbors;
  }

  /**
   * Check if two farms are directly connected by a wall
   */
  private areFarmsConnected(
    farm1: Farm,
    farm2: Farm,
    allWalls: Wall[],
  ): boolean {
    return allWalls.some((wall) => {
      if (
        !wall.fromFarm ||
        !wall.toFarm ||
        !wall.fromFarm.id ||
        !wall.toFarm.id
      ) {
        return false;
      }

      const farm1Id = String(farm1.id);
      const farm2Id = String(farm2.id);
      const fromId = String(wall.fromFarm.id);
      const toId = String(wall.toFarm.id);

      return (
        (fromId === farm1Id && toId === farm2Id) ||
        (fromId === farm2Id && toId === farm1Id)
      );
    });
  }

  /**
   * Generate a unique key for a triangle (sorted farm IDs)
   */
  private getTriangleKey(farms: Farm[]): string {
    return farms
      .map((farm) => String(farm.id))
      .sort()
      .join(',');
  }

  /**
   * Recalculate levels for all affected farms when walls change
   */
  recalculateFarmLevels(
    affectedFarmIds: string[],
    allFarms: Farm[],
    allWalls: Wall[],
  ): Promise<Map<string, number>> {
    const newLevels = new Map<string, number>();

    for (const farmId of affectedFarmIds) {
      const farm = allFarms.find((f) => String(f.id) === String(farmId));
      if (farm) {
        const newLevel = this.calculateFarmLevel(farm, allWalls);
        newLevels.set(String(farmId), newLevel);
      }
    }

    return Promise.resolve(newLevels);
  }

  /**
   * Get all farms that might be affected by a wall change
   * This includes the direct farms and their neighbors up to 2 degrees
   */
  getAffectedFarms(directFarmIds: string[], allWalls: Wall[]): string[] {
    const affected = new Set<string>(directFarmIds);

    // Add immediate neighbors
    for (const farmId of directFarmIds) {
      const neighborWalls = allWalls.filter(
        (wall) =>
          String(wall.fromFarm.id) === String(farmId) ||
          String(wall.toFarm.id) === String(farmId),
      );

      for (const wall of neighborWalls) {
        affected.add(String(wall.fromFarm.id));
        affected.add(String(wall.toFarm.id));
      }
    }

    // Add second-degree neighbors (neighbors of neighbors)
    const firstDegree = Array.from(affected);
    for (const farmId of firstDegree) {
      const neighborWalls = allWalls.filter(
        (wall) =>
          String(wall.fromFarm.id) === String(farmId) ||
          String(wall.toFarm.id) === String(farmId),
      );

      for (const wall of neighborWalls) {
        affected.add(String(wall.fromFarm.id));
        affected.add(String(wall.toFarm.id));
      }
    }

    return Array.from(affected);
  }
}
