import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WallsService } from './walls.service';
import { CreateWallDto } from './dto/create-wall.dto';
import { UpdateWallDto } from './dto/update-wall.dto';
import { QueryWallDto } from './dto/query-wall.dto';
import { WallDto } from './dto/wall.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { InfinityPaginationResponseDto } from '../utils/dto/infinity-pagination-response.dto';
import { UserLocationDto } from '../farms/dto/user-location.dto';

@ApiTags('Walls')
@Controller({
  path: 'walls',
  version: '1',
})
export class WallsController {
  constructor(private readonly wallsService: WallsService) {}

  @ApiOperation({ summary: 'Create a new wall between two farms' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Wall has been successfully created.',
    type: WallDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid wall parameters (distance, intersection, loop constraints).',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @SerializeOptions({
    groups: ['admin'],
  })
  async create(@Request() request, @Body() createWallDto: CreateWallDto) {
    const result = await this.wallsService.create(createWallDto, request.user);
    return {
      wall: result.wall,
      loopFormed: result.loopFormed,
      cost: result.purchaseResult.cost,
      userCurrency: {
        platinum: result.purchaseResult.updatedUser.platinum,
        gold: result.purchaseResult.updatedUser.gold,
        silver: result.purchaseResult.updatedUser.silver,
      },
    };
  }

  @ApiOperation({ summary: 'Get walls with pagination and filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of walls.',
    type: InfinityPaginationResponseDto,
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['admin'],
  })
  async findAll(@Query() query: QueryWallDto) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;

    if (limit > 50) {
      throw new Error('Limit cannot be more than 50');
    }

    const walls = await this.wallsService.findManyWithPagination({
      filterOptions: query?.filters,
      sortOptions: query?.sort,
      paginationOptions: {
        page,
        limit,
      },
    });

    return infinityPagination(walls, { page, limit });
  }

  @ApiOperation({ summary: 'Get walls owned by current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of walls owned by user.',
    type: [WallDto],
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('my-walls')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['admin'],
  })
  async getMyWalls(@Request() request) {
    return this.wallsService.findByOwner(request.user.id);
  }

  @ApiOperation({ summary: 'Get walls connected to a specific farm' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of walls connected to the farm.',
    type: [WallDto],
  })
  @Get('by-farm/:farmId')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['admin'],
  })
  async getWallsByFarm(@Param('farmId') farmId: string) {
    return this.wallsService.findByFarm(farmId);
  }

  @ApiOperation({ summary: 'Get a wall by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wall details.',
    type: WallDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Wall not found.',
  })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['admin'],
  })
  async findOne(@Param('id') id: string) {
    return this.wallsService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a wall' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wall has been successfully updated.',
    type: WallDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Wall not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'You can only update your own walls.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['admin'],
  })
  async update(
    @Param('id') id: string,
    @Body() updateWallDto: UpdateWallDto,
    @Request() request,
  ) {
    return this.wallsService.update(id, updateWallDto, request.user);
  }

  @ApiOperation({ summary: 'Delete a wall' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Wall has been successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Wall not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'You can only delete your own walls.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @Request() request) {
    const result = await this.wallsService.remove(id, request.user);
    return {
      success: result.success,
      reward: result.rewardResult?.reward,
      userCurrency: result.rewardResult?.updatedUser ? {
        platinum: result.rewardResult.updatedUser.platinum,
        gold: result.rewardResult.updatedUser.gold,
        silver: result.rewardResult.updatedUser.silver,
      } : undefined,
    };
  }

  @ApiOperation({ summary: 'Heal a wall by 25% health' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wall has been successfully healed.',
    type: WallDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Wall not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot heal wall (cooldown, full health, or distance).',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/heal')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['admin'],
  })
  async healWall(
    @Param('id') id: string,
    @Body() userLocationDto: UserLocationDto,
    @Request() request,
  ) {
    const healResult = await this.wallsService.healWall(
      id,
      request.user,
      userLocationDto
    );
    
    // Return the updated wall with heal result info
    const wall = await this.wallsService.findOne(id);
    return {
      wall,
      healResult,
    };
  }
}