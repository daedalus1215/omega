import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ServerOptions } from 'https';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const bodyLimit = process.env.BODY_LIMIT ?? '1mb';
  const httpsOptions = getHttpsOptions();
  const app = httpsOptions
    ? await NestFactory.create<NestExpressApplication>(AppModule, {
        httpsOptions,
        bodyParser: false,
      })
    : await NestFactory.create<NestExpressApplication>(AppModule, {
        bodyParser: false,
      });
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ limit: bodyLimit, extended: true }));
  app.setGlobalPrefix('api');
  const corsOrigin = process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(',').map(s => s.trim())
    : true;
  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV');
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Omega Calendar API')
      .setDescription('Calendar management API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }
  const logger = app.get(Logger);
  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  if (httpsOptions) {
    logger.log(`HTTPS enabled on port ${port}`);
  } else {
    logger.log(`HTTP enabled on port ${port}`);
  }
}

function getHttpsOptions(): ServerOptions | undefined {
  const sslKeyPath = process.env.SSL_KEYFILE;
  const sslCertPath = process.env.SSL_CERTFILE;
  if (sslKeyPath && sslCertPath) {
    try {
      if (!existsSync(sslKeyPath) || !existsSync(sslCertPath)) {
        console.warn('SSL certificate files not found at specified paths');
        return undefined;
      }
      return {
        key: readFileSync(sslKeyPath),
        cert: readFileSync(sslCertPath),
      };
    } catch (error) {
      console.warn(
        `Failed to load SSL certificates: ${error instanceof Error ? error.message : String(error)}`
      );
      console.warn('Falling back to HTTP');
      return undefined;
    }
  }
  const programmingDir = join(__dirname, '../../..');
  const defaultSharedCertsPath = join(programmingDir, 'shared-certs');
  const defaultKeyPath = join(defaultSharedCertsPath, 'server.key');
  const defaultCertPath = join(defaultSharedCertsPath, 'server.crt');
  if (existsSync(defaultKeyPath) && existsSync(defaultCertPath)) {
    try {
      const key = readFileSync(defaultKeyPath);
      const cert = readFileSync(defaultCertPath);
      console.log(`Using SSL certificates from: ${defaultSharedCertsPath}`);
      return { key, cert };
    } catch (error) {
      console.warn(
        `Failed to read SSL certificates: ${error instanceof Error ? error.message : String(error)}`
      );
      return undefined;
    }
  }
  return undefined;
}

bootstrap();
