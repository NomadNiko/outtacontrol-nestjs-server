# Future Geospatial Optimization Plan

This document outlines optimizations needed to scale the location-based farming game to hundreds of thousands of farms.

## Current Implementation Status ✅

### What's Working Well
- **Proper 2dsphere indexes** on farm locations in MongoDB
- **Correct GeoJSON format** with [longitude, latitude] coordinate order
- **Efficient proximity queries** using MongoDB's `$near` operator
- **Compound indexes** for owner-based location queries
- **Distance calculations** using Haversine formula
- **Proper coordinate validation** and bounds checking

### Current Schema (farm.schema.ts)
```typescript
FarmSchema.index({ location: '2dsphere' });
FarmSchema.index({ owner: 1, location: '2dsphere' });
FarmSchema.index({ isActive: 1 });
```

## Required Optimizations for Scale 🚀

### 1. Enhanced Indexing Strategy

Add these indexes to `farm.schema.ts`:

```typescript
// Multi-field compound indexes for common query patterns
FarmSchema.index(
  { location: '2dsphere', isActive: 1, health: 1 },
  { background: true }
);

FarmSchema.index(
  { owner: 1, isActive: 1 },
  { background: true }
);

FarmSchema.index(
  { level: 1, location: '2dsphere' },
  { background: true, sparse: true }
);

// Partial index for active farms only (reduces index size)
FarmSchema.index(
  { location: '2dsphere' },
  { 
    partialFilterExpression: { isActive: true, health: { $gt: 0 } },
    background: true 
  }
);

// TTL index for cleanup of inactive farms
FarmSchema.index(
  { lastActiveAt: 1 },
  { expireAfterSeconds: 7776000 } // 90 days
);
```

### 2. Query Optimization Techniques

Add to `farm.repository.ts`:

```typescript
/**
 * Bounding box query for better performance than $near in some scenarios
 */
async findWithinBounds({
  bounds,
  filters
}: {
  bounds: [[number, number], [number, number]]; // [[minLng, minLat], [maxLng, maxLat]]
  filters?: FilterOptions;
}): Promise<Farm[]> {
  const query: FilterQuery<FarmSchemaClass> = {
    location: {
      $geoWithin: {
        $box: bounds
      }
    }
  };
  
  if (filters?.isActive !== undefined) {
    query.isActive = filters.isActive;
  }
  
  if (filters?.minHealth) {
    query.health = { $gte: filters.minHealth };
  }
  
  return this.farmsModel
    .find(query)
    .hint({ location: '2dsphere', isActive: 1 }) // Force optimal index usage
    .lean() // Return plain objects for better performance
    .exec();
}

/**
 * Polygon-based area search for complex regions
 */
async findWithinPolygon({
  polygon,
  filters
}: {
  polygon: number[][]; // Array of [lng, lat] coordinates
  filters?: FilterOptions;
}): Promise<Farm[]> {
  const query: FilterQuery<FarmSchemaClass> = {
    location: {
      $geoWithin: {
        $polygon: polygon
      }
    }
  };
  
  if (filters?.isActive !== undefined) {
    query.isActive = filters.isActive;
  }
  
  return this.farmsModel
    .find(query)
    .hint({ location: '2dsphere' })
    .lean()
    .exec();
}
```

### 3. Aggregation Pipeline for Complex Queries

```typescript
interface FarmWithDistance extends Farm {
  distance: number;
}

/**
 * Advanced geospatial aggregation with distance sorting and stats
 */
async findNearbyWithStats({
  longitude,
  latitude,
  maxDistance,
  limit = 50
}: {
  longitude: number;
  latitude: number;
  maxDistance: number;
  limit?: number;
}): Promise<FarmWithDistance[]> {
  return this.farmsModel.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'distance',
        maxDistance,
        spherical: true,
        query: { isActive: true, health: { $gt: 0 } }
      }
    },
    {
      $lookup: {
        from: 'userschemaclasses',
        localField: 'owner',
        foreignField: '_id',
        as: 'owner'
      }
    },
    { $unwind: '$owner' },
    { $limit: limit },
    {
      $project: {
        name: 1,
        level: 1,
        health: 1,
        location: 1,
        distance: 1,
        'owner.email': 1,
        'owner._id': 1
      }
    }
  ]).exec();
}

/**
 * Geospatial analytics aggregation
 */
async getLocationStats({
  longitude,
  latitude,
  radius
}: {
  longitude: number;
  latitude: number;
  radius: number;
}): Promise<LocationStats> {
  const result = await this.farmsModel.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'distance',
        maxDistance: radius,
        spherical: true
      }
    },
    {
      $group: {
        _id: null,
        totalFarms: { $sum: 1 },
        activeFarms: { $sum: { $cond: ['$isActive', 1, 0] } },
        averageLevel: { $avg: '$level' },
        averageHealth: { $avg: '$health' },
        averageDistance: { $avg: '$distance' }
      }
    }
  ]).exec();
  
  return result[0] || {
    totalFarms: 0,
    activeFarms: 0,
    averageLevel: 0,
    averageHealth: 0,
    averageDistance: 0
  };
}
```

### 4. Caching Strategy

Create new service `farm-cache.service.ts`:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { FarmRepository } from './farm.repository';

interface FindNearbyParams {
  longitude: number;
  latitude: number;
  radiusInMeters: number;
  ttl?: number;
}

