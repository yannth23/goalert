const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://goal-alert.onrender.com';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message ?? 'Erro na requisição');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface SystemStatus {
  lastSync: {
    ts:     string;
    source: 'primary' | 'sofascore' | 'espn' | 'none';
    synced: number;
    live:   number;
    errors: number;
  } | null;
  redis:               { connected: boolean };
  matches:             { total: number; live: number };
  errorsToday:         number;
  consecutiveFailures: number;
  serverTime:          string;
}

export interface BracketMetadata {
  flags: Record<string, string>;
  groups: Record<string, string[]>;
  qualifiedThirdGroups: string[];
  roundOf32Fixture: { id: number; homeSlot: string; awaySlot: string }[];
  roundOf16Pairs: [number, number][];
}

export interface H2HData {
  homeTeam: string;
  awayTeam: string;
  homeWins: number;
  draws: number;
  awayWins: number;
  totalGoalsHome: number;
  totalGoalsAway: number;
  totalMatches: number;
  recentMatches: {
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    championship: string;
  }[];
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: { id: string; email: string; name?: string } }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (email: string, password: string, name?: string) =>
    request<{ id: string; email: string; name?: string }>('/users', { method: 'POST', body: JSON.stringify({ email, password, name }) }),

  getTodayMatches: () =>
    request<{ id: string; date: string; championship: string; team1: string; team2: string; status: string; team1Score?: number; team2Score?: number }[]>('/matches'),

  getCalendar: (month?: string) =>
    request<{ date: string; count: number }[]>(`/matches/calendar${month ? `?month=${month}` : ''}`),

  getStandings: () => request<unknown[]>('/matches/standings'),

  /** Fonte única de bandeiras/grupos/fixture do bracket — não duplique isso localmente. */
  getMetadata: () => request<BracketMetadata>('/matches/metadata'),

  getByCompetition: (name: string) =>
    request<{
      id: string; date: string; championship: string;
      team1: string; team2: string; status: string;
      team1Score?: number; team2Score?: number;
    }[]>(`/matches/competition?name=${encodeURIComponent(name)}`),

  getAllByCompetition: (name: string) =>
    request<{
      id: string; date: string; championship: string;
      team1: string; team2: string; status: string;
      team1Score?: number; team2Score?: number;
    }[]>(`/matches/all-competition?name=${encodeURIComponent(name)}`),

  getTopScorers: () =>
    request<{ playerId: number; playerName: string; teamName: string; goals: number; assists: number }[]>('/matches/scorers'),

  getHeadToHead: (team1: string, team2: string) =>
    request<H2HData>(`/matches/h2h?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`),

  getSystemStatus: () => request<SystemStatus>('/matches/system-status'),

  getTeamReport: (name: string) => request<{ teamName: string; report: string; news: any[] }>(`/matches/team-report?name=${encodeURIComponent(name)}`),

  forceSync: () => request<{ synced: number; live: number; errors: number; source: string }>('/matches/sync', { method: 'POST' }),

  resetAndSync: (secret: string) => 
    request<{ synced: number; live: number; errors: number; source: string }>('/matches/reset-and-sync', { 
      method: 'POST',
      headers: { 'x-admin-secret': secret }
    }),

  syncAllWorldCup: (secret: string) =>
    request<{ synced: number; errors: number }>('/matches/sync-all-world-cup', {
      method: 'POST',
      headers: { 'x-admin-secret': secret }
    }),

  getFavoriteTeams: (userId: string) => request<{ id: string; teamName: string }[]>(`/users/${userId}/teams`),

  addFavoriteTeam: (userId: string, teamName: string) =>
    request<{ id: string; teamName: string }>(`/users/${userId}/teams`, { method: 'POST', body: JSON.stringify({ teamName }) }),

  removeFavoriteTeam: (userId: string, teamName: string) =>
    request<void>(`/users/${userId}/teams/${encodeURIComponent(teamName)}`, { method: 'DELETE' }),

  updatePreferences: (userId: string, receiveDailyNotifications: boolean) =>
    request<{ receiveDailyNotifications: boolean }>(`/users/${userId}/preferences`, { method: 'PATCH', body: JSON.stringify({ receiveDailyNotifications }) }),


  getUser: (userId: string) =>
    request<{ id: string; email: string; name?: string; favoriteTeams: { id: string; teamName: string }[]; preferences: { receiveDailyNotifications: boolean } | null }>(`/users/${userId}`),
};
