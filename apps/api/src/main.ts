import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { RuntimeModule } from './runtime.module';
import { runtimeConfig } from './common/config/runtime-config';
async function bootstrap() {
    const config = runtimeConfig(process.env);
    const app = await NestFactory.create(RuntimeModule.forRole(config.role), { logger: ['error', 'warn'] });
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    if (config.role === 'worker') {
        const document = SwaggerModule.createDocument(
            app,
            new DocumentBuilder()
                .setTitle('OrderFlow Market API')
                .setDescription('Independent marketplace demo. Persistent inventory and orders; sandbox carrier.')
                .setVersion('1.0')
                .addBearerAuth()
                .build(),
        );
        SwaggerModule.setup('docs', app, document);
    }
    app.enableShutdownHooks();
    await app.listen(config.port, '0.0.0.0');
}
bootstrap().catch((error) => {
    console.error(error);
    process.exit(1);
});
