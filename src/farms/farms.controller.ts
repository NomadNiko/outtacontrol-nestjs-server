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
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FarmsService } from './farms.service';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { QueryFarmDto } from './dto/query-farm.dto';
import { FarmDto } from './dto/farm.dto';
import { UserLocationDto } from './dto/user-location.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { InfinityPaginationResponseDto } from '../utils/dto/infinity-pagination-response.dto';

@ApiTags('Farms')
@Controller({
  path: 'farms',
  version: '1',
})
export class FarmsController {
  constructor(private readonly farmsService: FarmsService) {}

  @ApiOperation({ summary: 'Create a new farm' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Farm has been successfully created.',
    type: FarmDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Another farm exists within 10 meters of this location.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @SerializeOptions({
    groups: ['admin'],
  })
  async create(@Request() request, @Body() createFarmDto: CreateFarmDto) {
    return this.farmsService.create(createFarmDto, request.user);
  }

  @ApiOperation({ summary: 'Get farms with pagination and filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of farms.',
    type: InfinityPaginationResponseDto,
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['admin'],
  })
  async findAll(@Query() query: QueryFarmDto) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;

    if (limit > 50) {
      throw new Error('Limit cannot be more than 50');
    }

    const farms = await this.farmsService.findManyWithPagination({
      filterOptions: query?.filters,
      sortOptions: query?.sort,
      paginationOptions: {
        page,
        limit,
      },
    });

    return infinityPagination(farms, { page, limit });
  }

  @ApiOperation({ summary: 'Find farms near a location' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of nearby farms.',
    type: [FarmDto],
  })
  @ApiQuery({ name: 'longitude', type: Number })
  @ApiQuery({ name: 'latitude', type: Number })
  @ApiQuery({ name: 'radius', type: Number, required: false })
  @Get('nearby')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['admin'],
  })
  async findNearby(
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number,
    @Query('radius') radius?: number,
  ) {
    return this.farmsService.findNearby({
      longitude: Number(longitude),
      latitude: Number(latitude),
      radiusInMeters: radius ? Number(radius) : 1000,
    });
  }

  @ApiOperation({ summary: 'Check proximity for a location' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Proximity check result.',
  })
  @ApiQuery({ name: 'longitude', type: Number })
  @ApiQuery({ name: 'latitude', type: Number })
  @ApiQuery({ name: 'radius', type: Number, required: false })
  @Get('check-proximity')
  @HttpCode(HttpStatus.OK)
  async checkProximity(
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number,
    @Query('radius') radius?: number,
  ) {
    return this.farmsService.checkProximity({
      longitude: Number(longitude),
      latitude: Number(latitude),
      radiusInMeters: radius ? Number(radius) : 5,
    });
  }

  @ApiOperation({ summary: 'Get farms by owner' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of farms owned by user.',
    type: [FarmDto],
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('my-farms')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['admin'],
  })
  async getMyFarms(@Request() request) {
    return this.farmsService.findByOwner(request.user.id);
  }

  @ApiOperation({ summary: 'Get a farm by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Farm details.',
    type: FarmDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Farm not found.',
  })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['admin'],
  })
  async findOne(@Param('id') id: string) {
    return this.farmsService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a farm' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Farm has been successfully updated.',
    type: FarmDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Farm not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'You can only update your own farms.',
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
    @Body() updateFarmDto: UpdateFarmDto,
    @Request() request,
  ) {
    return this.farmsService.update(id, updateFarmDto, request.user);
  }

  @ApiOperation({ summary: 'Harvest a farm or steal from another user\'s farm' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Farm has been successfully harvested. Returns full harvest for owned farms, 25% harvest for other users\' farms.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Farm not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Farm has no harvestable currency, is inactive, or has no health.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/harvest')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['admin'],
  })
  async harvest(
    @Param('id') id: string, 
    @Body() userLocation: UserLocationDto,
    @Request() request
  ) {
    return this.farmsService.harvest(id, request.user, userLocation);
  }

  @ApiOperation({ summary: 'Delete a farm' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Farm has been successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Farm not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'You can only delete your own farms.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() request) {
    return this.farmsService.remove(id, request.user);
  }
}