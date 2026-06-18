import { JwtStrategy } from './jwt.stategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    strategy = new JwtStrategy();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('validate', () => {
    it('should return user object from JWT payload', async () => {
      const payload = { sub: 'user-1', email: 'test@example.com' };
      const result = await strategy.validate(payload);

      expect(result).toEqual({ id: 'user-1', email: 'test@example.com' });
    });
  });
});
