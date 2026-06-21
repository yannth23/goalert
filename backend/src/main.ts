import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const prisma = app.get(PrismaService);
  prisma.enableShutdownHooks(app);

  const corsOrigins = process.env.CORS_ORIGINS;
  const origins = corsOrigins 
    ? corsOrigins.split(',').map((o) => o.trim()) 
    : [
        'http://localhost:3000', 
        'https://goalert-nine.vercel.app',
        /\.vercel\.app$/ // Aceita qualquer subdomínio da Vercel (incluindo o novo tactiqsense)
      ];

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
bootstrap().catch((err) => {
  console.error('Failed to start application', err);
  process.exit(1);
});
