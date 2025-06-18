import { Injectable } from '@nestjs/common';
import { Farm } from '../domain/farm';
import { Wall } from '../../walls/domain/wall';

@Injectable()
export class FarmLevelService {
  /**
   * Calculate the appropriate level for a farm based on its connections
   * Level 1: Basic farm
   * Level 2: Village (farm is part of a closed loop of 3+ farms)
   * Level 3: Town (farm is part of 2 different villages)
   * Level 4: City (farm is part of 4+ different villages)
   */
  calculateFarmLevel(farm: Farm, allWalls: Wall[]): number {
    console.log(`🏘️ [LEVEL] Calculating level for farm: ${farm.name} (${farm.id})`);
    
    // Get all walls connected to this farm
    const connectedWalls = allWalls.filter(wall => {
      if (!wall.fromFarm || !wall.toFarm || !wall.fromFarm.id || !wall.toFarm.id) {
        return false;
      }
      return String(wall.fromFarm.id) === String(farm.id) || String(wall.toFarm.id) === String(farm.id);
    });

    console.log(`🏘️ [LEVEL] Found ${connectedWalls.length} connected walls for farm ${farm.name}`);
    
    if (connectedWalls.length === 0) {
      console.log(`🏘️ [LEVEL] Farm ${farm.name} has no connections - level 1`);
      return 1; // No connections, basic farm
    }

    // Find all villages (closed loops) that this farm participates in
    const villages = this.findVillagesForFarm(farm, allWalls);
    
    console.log(`🏘️ [LEVEL] Farm ${farm.name} participates in ${villages.length} villages/loops`);
    
    if (villages.length === 0) {
      console.log(`🏘️ [LEVEL] Farm ${farm.name} not part of any closed loops - level 1`);
      return 1; // Not part of any closed loops
    }

    if (villages.length === 1) {
      console.log(`🏘️ [LEVEL] Farm ${farm.name} part of 1 village - level 2`);
      return 2; // Part of one village
    }

    if (villages.length === 2) {
      console.log(`🏘️ [LEVEL] Farm ${farm.name} part of 2 villages - level 3 (town)`);
      return 3; // Part of two villages (town)
    }

    console.log(`🏘️ [LEVEL] Farm ${farm.name} part of ${villages.length} villages - level 4 (city)`);
    return 4; // Part of 3+ villages (city)
  }

  /**
   * Find all villages (closed loops) that a specific farm participates in
   */
  private findVillagesForFarm(targetFarm: Farm, allWalls: Wall[]): Farm[][] {
    console.log(`🔍 [VILLAGE] Finding villages for farm: ${targetFarm.name} (${targetFarm.id})`);
    const villages: Farm[][] = [];
    const visited = new Set<string>();

    // Build adjacency graph
    const graph = new Map<string, Farm[]>();
    for (const wall of allWalls) {
      if (!wall.fromFarm || !wall.toFarm || !wall.fromFarm.id || !wall.toFarm.id) {
        continue;
      }
      
      const fromId = String(wall.fromFarm.id);
      const toId = String(wall.toFarm.id);
      
      if (!graph.has(fromId)) graph.set(fromId, []);
      if (!graph.has(toId)) graph.set(toId, []);
      
      graph.get(fromId)!.push(wall.toFarm);
      graph.get(toId)!.push(wall.fromFarm);
    }

    const targetId = String(targetFarm.id);
    const neighbors = graph.get(targetId) || [];
    
    console.log(`🔍 [VILLAGE] Found ${neighbors.length} direct neighbors for ${targetFarm.name}: ${neighbors.map(f => f.name).join(', ')}`);

    // For each neighbor, try to find cycles back to target farm
    for (const neighbor of neighbors) {
      console.log(`🔍 [VILLAGE] Exploring path starting from ${targetFarm.name} -> ${neighbor.name}`);
      const cycles = this.findCyclesFromNode(targetFarm, neighbor, graph, [targetFarm]);
      
      for (const cycle of cycles) {
        if (cycle.length >= 3) {
          const villageKey = this.getVillageKey(cycle);
          console.log(`✅ [VILLAGE] Found valid cycle: ${cycle.map(f => f.name).join(' -> ')}`);
          if (!visited.has(villageKey)) {
            villages.push([...cycle]);
            visited.add(villageKey);
            console.log(`✅ [VILLAGE] Added new village with ${cycle.length} farms`);
          } else {
            console.log(`⚠️ [VILLAGE] Village already found (duplicate)`);
          }
        } else {
          console.log(`❌ [VILLAGE] Cycle too small (${cycle.length} farms)`);
        }
      }
    }

    console.log(`🔍 [VILLAGE] Total villages found for ${targetFarm.name}: ${villages.length}`);
    return villages;
  }