@Injectable()
export class FarmCacheService {
  constructor(
    @Inject('REDIS_CLIENT') private redis: Redis,
    private farmRepository: FarmRepository
  ) {}

  /**
   * Cached proximity search with configurable TTL
   */
  async findNearbyWithCache({
    longitude,
    latitude,
    radiusInMeters,
    ttl = 300 // 5 minutes default
  }: FindNearbyParams): Promise<Farm[]> {
    const cacheKey = `nearby:${longitude.toFixed(6)}:${latitude.toFixed(6)}:${radiusInMeters}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const farms = await this.farmRepository.findNearby({
      longitude,
      latitude,
      radiusInMeters
    });
    
    await this.redis.setex(cacheKey, ttl, JSON.stringify(farms));
    return farms;
  }

  /**
   * Invalidate cache for a region when farms are modified
   */
  async invalidateRegionCache({
    longitude,
    latitude,
    radiusInMeters = 1000 // Default 1km invalidation radius
  }: {
    longitude: number;
    latitude: number;
    radiusInMeters?: number;
  }): Promise<void> {
    const pattern = `nearby:${longitude.toFixed(4)}*:${latitude.toFixed(4)}*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Cached bounding box search
   */
  async findWithinBoundsCache({
    bounds,
    ttl = 600 // 10 minutes for larger areas
  }: {
    bounds: [[number, number], [number, number]];
    ttl?: number;
  }): Promise<Farm[]> {
    const cacheKey = `bounds:${bounds[0][0]}:${bounds[0][1]}:${bounds[1][0]}:${bounds[1][1]}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const farms = await this.farmRepository.findWithinBounds({ bounds });
    await this.redis.setex(cacheKey, ttl, JSON.stringify(farms));
    
    return farms;
  }
}
```

### 5. Database Connection Optimization

Update database configuration:

```typescript
// database.config.ts
export default registerAs<DatabaseConfig>('database', () => ({
  // ... existing config
  
  // Connection pooling for high-scale deployment
  maxConnections: 100,
  poolSize: 50,
  bufferMaxEntries: 0,
  bufferCommands: false,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 30000,
  
  // Optimize for geospatial queries
  readPreference: 'secondaryPreferred',
  readConcern: { level: 'local' },
  
  // Write concern optimization
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 5000
  },
  
  // Additional optimizations
  retryWrites: true,
  retryReads: true,
  compressors: ['zstd', 'zlib'],
  
  // Index creation options
  createIndexOptions: {
    background: true,
    sparse: true
  }
}));
```

### 6. Performance Monitoring & Alerting

```typescript
// Add to farm.service.ts
import { performance } from 'perf_hooks';

async findNearbyWithMonitoring(params: FindNearbyParams): Promise<Farm[]> {
  const startTime = performance.now();
  
  try {
    const farms = await this.farmRepository.findNearby(params);
    const duration = performance.now() - startTime;
    
    // Log slow queries
    if (duration > 100) { // > 100ms
      this.logger.warn(`Slow geospatial query: ${duration.toFixed(2)}ms`, {
        params,
        resultCount: farms.length,
        duration
      });
    }
    
    // Metrics for monitoring
    this.metricsService.histogram('geospatial_query_duration', duration, {
      operation: 'findNearby',
      resultCount: farms.length.toString()
    });
    
    return farms;
  } catch (error) {
    const duration = performance.now() - startTime;
    this.logger.error('Geospatial query failed', {
      params,
      duration,
      error: error.message
    });
    throw error;
  }
}
```

### 7. Query Optimization Commands

```bash
# MongoDB shell commands for monitoring and optimization

# Enable query profiler for slow queries
db.setProfilingLevel(1, { slowms: 100 });

# Monitor index usage
db.farms.find({ location: { $near: { $geometry: { type: "Point", coordinates: [-122, 37] }, $maxDistance: 1000 } } }).explain("executionStats");

# Check index effectiveness
db.farms.getIndexes();
db.farms.stats({ indexDetails: true });

# Monitor query performance
db.farms.aggregate([
  { $indexStats: {} }
]);

# Optimize collection
db.farms.reIndex();
```

## Implementation Priority 📋

### Phase 1 (Immediate - Production Ready)
1. Enhanced compound indexes
2. Query hints and lean() calls
3. Basic Redis caching for proximity searches

### Phase 2 (Scale Preparation)
1. Bounding box and polygon queries
2. Aggregation pipelines
3. Connection pooling optimization
4. Cache invalidation strategy

### Phase 3 (High Scale)
1. Advanced caching strategies
2. Database sharding considerations
3. Read replicas for geospatial queries
4. Comprehensive monitoring and alerting

## Performance Targets 🎯

- **Proximity queries**: < 50ms for 10km radius
- **Bounding box queries**: < 100ms for city-sized areas
- **Cache hit ratio**: > 80% for frequently accessed regions
- **Index selectivity**: > 95% queries using optimal indexes
- **Concurrent queries**: Support 1000+ simultaneous geospatial queries

## Notes 📝

- All optimizations maintain backward compatibility
- Indexes can be created in background without downtime
- Caching layer is optional and can be gradually implemented
- Monitor query performance before and after each optimization
- Consider MongoDB Atlas Search for advanced geospatial features

---

*Last updated: 2025-06-21*
*Target scale: 100,000+ farms with sub-second query response times*