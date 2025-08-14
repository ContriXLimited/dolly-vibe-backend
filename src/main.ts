import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Dolly Vibe API')
    .setDescription('The Dolly Vibe API documentation with VibeUser management, authentication, and more')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:3000', 'Development server')
    .setContact(
      'Dolly Vibe Team',
      'https://dollyvibe.com',
      'support@dollyvibe.com'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addTag('Authentication', 'Authentication endpoints')
    .addTag('VibeUser Management', 'VibeUser CRUD operations')
    .addTag('Wallet Verification', 'Wallet signature verification')
    .addTag('Discord Integration', 'Discord OAuth and server verification')
    .addTag('Twitter Integration', 'Twitter OAuth and follow verification')
    .addTag('User Connection Status', 'User connection status management')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();