  /**
   * Find all cycles starting from a target farm through a neighbor
   */
  private findCyclesFromNode(
    targetFarm: Farm,
    currentFarm: Farm,
    graph: Map<string, Farm[]>,
    currentPath: Farm[]
  ): Farm[][] {
    const cycles: Farm[][] = [];
    
    // Prevent infinite loops
    if (currentPath.length > 6) {
      return cycles;
    }

    const currentId = String(currentFarm.id);
    const targetId = String(targetFarm.id);
    const neighbors = graph.get(currentId) || [];

    console.log(`🚶 [CYCLE] At ${currentFarm.name}, path: ${currentPath.map(f => f.name).join(' -> ')}, neighbors: ${neighbors.map(f => f.name).join(', ')}`);

    for (const neighbor of neighbors) {
      const neighborId = String(neighbor.id);
      
      // If we found the target farm, we have a cycle
      if (neighborId === targetId && currentPath.length >= 2) {
        const cycle = [...currentPath, currentFarm];
        console.log(`🎯 [CYCLE] Found cycle: ${cycle.map(f => f.name).join(' -> ')} -> ${targetFarm.name}`);
        cycles.push(cycle);
        continue;
      }

      // If we've already visited this farm, skip it
      if (currentPath.some(farm => String(farm.id) === neighborId)) {
        continue;
      }

      // Continue exploring
      const subCycles = this.findCyclesFromNode(
        targetFarm,
        neighbor,
        graph,
        [...currentPath, currentFarm]
      );
      cycles.push(...subCycles);
    }

    return cycles;
  }

