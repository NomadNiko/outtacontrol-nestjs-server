import { Module, forwardRef } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { MidnightRewardService } from './services/midnight-reward.service';
import { UsersModule } from '../users/users.module';
import { FarmsModule } from '../farms/farms.module';
import { WallsModule } from '../walls/walls.module';

@Module({
  imports: [
    UsersModule,
    forwardRef(() => FarmsModule),
    forwardRef(() => WallsModule),
  ],
  providers: [PurchasesService, MidnightRewardService],
  exports: [PurchasesService, MidnightRewardService],
})
export class PurchasesModule {}
