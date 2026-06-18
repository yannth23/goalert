const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

if (typeof window !== 'undefined') {
  console.log('[GoalAlert] API_URL:', API_URL);
}

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

export const api = {
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

  getStandings: () =>
    request<unknown[]>('/matches/standings'),

  getTopScorers: () =>
    request<{
      playerId: number;
      playerName: string;
      teamName: string;
      goals: number;
      assists: number;
    }[]>('/matches/scorers'),

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

  updatePreferences: (userId: string, receiveDailyNotifications: boolean) =>
    request<{ receiveDailyNotifications: boolean }>(`/users/${userId}/preferences`, {
      method: 'PATCH',
      body: JSON.stringify({ receiveDailyNotifications }),
    }),

  updateWhatsapp: (
    userId: string,
    whatsappNumber: string | null,
    receiveWhatsappNotifications: boolean,
  ) =>
    request<{ whatsappNumber: string | null; receiveWhatsappNotifications: boolean }>(
      `/users/${userId}/whatsapp`,
      {
        method: 'PATCH',
        body: JSON.stringify({ whatsappNumber, receiveWhatsappNotifications }),
      },
    ),

  updateTelegram: (
    userId: string,
    telegramChatId: string | null,
    receiveTelegramNotifications: boolean,
  ) =>
    request<{ telegramChatId: string | null; receiveTelegramNotifications: boolean }>(
      `/users/${userId}/telegram`,
      {
        method: 'PATCH',
        body: JSON.stringify({ telegramChatId, receiveTelegramNotifications }),
      },
    ),

  getUser: (userId: string) =>
    request<{
      id: string;
      email: string;
      name?: string;
      favoriteTeams: { id: string; teamName: string }[];
      preferences: {
        receiveDailyNotifications: boolean;
        receiveWhatsappNotifications: boolean;
        whatsappNumber: string | null;
        receiveTelegramNotifications: boolean;
        telegramChatId: string | null;
      } | null;
    }>(`/users/${userId}`),
};
