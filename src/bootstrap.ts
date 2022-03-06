import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import AppModule from '@/AppModule';
import ServiceConfig from '@/common/configs/ServiceConfig';
import * as fs from 'fs';
import { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { version, name, author } from '@root/package.json';

export class Bootstrap {
    private readonly serviceConfig: ServiceConfig;

    private app: INestApplication;

    constructor(private readonly appModule: AppModule) {
        this.serviceConfig = new ServiceConfig();
    }

    async start(): Promise<INestApplication> {
        const app: INestApplication = await NestFactory.create(this.appModule, this.getAppOptions());
        this.app = app;
        this.initSwagger();
        app.enableCors();
        app.enableShutdownHooks();
        app.useGlobalPipes(new ValidationPipe());
        const { payloadLimitSize, serviceApiPrefix, port } = this.serviceConfig;
        app.use(bodyParser.json({ limit: payloadLimitSize }));
        app.use(bodyParser.urlencoded({ limit: payloadLimitSize, parameterLimit: 10_000_000, extended: true }));
        app.use(cookieParser());
        app.setGlobalPrefix(serviceApiPrefix);
        app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
        await app.listen(port);
        return app;
    }

    initSwagger(): void {
        const config = new DocumentBuilder()
            .addServer(this.serviceConfig.serviceApiPrefix)
            .setTitle(name)
            .setVersion(version)
            .setContact(author.name, '', author.email)
            .addApiKey({ type: 'apiKey', name: 'Authorization', in: 'header' }, 'Authorization')
            .build();

        const document = SwaggerModule.createDocument(this.app, config);

        SwaggerModule.setup(`${this.serviceConfig.serviceApiPrefix}/swagger`, this.app, document, {
            customSiteTitle: 'API Docs | Firecracker Vocab Practice',
            customfavIcon: `https://firecrackervocabulary.com/assets/icon/favicon/favicon-32x32.png`,
        });
    }

    private getAppOptions(): NestApplicationOptions {
        let options: NestApplicationOptions;

        if (this.serviceConfig.environment === 'development') {
            options = {
                // Enabling HTTPS by following the steps mentioned at
                // https://www.section.io/engineering-education/how-to-get-ssl-https-for-localhost/
                // We also need to import certificate authority by hitting
                // <chrome://settings/certificates>
                httpsOptions: {
                    key: fs.readFileSync('cert/CA/localhost/localhost.decrypted.key'),
                    cert: fs.readFileSync('cert/CA/localhost/localhost.crt'),
                },
            };
        }

        return options;
    }
}

export default async function bootstrap(module: AppModule): Promise<INestApplication> {
    return new Bootstrap(module).start();
}
