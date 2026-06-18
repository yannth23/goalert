import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';

describe('RedisService', () => {
  let service: RedisService;
  let configService: Partial<Record<keyof ConfigService, jest.Mock>>;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue(undefined),
    };
    service = new RedisService(configService as unknown as ConfigService);
  });

  describe('when Redis is not configured', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('isConnectedToRedis should return false', () => {
      expect(service.isConnectedToRedis()).toBe(false);
    });

    it('get should return null', async () => {
      const result = await service.get('key');
      expect(result).toBeNull();
    });

    it('set should be a no-op', async () => {
      await expect(service.set('key', 'value')).resolves.toBeUndefined();
    });

    it('del should be a no-op', async () => {
      await expect(service.del('key')).resolves.toBeUndefined();
    });

    it('getJson should return null', async () => {
      const result = await service.getJson('key');
      expect(result).toBeNull();
    });

    it('setJson should be a no-op', async () => {
      await expect(service.setJson('key', { data: true })).resolves.toBeUndefined();
    });
  });
});
