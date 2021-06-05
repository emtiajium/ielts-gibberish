import { ConfigService } from '@nestjs/config';
import { DatabaseType } from 'typeorm/driver/types/DatabaseType';
import { Injectable } from '@nestjs/common';

@Injectable()
export default class DatabaseConfig {
    private readonly configService: ConfigService;

    connection: DatabaseType;

    host: string;

    port: number;

    username: string;

    password: string;

    database: string;

    synchronize: boolean;

    migrations: string[];

    migrationDirectory: string;

    logging: string[];

    constructor() {
        this.configService = new ConfigService();
        this.connection = this.configService.get<DatabaseType>('TYPEORM_CONNECTION');
        this.host = this.configService.get<string>('TYPEORM_HOST');
        this.port = this.configService.get<number>('TYPEORM_PORT');
        this.username = this.configService.get<string>('TYPEORM_USERNAME');
        this.password = this.configService.get<string>('TYPEORM_PASSWORD');
        this.database = this.configService.get<string>('TYPEORM_DATABASE');
        this.synchronize = this.configService.get<boolean>('TYPEORM_SYNCHRONIZE');
        this.migrations = [this.configService.get<string>('TYPEORM_MIGRATIONS')];
        this.logging = this.configService.get<string>('TYPEORM_LOGGING').split(',');
        this.migrationDirectory = this.configService.get<string>('TYPEORM_MIGRATIONS_DIR');
    }
}