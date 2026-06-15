'use client';

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

export function SignupForm() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.register(email, password, name);
      const data = await api.login(email, password);
      login(data.accessToken, data.user);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="signup" className="px-4 py-16">
      <div className="max-w-lg mx-auto">

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">

          <h2 className="text-3xl font-black text-center mb-2">
            Criar conta grátis
          </h2>
          <p className="text-slate-400 text-sm text-center mb-8">
            Receba os jogos dos seus times todo dia no email
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950 border border-red-800 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-600"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-600"
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-600"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-4 rounded-xl transition"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

        </div>

      </div>
    </section>
  );
}