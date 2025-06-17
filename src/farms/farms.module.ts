import { Module } from '@nestjs/common';
import { FarmsService } from './farms.service';
import { FarmsController } from './farms.controller';
import { FarmHarvestService } from './services/farm-harvest.service';
import { DocumentPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import { UsersModule } from '../users/users.module';
import databaseConfig from '../database/config/database.config';
import { DatabaseConfig } from '../database/config/database-config.type';

const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? DocumentPersistenceModule
  : DocumentPersistenceModule; // TODO: Add RelationalPersistenceModule when needed

@Module({
  imports: [infrastructurePersistenceModule, UsersModule],
  controllers: [FarmsController],
  providers: [FarmsService, FarmHarvestService],
  exports: [FarmsService, FarmHarvestService, infrastructurePersistenceModule],
})
export class FarmsModule {}