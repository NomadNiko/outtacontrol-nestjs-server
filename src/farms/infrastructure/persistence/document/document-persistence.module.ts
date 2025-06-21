import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FarmSchemaClass, FarmSchema } from './entities/farm.schema';
import { FarmsDocumentRepository } from './repositories/farm.repository';
import { FarmRepository } from '../farm.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FarmSchemaClass.name, schema: FarmSchema },
    ]),
  ],
  providers: [
    {
      provide: FarmRepository,
      useClass: FarmsDocumentRepository,
    },
  ],
  exports: [FarmRepository, MongooseModule],
})
export class DocumentPersistenceModule {}
