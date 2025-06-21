import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WallsService } from './walls.service';
import { WallsController } from './walls.controller';
import {
  WallSchemaClass,
  WallSchema,
} from './infrastructure/persistence/document/entities/wall.schema';
import { WallsDocumentRepository } from './infrastructure/persistence/document/repositories/wall.repository';
import { WallRepository } from './infrastructure/persistence/wall.repository';
import { WallGeometryService } from './services/wall-geometry.service';
import { WallHealthService } from './services/wall-health.service';
import { WallDamageSchedulerService } from './services/wall-damage-scheduler.service';
import { FarmsModule } from '../farms/farms.module';
import { PurchasesModule } from '../purchases/purchases.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WallSchemaClass.name, schema: WallSchema },
    ]),
    forwardRef(() => FarmsModule), // Import FarmsModule to access FarmsService
    forwardRef(() => PurchasesModule),
  ],
  controllers: [WallsController],
  providers: [
    WallsService,
    WallGeometryService,
    WallHealthService,
    WallDamageSchedulerService,
    {
      provide: WallRepository,
      useClass: WallsDocumentRepository,
    },
  ],
  exports: [WallsService, WallRepository],
})
export class WallsModule {}
