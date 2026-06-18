import axios from 'axios';
import { TelegramService } from './telegram.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TelegramService', () => {
  let service: TelegramService;

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    service = new TelegramService();
  });

  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    jest.resetAllMocks();
  });

  describe('sendMessage', () => {
    it('should post to Telegram API with Markdown parse mode', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      await service.sendMessage('12345', 'Hello *World*');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest-bot-token/sendMessage',
        {
          chat_id: '12345',
          text: 'Hello *World*',
          parse_mode: 'Markdown',
        },
      );
    });

    it('should not throw when API call fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('network error'));

      await expect(service.sendMessage('12345', 'test')).resolves.toBeUndefined();
    });

    it('should not call API when token is not configured', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      const noTokenService = new TelegramService();

      await noTokenService.sendMessage('12345', 'test');

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });
});
