import { Farm } from '../../../../domain/farm';
import { FarmSchemaClass } from '../entities/farm.schema';
import { UserMapper } from '../../../../../users/infrastructure/persistence/document/mappers/user.mapper';

export class FarmMapper {
  static toDomain(raw: FarmSchemaClass): Farm {
    const domainEntity = new Farm();
    domainEntity.id = raw._id?.toString() || '';
    domainEntity.name = raw.name;
    domainEntity.description = raw.description;
    domainEntity.location = raw.location;
    domainEntity.level = raw.level;
    domainEntity.experience = raw.experience;
    domainEntity.isActive = raw.isActive;
    domainEntity.health = raw.health;
    domainEntity.lastHarvestAt = raw.lastHarvestAt;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    domainEntity.deletedAt = raw.deletedAt;

    // Note: Owner will be populated separately when needed
    if (raw.owner && typeof raw.owner === 'object') {
      domainEntity.owner = UserMapper.toDomain(raw.owner as any);
    }

    return domainEntity;
  }

  static toPersistence(domainEntity: Farm): Partial<FarmSchemaClass> {
    const persistenceEntity: Partial<FarmSchemaClass> = {
      name: domainEntity.name,
      description: domainEntity.description,
      location: domainEntity.location,
      level: domainEntity.level,
      experience: domainEntity.experience,
      isActive: domainEntity.isActive,
      health: domainEntity.health,
      lastHarvestAt: domainEntity.lastHarvestAt,
    };

    if (domainEntity.owner) {
      persistenceEntity.owner =
        typeof domainEntity.owner === 'string'
          ? domainEntity.owner
          : domainEntity.owner.id?.toString();
    }

    if (domainEntity.createdAt) {
      persistenceEntity.createdAt = domainEntity.createdAt;
    }

    if (domainEntity.updatedAt) {
      persistenceEntity.updatedAt = domainEntity.updatedAt;
    }

    if (domainEntity.deletedAt) {
      persistenceEntity.deletedAt = domainEntity.deletedAt;
    }

    return persistenceEntity;
  }
}
