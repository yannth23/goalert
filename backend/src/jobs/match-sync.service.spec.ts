import { MatchSyncService } from './match-sync.service';
import { FootballApiService } from '../football-match/football-api.service';

describe('MatchSyncService', () => {
  let service: MatchSyncService;
  let footballApi: Partial<Record<keyof FootballApiService, jest.Mock>>;

  beforeEach(() => {
    footballApi = {
      syncTodayMatches: jest.fn(),
    };
    service = new MatchSyncService(footballApi as unknown as FootballApiService);
  });

  describe('handleDailySync', () => {
    it('should call syncTodayMatches', async () => {
      footballApi.syncTodayMatches!.mockResolvedValue({ synced: 10 });

      await service.handleDailySync();

      expect(footballApi.syncTodayMatches).toHaveBeenCalledTimes(1);
    });

    it('should not throw when sync fails', async () => {
      footballApi.syncTodayMatches!.mockRejectedValue(new Error('API error'));

      await expect(service.handleDailySync()).resolves.toBeUndefined();
    });
  });

  describe('handleLiveUpdate', () => {
    it('should call syncTodayMatches', async () => {
      footballApi.syncTodayMatches!.mockResolvedValue({ synced: 5 });

      await service.handleLiveUpdate();

      expect(footballApi.syncTodayMatches).toHaveBeenCalledTimes(1);
    });

    it('should not throw when sync fails', async () => {
      footballApi.syncTodayMatches!.mockRejectedValue(new Error('error'));

      await expect(service.handleLiveUpdate()).resolves.toBeUndefined();
    });
  });
});
