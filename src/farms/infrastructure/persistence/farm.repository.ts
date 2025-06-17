import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Farm } from '../../domain/farm';
import { GeoFilterFarmDto, SortFarmDto } from '../../dto/query-farm.dto';

export abstract class FarmRepository {
  abstract create(
    data: Omit<Farm, 'id' | 'createdAt' | 'deletedAt' | 'updatedAt'>,
  ): Promise<Farm>;

  abstract findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: GeoFilterFarmDto | null;
    sortOptions?: SortFarmDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Farm[]>;

  abstract findById(id: Farm['id']): Promise<NullableType<Farm>>;

  abstract findByIds(ids: Farm['id'][]): Promise<Farm[]>;

  abstract findNearby({
    longitude,
    latitude,
    radiusInMeters,
    excludeIds,
  }: {
    longitude: number;
    latitude: number;
    radiusInMeters: number;
    excludeIds?: Farm['id'][];
  }): Promise<Farm[]>;

  abstract findByOwner(ownerId: string): Promise<Farm[]>;

  abstract update(
    id: Farm['id'],
    payload: DeepPartial<Farm>,
  ): Promise<Farm | null>;

  abstract remove(id: Farm['id']): Promise<void>;
}