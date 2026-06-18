import { KeepAliveService } from './keep-alive.service';

describe('KeepAliveService', () => {
  let service: KeepAliveService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new KeepAliveService();
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200 } as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env.BACKEND_URL;
  });

  it('should ping the default URL when BACKEND_URL is not set', async () => {
    await service.ping();

    expect(fetchSpy).toHaveBeenCalledWith('https://goal-alert.onrender.com/health');
  });

  it('should ping the custom BACKEND_URL when set', async () => {
    process.env.BACKEND_URL = 'https://custom.example.com';

    await service.ping();

    expect(fetchSpy).toHaveBeenCalledWith('https://custom.example.com/health');
  });

  it('should not throw when ping fails', async () => {
    fetchSpy.mockRejectedValue(new Error('network'));

    await expect(service.ping()).resolves.toBeUndefined();
  });
});
