import { Injectable } from '@nestjs/common';
import { Farm } from '../../farms/domain/farm';
import { Wall } from '../domain/wall';

interface Point {
  lat: number;
  lng: number;
}

interface LineSegment {
  start: Point;
  end: Point;
}

@Injectable()
export class WallGeometryService {
  /**
   * Calculate distance between two farms using Haversine formula
   */
  calculateDistance(farm1: Farm, farm2: Farm): number {
    const lat1 = farm1.location.coordinates[1];
    const lng1 = farm1.location.coordinates[0];
    const lat2 = farm2.location.coordinates[1];
    const lng2 = farm2.location.coordinates[0];

    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Check if two line segments intersect
   */
  doLinesIntersect(line1: LineSegment, line2: LineSegment): boolean {
    const { start: p1, end: q1 } = line1;
    const { start: p2, end: q2 } = line2;

    // Find the four orientations needed for general and special cases
    const o1 = this.orientation(p1, q1, p2);
    const o2 = this.orientation(p1, q1, q2);
    const o3 = this.orientation(p2, q2, p1);
    const o4 = this.orientation(p2, q2, q1);

    // General case
    if (o1 !== o2 && o3 !== o4) return true;

    // Special Cases
    // p1, q1 and p2 are colinear and p2 lies on segment p1q1
    if (o1 === 0 && this.onSegment(p1, p2, q1)) return true;

    // p1, q1 and q2 are colinear and q2 lies on segment p1q1
    if (o2 === 0 && this.onSegment(p1, q2, q1)) return true;

    // p2, q2 and p1 are colinear and p1 lies on segment p2q2
    if (o3 === 0 && this.onSegment(p2, p1, q2)) return true;

    // p2, q2 and q1 are colinear and q1 lies on segment p2q2
    if (o4 === 0 && this.onSegment(p2, q1, q2)) return true;

    return false; // Doesn't fall in any of the above cases
  }

  /**
   * Check if a new wall would intersect with existing walls
   */
  checkWallIntersection(newWall: { fromFarm: Farm; toFarm: Farm }, existingWalls: Wall[]): boolean {
    const newLine: LineSegment = {
      start: {
        lat: newWall.fromFarm.location.coordinates[1],
        lng: newWall.fromFarm.location.coordinates[0],
      },
      end: {
        lat: newWall.toFarm.location.coordinates[1],
        lng: newWall.toFarm.location.coordinates[0],
      },
    };

    for (const wall of existingWalls) {
      // Skip if the walls share a farm (they can connect at endpoints)
      if (
        wall.fromFarm.id === newWall.fromFarm.id ||
        wall.fromFarm.id === newWall.toFarm.id ||
        wall.toFarm.id === newWall.fromFarm.id ||
        wall.toFarm.id === newWall.toFarm.id
      ) {
        continue;
      }

      const existingLine: LineSegment = {
        start: {
          lat: wall.fromFarm.location.coordinates[1],
          lng: wall.fromFarm.location.coordinates[0],
        },
        end: {
          lat: wall.toFarm.location.coordinates[1],
          lng: wall.toFarm.location.coordinates[0],
        },
      };

      if (this.doLinesIntersect(newLine, existingLine)) {
        return true; // Intersection found
      }
    }

    return false; // No intersections
  }

  /**
   * Detect if adding a wall would create a loop, and return the loop if found
   */
  detectLoop(fromFarmId: string, toFarmId: string, existingWalls: Wall[]): string[] | null {
    // Build adjacency list
    const graph = new Map<string, Set<string>>();
    
    // Add existing walls to graph
    for (const wall of existingWalls) {
      const fromId = String(wall.fromFarm.id);
      const toId = String(wall.toFarm.id);
      
      if (!graph.has(fromId)) {
        graph.set(fromId, new Set());
      }
      if (!graph.has(toId)) {
        graph.set(toId, new Set());
      }
      
      graph.get(fromId)!.add(toId);
      graph.get(toId)!.add(fromId);
    }

    // Try to find path from toFarmId to fromFarmId using existing connections
    const path = this.findPath(toFarmId, fromFarmId, graph);
    
    if (path) {
      // Adding the new wall would complete a loop
      return [...path, fromFarmId]; // Complete the loop
    }

    return null; // No loop would be formed
  }

  /**
   * Validate loop constraints (3-6 farms, max 7 connections without closing)
   */
  validateLoop(loop: string[]): { isValid: boolean; reason?: string } {
    const loopSize = loop.length;

    if (loopSize < 3) {
      return { isValid: false, reason: 'Loop must have at least 3 farms' };
    }

    if (loopSize > 6) {
      return { isValid: false, reason: 'Loop cannot have more than 6 farms' };
    }

    return { isValid: true };
  }

  /**
   * Check if a chain of connections is getting too long without closing
   */
  checkChainLength(farmId: string, existingWalls: Wall[]): { isTooLong: boolean; chainLength: number } {
    // Build adjacency list
    const graph = new Map<string, Set<string>>();
    
    for (const wall of existingWalls) {
      const fromId = String(wall.fromFarm.id);
      const toId = String(wall.toFarm.id);
      
      if (!graph.has(fromId)) {
        graph.set(fromId, new Set());
      }
      if (!graph.has(toId)) {
        graph.set(toId, new Set());
      }
      
      graph.get(fromId)!.add(toId);
      graph.get(toId)!.add(fromId);
    }

    // Find the longest path from this farm
    const longestPath = this.findLongestPath(farmId, graph);
    
    return {
      isTooLong: longestPath >= 7,
      chainLength: longestPath,
    };
  }

  private orientation(p: Point, q: Point, r: Point): number {
    const val = (q.lng - p.lng) * (r.lat - q.lat) - (q.lat - p.lat) * (r.lng - q.lng);
    if (val === 0) return 0; // colinear
    return val > 0 ? 1 : 2; // clock or counterclock wise
  }

  private onSegment(p: Point, q: Point, r: Point): boolean {
    return (
      q.lng <= Math.max(p.lng, r.lng) &&
      q.lng >= Math.min(p.lng, r.lng) &&
      q.lat <= Math.max(p.lat, r.lat) &&
      q.lat >= Math.min(p.lat, r.lat)
    );
  }

  private findPath(start: string, end: string, graph: Map<string, Set<string>>): string[] | null {
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (current: string): boolean => {
      if (current === end) {
        return true;
      }

      visited.add(current);
      path.push(current);

      const neighbors = graph.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        }
      }

      path.pop();
      return false;
    };

    if (dfs(start)) {
      return path;
    }

    return null;
  }

  private findLongestPath(start: string, graph: Map<string, Set<string>>): number {
    const visited = new Set<string>();

    const dfs = (current: string): number => {
      visited.add(current);
      let maxLength = 0;

      const neighbors = graph.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          maxLength = Math.max(maxLength, 1 + dfs(neighbor));
        }
      }

      visited.delete(current);
      return maxLength;
    };

    return dfs(start);
  }
}