import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EntityDocumentHelper } from '../../../../../utils/document-entity-helper';

export type WallSchemaDocument = WallSchemaClass & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
  },
})
export class WallSchemaClass extends EntityDocumentHelper {
  @Prop({
    type: Types.ObjectId,
    ref: 'FarmSchemaClass',
    required: true,
  })
  fromFarm: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'FarmSchemaClass',
    required: true,
  })
  toFarm: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'UserSchemaClass',
    required: true,
  })
  owner: Types.ObjectId;

  @Prop({
    type: Number,
    required: true,
    min: 0,
    max: 40, // Maximum 40 meters
  })
  distance: number;

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt?: Date;

  @Prop({
    type: Date,
    default: Date.now,
  })
  createdAt: Date;

  @Prop({
    type: Date,
    default: Date.now,
  })
  updatedAt: Date;
}

export const WallSchema = SchemaFactory.createForClass(WallSchemaClass);

// Create compound index to prevent duplicate walls between same farms
WallSchema.index({ fromFarm: 1, toFarm: 1 }, { unique: true });
WallSchema.index({ toFarm: 1, fromFarm: 1 }, { unique: true });

// Index for efficient queries
WallSchema.index({ owner: 1 });
WallSchema.index({ fromFarm: 1 });
WallSchema.index({ toFarm: 1 });
WallSchema.index({ isActive: 1 });
WallSchema.index({ deletedAt: 1 });