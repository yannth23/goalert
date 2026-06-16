import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const prisma = app.get(PrismaService);
  prisma.enableShutdownHooks(app);

  // CORS — aceita origens do .env + qualquer deploy da Vercel
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Sem origin = curl/Postman/server-side — libera
      if (!origin) return callback(null, true);

      // Vercel previews e produção
      if (origin.endsWith('.vercel.app')) return callback(null, true);

      // Origens explícitas no .env
      if (allowedOrigins.includes(origin)) return callback(null, true);

      callback(new Error(`CORS bloqueado: ${origin}`));
    },
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
