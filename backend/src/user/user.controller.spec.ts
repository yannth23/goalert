import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let service: Partial<Record<keyof UserService, jest.Mock>>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      addFavoriteTeam: jest.fn(),
      removeFavoriteTeam: jest.fn(),
      updatePreferences: jest.fn(),
      updateTelegram: jest.fn(),
    };
    controller = new UserController(service as unknown as UserService);
  });

  it('create() should delegate to service', async () => {
    service.create!.mockResolvedValue({ id: '1' });
    const result = await controller.create({ email: 'a@b.com', password: 'pw', name: 'A' });
    expect(service.create).toHaveBeenCalledWith('a@b.com', 'pw', 'A');
    expect(result).toEqual({ id: '1' });
  });

  it('findAll() should delegate to service', async () => {
    service.findAll!.mockResolvedValue([]);
    const result = await controller.findAll();
    expect(result).toEqual([]);
  });

  it('findById() should delegate to service', async () => {
    service.findById!.mockResolvedValue({ id: '1' });
    const result = await controller.findById('1');
    expect(service.findById).toHaveBeenCalledWith('1');
    expect(result).toEqual({ id: '1' });
  });

  it('addFavoriteTeam() should delegate to service', async () => {
    service.addFavoriteTeam!.mockResolvedValue({});
    await controller.addFavoriteTeam('1', { teamName: 'Brasil' });
    expect(service.addFavoriteTeam).toHaveBeenCalledWith('1', 'Brasil');
  });

  it('removeFavoriteTeam() should delegate to service', async () => {
    service.removeFavoriteTeam!.mockResolvedValue({});
    await controller.removeFavoriteTeam('1', 'Brasil');
    expect(service.removeFavoriteTeam).toHaveBeenCalledWith('1', 'Brasil');
  });

  it('updatePreferences() should delegate to service', async () => {
    service.updatePreferences!.mockResolvedValue({});
    await controller.updatePreferences('1', { receiveDailyNotifications: true });
    expect(service.updatePreferences).toHaveBeenCalledWith('1', true);
  });

  it('updateTelegram() should delegate to service', async () => {
    service.updateTelegram!.mockResolvedValue({});
    await controller.updateTelegram('1', {
      telegramChatId: '123',
      receiveTelegramNotifications: true,
    });
    expect(service.updateTelegram).toHaveBeenCalledWith('1', '123', true);
  });
});
