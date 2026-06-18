import { translateTeam, TEAM_TRANSLATIONS } from './translation.util';

describe('translateTeam', () => {
  it('should translate known English team names to Portuguese', () => {
    expect(translateTeam('Brazil')).toBe('Brasil');
    expect(translateTeam('Germany')).toBe('Alemanha');
    expect(translateTeam('France')).toBe('França');
    expect(translateTeam('Argentina')).toBe('Argentina');
    expect(translateTeam('United States')).toBe('Estados Unidos');
  });

  it('should return the original name when no translation exists', () => {
    expect(translateTeam('Unknown FC')).toBe('Unknown FC');
    expect(translateTeam('')).toBe('');
  });

  it('should handle overridden translations correctly', () => {
    expect(translateTeam('Curaçao')).toBe('Curaçau');
    expect(translateTeam('Czech Republic')).toBe('República Tcheca');
  });

  it('should have entries for common World Cup teams', () => {
    const expected = ['Brazil', 'Germany', 'France', 'Spain', 'Italy', 'England', 'Japan', 'Mexico'];
    for (const team of expected) {
      expect(TEAM_TRANSLATIONS[team]).toBeDefined();
    }
  });
});
