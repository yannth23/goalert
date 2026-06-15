const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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

  // 204 No Content — sem body para parsear
  if (res.status === 204) return undefined as T;

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: { id: string; email: string; name?: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),

  register: (email: string, password: string, name?: string) =>
    request<{ id: string; email: string; name?: string }>('/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  // Matches
  getTodayMatches: () =>
    request<{
      id: string;
      date: string;
      championship: string;
      team1: string;
      team2: string;
      status: string;
      team1Score?: number;
      team2Score?: number;
    }[]>('/matches'),

  // Standings
  getStandings: () =>
    request<unknown[]>('/matches/standings'),

  // Top Scorers
  getTopScorers: () =>
    request<{
      playerId: number;
      playerName: string;
      teamName: string;
      goals: number;
      assists: number;
    }[]>('/matches/scorers'),

  // Favorites
  getFavoriteTeams: (userId: string) =>
    request<{ id: string; teamName: string }[]>(`/users/${userId}/teams`),

  addFavoriteTeam: (userId: string, teamName: string) =>
    request<{ id: string; teamName: string }>(`/users/${userId}/teams`, {
      method: 'POST',
      body: JSON.stringify({ teamName }),
    }),

  removeFavoriteTeam: (userId: string, teamName: string) =>
    request<void>(`/users/${userId}/teams/${encodeURIComponent(teamName)}`, {
      method: 'DELETE',
    }),

  // Preferences
  updatePreferences: (userId: string, receiveDailyNotifications: boolean) =>
    request<{ receiveDailyNotifications: boolean }>(`/users/${userId}/preferences`, {
      method: 'PATCH',
      body: JSON.stringify({ receiveDailyNotifications }),
    }),

  // User
  getUser: (userId: string) =>
    request<{
      id: string;
      email: string;
      name?: string;
      favoriteTeams: { id: string; teamName: string }[];
      preferences: { receiveDailyNotifications: boolean } | null;
    }>(`/users/${userId}`),
};
