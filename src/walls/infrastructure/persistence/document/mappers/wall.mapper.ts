import { Wall } from '../../../../domain/wall';
import { WallSchemaClass } from '../entities/wall.schema';
import { FarmMapper } from '../../../../../farms/infrastructure/persistence/document/mappers/farm.mapper';
import { UserMapper } from '../../../../../users/infrastructure/persistence/document/mappers/user.mapper';

export class WallMapper {
  static toDomain(raw: WallSchemaClass): Wall {
    const domainEntity = new Wall();
    domainEntity.id = raw._id.toString();
    
    // Ensure required farm references are populated
    if (!raw.fromFarm || !raw.toFarm) {
      console.warn(`Wall ${raw._id} is missing required farm references. fromFarm: ${!!raw.fromFarm}, toFarm: ${!!raw.toFarm}`);
      // For now, create partial domain entity but log the warning
      // In production, you might want to throw an error or return null
    }
    
    if (raw.fromFarm) {
      domainEntity.fromFarm = FarmMapper.toDomain(raw.fromFarm as any);
    }
    
    if (raw.toFarm) {
      domainEntity.toFarm = FarmMapper.toDomain(raw.toFarm as any);
    }
    
    if (raw.owner) {
      domainEntity.owner = UserMapper.toDomain(raw.owner as any);
    }
    
    domainEntity.distance = raw.distance;
    domainEntity.isActive = raw.isActive;
    domainEntity.health = raw.health;
    domainEntity.level = raw.level;
    domainEntity.lastDamageAt = raw.lastDamageAt;
    domainEntity.lastHealAt = raw.lastHealAt;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    domainEntity.deletedAt = raw.deletedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Wall): WallSchemaClass {
    const persistenceSchema = new WallSchemaClass();
    
    if (domainEntity.id && typeof domainEntity.id === 'string') {
      persistenceSchema._id = domainEntity.id;
    }
    
    if (domainEntity.fromFarm) {
      persistenceSchema.fromFarm = domainEntity.fromFarm.id as any;
    }
    
    if (domainEntity.toFarm) {
      persistenceSchema.toFarm = domainEntity.toFarm.id as any;
    }
    
    if (domainEntity.owner) {
      persistenceSchema.owner = domainEntity.owner.id as any;
    }
    
    persistenceSchema.distance = domainEntity.distance;
    persistenceSchema.isActive = domainEntity.isActive;
    persistenceSchema.health = domainEntity.health;
    persistenceSchema.level = domainEntity.level;
    persistenceSchema.lastDamageAt = domainEntity.lastDamageAt;
    persistenceSchema.lastHealAt = domainEntity.lastHealAt;
    persistenceSchema.createdAt = domainEntity.createdAt;
    persistenceSchema.updatedAt = domainEntity.updatedAt;
    persistenceSchema.deletedAt = domainEntity.deletedAt;
    
    return persistenceSchema;
  }
}