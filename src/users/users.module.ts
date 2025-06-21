import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';
import { XpController } from './xp.controller';

import { UsersService } from './users.service';
import { DocumentUserPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import { RelationalUserPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { DatabaseConfig } from '../database/config/database-config.type';
import databaseConfig from '../database/config/database.config';
import { FilesModule } from '../files/files.module';
import { UserCreateService } from './services/user-create.service';
import { UserReadService } from './services/user-read.service';
import { UserUpdateService } from './services/user-update.service';
import { UserDeleteService } from './services/user-delete.service';
import { XpLevelingService } from './services/xp-leveling.service';
import { UserXpService } from './services/user-xp.service';

// <database-block>
const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? DocumentUserPersistenceModule
  : RelationalUserPersistenceModule;
// </database-block>

@Module({
  imports: [infrastructurePersistenceModule, FilesModule],
  controllers: [UsersController, XpController],
  providers: [
    UserCreateService,
    UserReadService,
    UserUpdateService,
    UserDeleteService,
    XpLevelingService,
    UserXpService,
    UsersService,
  ],
  exports: [
    UsersService,
    XpLevelingService,
    UserXpService,
    infrastructurePersistenceModule,
  ],
})
export class UsersModule {}
