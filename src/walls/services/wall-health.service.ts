import { Injectable, Logger } from '@nestjs/common';
import { Wall } from '../domain/wall';

export interface DamageResult {
  previousHealth: number;
  newHealth: number;
  damage: number;
  isDestroyed: boolean;
  levelLost: boolean;
}

export interface HealResult {
  previousHealth: number;
  newHealth: number;
  healAmount: number;
  canHealAgainAt: Date;
}

@Injectable()
export class WallHealthService {
  private readonly logger = new Logger(WallHealthService.name);
  
  // Constants
  private readonly DAMAGE_PER_HOUR = 5; // 5% health loss per hour
  private readonly HEAL_AMOUNT = 25; // 25% health restoration
  private readonly HEAL_COOLDOWN_MINUTES = 5; // 5 minutes between heals
  private readonly MAX_HEALTH = 100;
  private readonly MIN_HEALTH = 0;

  /**
   * Apply damage to a wall
   * @param wall The wall to damage
   * @param damageAmount Amount of damage to apply (defaults to DAMAGE_PER_HOUR)
   * @returns DamageResult with damage details
   */
  applyDamage(wall: Wall, damageAmount: number = this.DAMAGE_PER_HOUR): DamageResult {
    const previousHealth = wall.health;
    const newHealth = Math.max(this.MIN_HEALTH, wall.health - damageAmount);
    
    const result: DamageResult = {
      previousHealth,
      newHealth,
      damage: previousHealth - newHealth,
      isDestroyed: false,
      levelLost: false,
    };

    // Check if wall should be destroyed (any wall at 0 or negative health)
    if (newHealth <= 0) {
      result.isDestroyed = true;
      this.logger.log(`Wall ${wall.id} destroyed due to health depletion`);
    }

    return result;
  }

  /**
   * Heal a wall
   * @param wall The wall to heal
   * @param healAmount Amount to heal (defaults to HEAL_AMOUNT)
   * @returns HealResult with healing details
   */
  healWall(wall: Wall, healAmount: number = this.HEAL_AMOUNT): HealResult {
    const previousHealth = wall.health;
    const newHealth = Math.min(this.MAX_HEALTH, wall.health + healAmount);
    
    // Calculate next heal time
    const canHealAgainAt = new Date();
    canHealAgainAt.setMinutes(canHealAgainAt.getMinutes() + this.HEAL_COOLDOWN_MINUTES);

    return {
      previousHealth,
      newHealth,
      healAmount: newHealth - previousHealth,
      canHealAgainAt,
    };
  }

  /**
   * Check if a wall can be healed
   * @param wall The wall to check
   * @returns boolean indicating if wall can be healed
   */
  canHeal(wall: Wall): boolean {
    // Wall must not be at full health
    if (wall.health >= this.MAX_HEALTH) {
      return false;
    }

    // Check cooldown if lastHealAt exists
    if (wall.lastHealAt) {
      const cooldownEnd = new Date(wall.lastHealAt);
      cooldownEnd.setMinutes(cooldownEnd.getMinutes() + this.HEAL_COOLDOWN_MINUTES);
      
      if (new Date() < cooldownEnd) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get time remaining until wall can be healed again
   * @param wall The wall to check
   * @returns minutes until next heal, or 0 if can heal now
   */
  getTimeUntilNextHeal(wall: Wall): number {
    if (!wall.lastHealAt) {
      return 0;
    }

    const cooldownEnd = new Date(wall.lastHealAt);
    cooldownEnd.setMinutes(cooldownEnd.getMinutes() + this.HEAL_COOLDOWN_MINUTES);
    
    const now = new Date();
    if (now >= cooldownEnd) {
      return 0;
    }

    return Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60));
  }

  /**
   * Calculate damage that should be applied based on time elapsed
   * @param lastDamageAt Last time damage was applied
   * @returns Total damage to apply
   */
  calculateAccumulatedDamage(lastDamageAt?: Date): number {
    if (!lastDamageAt) {
      // If never damaged, use creation time or current time
      return 0;
    }

    const now = new Date();
    const hoursSinceLastDamage = (now.getTime() - lastDamageAt.getTime()) / (1000 * 60 * 60);
    
    // Calculate damage for complete hours only
    const completeHours = Math.floor(hoursSinceLastDamage);
    return completeHours * this.DAMAGE_PER_HOUR;
  }

  /**
   * Get wall health status description
   * @param health Current health value
   * @returns Status description
   */
  getHealthStatus(health: number): string {
    if (health >= 80) return 'Excellent';
    if (health >= 60) return 'Good';
    if (health >= 40) return 'Fair';
    if (health >= 20) return 'Poor';
    if (health > 0) return 'Critical';
    return 'Destroyed';
  }

  /**
   * Get health color for UI display
   * @param health Current health value
   * @returns Color hex code
   */
  getHealthColor(health: number): string {
    if (health >= 80) return '#10B981'; // green-500
    if (health >= 60) return '#3B82F6'; // blue-500
    if (health >= 40) return '#F59E0B'; // amber-500
    if (health >= 20) return '#EF4444'; // red-500
    return '#991B1B'; // red-800
  }
}