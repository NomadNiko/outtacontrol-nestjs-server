import { Wall } from '../../domain/wall';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { FilterWallDto, SortWallDto } from '../../dto/query-wall.dto';

export abstract class WallRepository {
  abstract create(data: Wall): Promise<Wall>;

  abstract findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterWallDto | null;
    sortOptions?: SortWallDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Wall[]>;

  abstract findById(id: Wall['id']): Promise<NullableType<Wall>>;

  abstract findByIds(ids: Wall['id'][]): Promise<Wall[]>;

  abstract findByOwner(ownerId: string): Promise<Wall[]>;

  abstract findByFarm(farmId: string): Promise<Wall[]>;

  abstract findBetweenFarms(
    fromFarmId: string,
    toFarmId: string,
  ): Promise<NullableType<Wall>>;

  abstract getAllWalls(): Promise<Wall[]>;

  abstract findAllActive(): Promise<Wall[]>;

  abstract update(id: Wall['id'], payload: Partial<Wall>): Promise<Wall | null>;

  abstract remove(id: Wall['id']): Promise<void>;

  abstract updateHealthOnly(
    id: Wall['id'],
    health: number,
    lastDamageAt?: Date,
    level?: number,
  ): Promise<void>;
}
