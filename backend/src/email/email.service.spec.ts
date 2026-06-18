import { EmailService } from './email.service';

const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.RESEND_FROM_EMAIL = 'GoalAlert <test@example.com>';
    mockSend.mockReset();
    service = new EmailService();
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  it('should send email successfully', async () => {
    mockSend.mockResolvedValue({ error: null });

    await service.sendDailyEmail('user@example.com', '<h1>Matches</h1>');

    expect(mockSend).toHaveBeenCalledWith({
      from: 'GoalAlert <test@example.com>',
      to: 'user@example.com',
      subject: "Today's Matches — GoalAlert",
      html: '<h1>Matches</h1>',
    });
  });

  it('should throw when Resend returns an error', async () => {
    mockSend.mockResolvedValue({ error: { message: 'Invalid API key' } });

    await expect(
      service.sendDailyEmail('user@example.com', '<h1>Matches</h1>'),
    ).rejects.toThrow('Invalid API key');
  });
});
