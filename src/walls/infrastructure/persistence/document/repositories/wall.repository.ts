import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';

import { NullableType } from '../../../../../utils/types/nullable.type';
import { FilterWallDto, SortWallDto } from '../../../../dto/query-wall.dto';
import { Wall } from '../../../../domain/wall';
import { WallRepository } from '../../wall.repository';
import { WallSchemaClass } from '../entities/wall.schema';
import { WallMapper } from '../mappers/wall.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class WallsDocumentRepository implements WallRepository {
  constructor(
    @InjectModel(WallSchemaClass.name)
    private readonly wallsModel: Model<WallSchemaClass>,
  ) {}

  async create(data: Wall): Promise<Wall> {
    const persistenceModel = WallMapper.toPersistence(data);
    const createdWall = new this.wallsModel(persistenceModel);
    const wallObject = await createdWall.save();

    // Populate the farm and user references
    await wallObject.populate([
      { path: 'fromFarm' },
      { path: 'toFarm' },
      { path: 'owner' },
    ]);

    return WallMapper.toDomain(wallObject);
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterWallDto | null;
    sortOptions?: SortWallDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Wall[]> {
    const where: FilterQuery<WallSchemaClass> = {};

    if (filterOptions?.farmId) {
      where.$or = [
        { fromFarm: filterOptions.farmId },
        { toFarm: filterOptions.farmId },
      ];
    }

    if (filterOptions?.ownerId) {
      where.owner = filterOptions.ownerId;
    }

    const wallObjects = await this.wallsModel
      .find(where)
      .populate(['fromFarm', 'toFarm', 'owner'])
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
      .limit(paginationOptions.limit);

    return wallObjects.map((wallObject) => WallMapper.toDomain(wallObject));
  }

  async findById(id: Wall['id']): Promise<NullableType<Wall>> {
    const wallObject = await this.wallsModel
      .findById(id)
      .populate(['fromFarm', 'toFarm', 'owner']);
    return wallObject ? WallMapper.toDomain(wallObject) : null;
  }

  async findByIds(ids: Wall['id'][]): Promise<Wall[]> {
    const wallObjects = await this.wallsModel
      .find({ _id: { $in: ids } })
      .populate(['fromFarm', 'toFarm', 'owner']);
    return wallObjects.map((wallObject) => WallMapper.toDomain(wallObject));
  }

  async findByOwner(ownerId: string): Promise<Wall[]> {
    const wallObjects = await this.wallsModel
      .find({ owner: ownerId })
      .populate(['fromFarm', 'toFarm', 'owner']);
    return wallObjects.map((wallObject) => WallMapper.toDomain(wallObject));
  }

  async findByFarm(farmId: string): Promise<Wall[]> {
    const wallObjects = await this.wallsModel
      .find({
        $or: [{ fromFarm: farmId }, { toFarm: farmId }],
      })
      .populate(['fromFarm', 'toFarm', 'owner']);
    return wallObjects.map((wallObject) => WallMapper.toDomain(wallObject));
  }

  async findBetweenFarms(
    fromFarmId: string,
    toFarmId: string,
  ): Promise<NullableType<Wall>> {
    const wallObject = await this.wallsModel
      .findOne({
        $or: [
          { fromFarm: fromFarmId, toFarm: toFarmId },
          { fromFarm: toFarmId, toFarm: fromFarmId },
        ],
      })
      .populate(['fromFarm', 'toFarm', 'owner']);
    return wallObject ? WallMapper.toDomain(wallObject) : null;
  }

  async getAllWalls(): Promise<Wall[]> {
    const wallObjects = await this.wallsModel
      .find()
      .populate(['fromFarm', 'toFarm', 'owner']);
    return wallObjects.map((wallObject) => WallMapper.toDomain(wallObject));
  }

  async findAllActive(): Promise<Wall[]> {
    const wallObjects = await this.wallsModel
      .find({
        isActive: true,
        health: { $gt: 0 },
        deletedAt: null,
      })
      .populate(['fromFarm', 'toFarm', 'owner']);
    return wallObjects.map((wallObject) => WallMapper.toDomain(wallObject));
  }

  async update(id: Wall['id'], payload: Partial<Wall>): Promise<Wall | null> {
    const clonedPayload = { ...payload };
    delete clonedPayload.id;

    const filter = { _id: id.toString() };

    // First populate the wall to get the full data for mapping
    const wall = await this.wallsModel
      .findOne(filter)
      .populate(['fromFarm', 'toFarm', 'owner']);

    if (!wall) {
      return null;
    }

    const domainWall = WallMapper.toDomain(wall);
    const mergedWall = {
      ...domainWall,
      ...clonedPayload,
    };

    const persistenceData = WallMapper.toPersistence(mergedWall);

    const wallObject = await this.wallsModel
      .findOneAndUpdate(filter, persistenceData, { new: true })
      .populate(['fromFarm', 'toFarm', 'owner']);

    return wallObject ? WallMapper.toDomain(wallObject) : null;
  }

  async remove(id: Wall['id']): Promise<void> {
    await this.wallsModel.deleteOne({
      _id: id.toString(),
    });
  }

  async updateHealthOnly(
    id: Wall['id'],
    health: number,
    lastDamageAt?: Date,
    level?: number,
  ): Promise<void> {
    const updateData: any = {
      health,
      updatedAt: new Date(),
    };

    if (lastDamageAt) {
      updateData.lastDamageAt = lastDamageAt;
    }

    if (level !== undefined) {
      updateData.level = level;
    }

    await this.wallsModel.updateOne(
      { _id: id.toString() },
      { $set: updateData },
    );
  }
}