  /**
   * Find a path from start farm back to target farm
   */
  private findPathBackToFarm(
    currentFarm: Farm, 
    targetFarm: Farm, 
    allWalls: Wall[], 
    currentPath: Farm[]
  ): Farm[] | null {
    const pathStr = currentPath.map(f => f.name).join(' -> ');
    console.log(`🚶 [PATH] At ${currentFarm.name}, path so far: ${pathStr}, looking for ${targetFarm.name}`);
    
    // Prevent infinite loops
    if (currentPath.length > 6) {
      console.log(`🚶 [PATH] Path too long (${currentPath.length}), stopping`);
      return null;
    }

    // Check if we can get back to target farm directly
    const directConnection = allWalls.find(wall => {
      if (!wall.fromFarm || !wall.toFarm || !wall.fromFarm.id || !wall.toFarm.id) {
        return false;
      }
      return (String(wall.fromFarm.id) === String(currentFarm.id) && String(wall.toFarm.id) === String(targetFarm.id)) ||
             (String(wall.toFarm.id) === String(currentFarm.id) && String(wall.fromFarm.id) === String(targetFarm.id));
    });

    if (directConnection) {
      const completePath = [...currentPath, currentFarm];
      console.log(`🎯 [PATH] Found direct connection! Complete path: ${completePath.map(f => f.name).join(' -> ')}`);
      
      // Only return the path if it forms a loop of at least 3 farms
      if (completePath.length >= 3) {
        console.log(`✅ [PATH] Valid loop found with ${completePath.length} farms`);
        return completePath;
      } else {
        console.log(`❌ [PATH] Loop too small (${completePath.length} farms), need at least 3`);
        return null;
      }
    }

    // Try to continue the path through other farms
    const connectedWalls = allWalls.filter(wall => {
      if (!wall.fromFarm || !wall.toFarm || !wall.fromFarm.id || !wall.toFarm.id) {
        return false;
      }
      
      const isConnectedToCurrentFarm = String(wall.fromFarm.id) === String(currentFarm.id) || String(wall.toFarm.id) === String(currentFarm.id);
      if (!isConnectedToCurrentFarm) return false;

      // Get the other farm (not the current one)
      const otherFarm = String(wall.fromFarm.id) === String(currentFarm.id) ? wall.toFarm : wall.fromFarm;
      
      // Only exclude if the other farm has already been visited (to prevent smaller loops)
      const alreadyVisited = currentPath.some(farm => String(farm.id) === String(otherFarm.id));
      
      console.log(`🚶 [PATH] Checking wall to ${otherFarm.name}: ${alreadyVisited ? 'SKIP (already visited)' : 'OK'}`);
      
      return !alreadyVisited;
    });

    console.log(`🚶 [PATH] Found ${connectedWalls.length} possible next walls from ${currentFarm.name}`);

    for (const wall of connectedWalls) {
      const nextFarm = String(wall.fromFarm.id) === String(currentFarm.id) 
        ? wall.toFarm 
        : wall.fromFarm;

      console.log(`🚶 [PATH] Trying to continue from ${currentFarm.name} to ${nextFarm.name}`);

      const result = this.findPathBackToFarm(
        nextFarm, 
        targetFarm, 
        allWalls, 
        [...currentPath, currentFarm]
      );

      if (result) {
        console.log(`✅ [PATH] Found path through ${nextFarm.name}!`);
        return result;
      } else {
        console.log(`❌ [PATH] No path found through ${nextFarm.name}`);
      }
    }

    console.log(`❌ [PATH] No valid paths found from ${currentFarm.name}`);
    return null;
  }

  /**
   * Generate a unique key for a village (sorted farm IDs)
   */
  private getVillageKey(farms: Farm[]): string {
    return farms
      .map(farm => String(farm.id))
      .sort()
      .join(',');
  }

  /**
   * Recalculate levels for all affected farms when walls change
   */
  async recalculateFarmLevels(
    affectedFarmIds: string[], 
    allFarms: Farm[], 
    allWalls: Wall[]
  ): Promise<Map<string, number>> {
    const newLevels = new Map<string, number>();

    for (const farmId of affectedFarmIds) {
      const farm = allFarms.find(f => String(f.id) === String(farmId));
      if (farm) {
        const newLevel = this.calculateFarmLevel(farm, allWalls);
        newLevels.set(String(farmId), newLevel);
      }
    }

    return newLevels;
  }

  /**
   * Get all farms that might be affected by a wall change
   * This includes the direct farms and their neighbors up to 2 degrees
   */
  getAffectedFarms(directFarmIds: string[], allWalls: Wall[]): string[] {
    const affected = new Set<string>(directFarmIds);

    // Add immediate neighbors
    for (const farmId of directFarmIds) {
      const neighborWalls = allWalls.filter(wall => 
        String(wall.fromFarm.id) === String(farmId) || String(wall.toFarm.id) === String(farmId)
      );

      for (const wall of neighborWalls) {
        affected.add(String(wall.fromFarm.id));
        affected.add(String(wall.toFarm.id));
      }
    }

    // Add second-degree neighbors (neighbors of neighbors)
    const firstDegree = Array.from(affected);
    for (const farmId of firstDegree) {
      const neighborWalls = allWalls.filter(wall => 
        String(wall.fromFarm.id) === String(farmId) || String(wall.toFarm.id) === String(farmId)
      );

      for (const wall of neighborWalls) {
        affected.add(String(wall.fromFarm.id));
        affected.add(String(wall.toFarm.id));
      }
    }

    return Array.from(affected);
  }
}