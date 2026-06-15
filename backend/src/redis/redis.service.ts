import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private restUrl: string;
  private restToken: string;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.restUrl = this.configService.get<string>('UPSTASH_REDIS_REST_URL');
    this.restToken = this.configService.get<string>(
      'UPSTASH_REDIS_REST_TOKEN',
    );

    if (!this.restUrl || !this.restToken) {
      this.logger.warn(
        'Upstash Redis credentials not configured. Redis caching will be disabled.',
      );
      return;
    }

    try {
      // Testar conexão com um PING
      const result = await this.executeCommand(['PING']);
      if (result === 'PONG') {
        this.isConnected = true;
        this.logger.log('✅ Connected to Upstash Redis (REST API)');
      }
    } catch (error) {
      this.logger.error('Failed to connect to Upstash Redis:', error);
      this.isConnected = false;
    }
  }

  private async executeCommand(command: string[]): Promise<any> {
    if (!this.restUrl || !this.restToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.restUrl}/exec`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.restToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        throw new Error(`Upstash API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      this.logger.error('Error executing Redis command:', error);
      return null;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    try {
      const result = await this.executeCommand(['GET', key]);
      return result;
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isConnected) return;
    try {
      if (ttl) {
        await this.executeCommand(['SETEX', key, ttl.toString(), value]);
      } else {
        await this.executeCommand(['SET', key, value]);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.executeCommand(['DEL', key]);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  isConnectedToRedis(): boolean {
    return this.isConnected;
  }
}
