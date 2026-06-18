import { FootballMatchController } from './football-match.controller';
import { FootballMatchService } from './football-match.service';
import { FootballApiService } from './football-api.service';

describe('FootballMatchController', () => {
  let controller: FootballMatchController;
  let matchService: Partial<Record<keyof FootballMatchService, jest.Mock>>;
  let apiService: Partial<Record<keyof FootballApiService, jest.Mock>>;

  beforeEach(() => {
    matchService = {
      getTodayMatches: jest.fn(),
      getMatchesByCompetition: jest.fn(),
      getStandings: jest.fn(),
      getTopScorers: jest.fn(),
    };
    apiService = {
      syncTodayMatches: jest.fn(),
    };
    controller = new FootballMatchController(
      matchService as unknown as FootballMatchService,
      apiService as unknown as FootballApiService,
    );
  });

  it('getTodayMatches() should delegate to service', async () => {
    matchService.getTodayMatches!.mockResolvedValue([]);
    const result = await controller.getTodayMatches();
    expect(result).toEqual([]);
  });

  it('getByCompetition() should delegate to service', async () => {
    matchService.getMatchesByCompetition!.mockResolvedValue([]);
    const result = await controller.getByCompetition('WC');
    expect(matchService.getMatchesByCompetition).toHaveBeenCalledWith('WC');
    expect(result).toEqual([]);
  });

  it('getStandings() should delegate to service', async () => {
    matchService.getStandings!.mockResolvedValue([]);
    const result = await controller.getStandings();
    expect(result).toEqual([]);
  });

  it('getTopScorers() should delegate to service', async () => {
    matchService.getTopScorers!.mockResolvedValue([]);
    const result = await controller.getTopScorers();
    expect(result).toEqual([]);
  });

  it('syncMatches() should delegate to apiService', async () => {
    apiService.syncTodayMatches!.mockResolvedValue({ synced: 5 });
    const result = await controller.syncMatches();
    expect(result).toEqual({ synced: 5 });
  });
});
