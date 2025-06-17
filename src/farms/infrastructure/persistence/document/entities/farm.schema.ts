import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../../../../utils/document-entity-helper';

export type FarmSchemaDocument = HydratedDocument<FarmSchemaClass>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
  },
})
export class FarmSchemaClass extends EntityDocumentHelper {
  @Prop({
    type: String,
    required: true,
    index: true,
  })
  name: string;

  @Prop({
    type: String,
  })
  description?: string;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere', // Enable geospatial indexing
    },
  })
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };

  @Prop({
    type: String,
    required: true,
    ref: 'UserSchemaClass',
    index: true,
  })
  owner: string; // User ID

  @Prop({
    type: Number,
    default: 1,
    min: 1,
  })
  level: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  experience: number;

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  @Prop({
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  })
  health: number;

  @Prop({
    type: Date,
    default: now,
  })
  lastHarvestAt: Date;

  @Prop({ default: now })
  createdAt: Date;

  @Prop({ default: now })
  updatedAt: Date;

  @Prop()
  deletedAt?: Date;
}

export const FarmSchema = SchemaFactory.createForClass(FarmSchemaClass);

// Create geospatial index for location-based queries
FarmSchema.index({ location: '2dsphere' });

// Create compound index for owner and location for efficient queries
FarmSchema.index({ owner: 1, location: '2dsphere' });

// Create index for active farms
FarmSchema.index({ isActive: 1 });