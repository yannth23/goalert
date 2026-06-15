import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const prisma = app.get(PrismaService);
  prisma.enableShutdownHooks(app);

  // CORS configurado para produção
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3001').split(',');
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
  });
}
bootstrap();