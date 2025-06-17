import { PartialType } from '@nestjs/swagger';
import { CreateWallDto } from './create-wall.dto';

export class UpdateWallDto extends PartialType(CreateWallDto) {}