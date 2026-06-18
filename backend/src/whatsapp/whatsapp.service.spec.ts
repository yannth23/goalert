import axios from 'axios';
import { WhatsappService } from './whatsapp.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WhatsappService', () => {
  let service: WhatsappService;

  beforeEach(() => {
    process.env.ZAPI_INSTANCE_ID = 'inst-123';
    process.env.ZAPI_TOKEN = 'tok-abc';
    process.env.ZAPI_CLIENT_TOKEN = 'client-xyz';
    service = new WhatsappService();
  });

  afterEach(() => {
    delete process.env.ZAPI_INSTANCE_ID;
    delete process.env.ZAPI_TOKEN;
    delete process.env.ZAPI_CLIENT_TOKEN;
    jest.resetAllMocks();
  });

  describe('sendText', () => {
    it('should post to Z-API with normalized phone', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      await service.sendText('11999998888', 'Hello');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.z-api.io/instances/inst-123/token/tok-abc/send-text',
        { phone: '5511999998888', message: 'Hello' },
        expect.objectContaining({
          headers: expect.objectContaining({ 'Client-Token': 'client-xyz' }),
        }),
      );
    });

    it('should not prepend 55 if phone already starts with 55', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      await service.sendText('5511999998888', 'Hello');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ phone: '5511999998888' }),
        expect.any(Object),
      );
    });

    it('should strip non-digit characters from phone', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      await service.sendText('+55 (11) 99999-8888', 'Hi');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ phone: '5511999998888' }),
        expect.any(Object),
      );
    });

    it('should not throw when API call fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('network error'));

      await expect(service.sendText('11999998888', 'test')).resolves.toBeUndefined();
    });
  });
});
