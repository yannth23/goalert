'use client';

import { use } from 'react';
import { TeamTacticsPage } from '@/views/TeamTacticsPage';

export default function PaisPage({ params }: { params: Promise<{ nome: string }> }) {
  const { nome } = use(params);
  return <TeamTacticsPage teamName={decodeURIComponent(nome)} />;
}
