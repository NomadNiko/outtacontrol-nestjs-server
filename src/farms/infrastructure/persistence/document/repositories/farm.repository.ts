import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { Farm } from '../../../../domain/farm';
import { GeoFilterFarmDto, SortFarmDto } from '../../../../dto/query-farm.dto';
import { FarmRepository } from '../../farm.repository';
import { FarmSchemaClass } from '../entities/farm.schema';
import { FarmMapper } from '../mappers/farm.mapper';

@Injectable()
export class FarmsDocumentRepository implements FarmRepository {
  constructor(
    @InjectModel(FarmSchemaClass.name)
    private readonly farmsModel: Model<FarmSchemaClass>,
  ) {}

  async create(data: Farm): Promise<Farm> {
    const persistenceModel = FarmMapper.toPersistence(data);
    const createdFarm = new this.farmsModel(persistenceModel);
    const farmObject = await createdFarm.save();
    return FarmMapper.toDomain(farmObject);
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: GeoFilterFarmDto | null;
    sortOptions?: SortFarmDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Farm[]> {
    const where: FilterQuery<FarmSchemaClass> = {};

    if (filterOptions?.owner) {
      where.owner = filterOptions.owner;
    }

    if (filterOptions?.isActive !== undefined) {
      where.isActive = filterOptions.isActive;
    }

    if (
      filterOptions?.levelMin !== undefined ||
      filterOptions?.levelMax !== undefined
    ) {
      where.level = {};
      if (filterOptions.levelMin !== undefined) {
        where.level.$gte = filterOptions.levelMin;
      }
      if (filterOptions.levelMax !== undefined) {
        where.level.$lte = filterOptions.levelMax;
      }
    }

    // Add geospatial query if location filter is provided
    if (filterOptions?.location?.center && filterOptions?.location?.radius) {
      where.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: filterOptions.location.center,
          },
          $maxDistance: filterOptions.location.radius,
        },
      };
    }

    const farmObjects = await this.farmsModel
      .find(where)
      .populate('owner')
      .sort(
        sortOptions?.reduce(
          (accumulator, sort) => ({
            ...accumulator,
            [sort.orderBy === 'id' ? '_id' : sort.orderBy]:
              sort.order.toUpperCase() === 'ASC' ? 1 : -1,
          }),
          {},
        ),
      )
      .skip((paginationOptions.page - 1) * paginationOptions.limit)
      .limit(paginationOptions.limit)
      .exec();

    return farmObjects.map((farmObject) => FarmMapper.toDomain(farmObject));
  }

  async findById(id: Farm['id']): Promise<NullableType<Farm>> {
    const farmObject = await this.farmsModel
      .findById(id)
      .populate('owner')
      .exec();
    return farmObject ? FarmMapper.toDomain(farmObject) : null;
  }

  async findByIds(ids: Farm['id'][]): Promise<Farm[]> {
    const farmObjects = await this.farmsModel
      .find({ _id: { $in: ids } })
      .populate('owner')
      .exec();
    return farmObjects.map((farmObject) => FarmMapper.toDomain(farmObject));
  }

  async findNearby({
    longitude,
    latitude,
    radiusInMeters,
    excludeIds = [],
  }: {
    longitude: number;
    latitude: number;
    radiusInMeters: number;
    excludeIds?: Farm['id'][];
  }): Promise<Farm[]> {
    const where: FilterQuery<FarmSchemaClass> = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusInMeters,
        },
      },
      isActive: true,
    };

    if (excludeIds.length > 0) {
      where._id = { $nin: excludeIds };
    }

    const farmObjects = await this.farmsModel
      .find(where)
      .populate('owner')
      .exec();

    return farmObjects.map((farmObject) => FarmMapper.toDomain(farmObject));
  }

  async findByOwner(ownerId: string): Promise<Farm[]> {
    const farmObjects = await this.farmsModel
      .find({ owner: ownerId })
      .populate('owner')
      .exec();
    return farmObjects.map((farmObject) => FarmMapper.toDomain(farmObject));
  }

  async update(id: Farm['id'], payload: Partial<Farm>): Promise<Farm | null> {
    const clonedPayload = { ...payload };
    delete clonedPayload.id;

    const filter = { _id: id };
    const farmObject = await this.farmsModel
      .findOneAndUpdate(
        filter,
        FarmMapper.toPersistence(clonedPayload as Farm),
        {
          new: true,
        },
      )
      .populate('owner')
      .exec();

    return farmObject ? FarmMapper.toDomain(farmObject) : null;
  }

  async remove(id: Farm['id']): Promise<void> {
    await this.farmsModel.deleteOne({ _id: id }).exec();
  }
}
