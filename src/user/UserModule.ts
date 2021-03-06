import { Logger, Module } from '@nestjs/common';
import UserController from '@/user/controllers/UserController';
import UserService from '@/user/services/UserService';
import CohortService from '@/user/services/CohortService';
import CohortController from '@/user/controllers/CohortController';
import { TypeOrmModule } from '@nestjs/typeorm';
import UserRepository from '@/user/repositories/UserRepository';
import CohortRepository from '@/user/repositories/CohortRepository';
import LeitnerSystemsRepository from '@/vocabulary/repositories/LeitnerSystemsRepository';

@Module({
    imports: [TypeOrmModule.forFeature([UserRepository, CohortRepository, LeitnerSystemsRepository])],
    controllers: [UserController, CohortController],
    providers: [UserService, CohortService, Logger],
})
export default class UserModule {}
