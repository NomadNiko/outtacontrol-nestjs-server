import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, HydratedDocument } from 'mongoose';

import { AuthProvidersEnum } from '../../../../../auth/auth-providers.enum';
import { FileSchemaClass } from '../../../../../files/infrastructure/persistence/document/entities/file.schema';
import { EntityDocumentHelper } from '../../../../../utils/document-entity-helper';
import { StatusSchema } from '../../../../../statuses/infrastructure/persistence/document/entities/status.schema';
import { RoleSchema } from '../../../../../roles/infrastructure/persistence/document/entities/role.schema';

export type UserSchemaDocument = HydratedDocument<UserSchemaClass>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
  },
})
export class UserSchemaClass extends EntityDocumentHelper {
  @Prop({
    type: String,
    unique: true,
  })
  email: string | null;

  @Prop({
    type: String,
    unique: true,
    required: true,
  })
  username: string;

  @Prop()
  password?: string;

  @Prop({
    default: AuthProvidersEnum.email,
  })
  provider: string;

  @Prop({
    type: String,
    default: null,
  })
  socialId?: string | null;

  @Prop({
    type: String,
  })
  firstName: string | null;

  @Prop({
    type: String,
  })
  lastName: string | null;

  @Prop({
    type: FileSchemaClass,
  })
  photo?: FileSchemaClass | null;

  @Prop({
    type: RoleSchema,
  })
  role?: RoleSchema | null;

  @Prop({
    type: StatusSchema,
  })
  status?: StatusSchema;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  platinum: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  gold: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  silver: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  xp: number;

  @Prop({
    type: Number,
    default: 1,
    min: 1,
    max: 50,
  })
  level: number;

  @Prop({ default: now })
  createdAt: Date;

  @Prop({ default: now })
  updatedAt: Date;

  @Prop()
  deletedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserSchemaClass);

UserSchema.index({ 'role._id': 1 });
