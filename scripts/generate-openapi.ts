import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

async function generateOpenAPI() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Dolly Vibe API')
    .setDescription('The Dolly Vibe API documentation with VibeUser management, authentication, and more')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://api.dollyvibe.com', 'Production server')
    .setContact(
      'Dolly Vibe Team',
      'https://dollyvibe.com',
      'support@dollyvibe.com'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addTag('Authentication', 'Authentication endpoints')
    .addTag('VibeUser Management', 'VibeUser CRUD operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Generate YAML file
  const yamlString = yaml.dump(document, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  });

  // Write to file
  fs.writeFileSync('./openapi.yaml', yamlString);

  // Also generate JSON version
  fs.writeFileSync('./openapi.json', JSON.stringify(document, null, 2));

  console.log('OpenAPI documentation generated:');
  console.log('- openapi.yaml');
  console.log('- openapi.json');

  await app.close();
}

generateOpenAPI().catch((error) => {
  console.error('Error generating OpenAPI documentation:', error);
  process.exit(1);
});