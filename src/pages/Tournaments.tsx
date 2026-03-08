import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Button, Card, SectionTitle } from '../components/ui';

async function fetchTournaments() {
  const { data, error } = await supabase.from('tournaments')
    .select('id,name,platform,format,status,created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export function Tournaments() {
  const { data, isLoading, error } = useQuery({ queryKey: ['tournaments'], queryFn: fetchTournaments });
  return (
    <div className="container py-4">
      <div className="flex items-center justify-between">
        <SectionTitle>Tournaments</SectionTitle>
        <Link to="/tournaments/create"><Button>+ Create</Button></Link>
      </div>
      {isLoading && <div>Loading...</div>}
      {error && <div className="text-red-600">{(error as any).message}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((t:any)=>(
          <Card key={t.id}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">{t.name}</div>
                <div className="text-sm text-gray-500">{t.platform} • {t.format}</div>
              </div>
              <span className={`badge ${t.status==='ongoing' ? 'badge-green' : t.status==='open' ? 'badge-yellow' : 'badge-gray'}`}>{t.status}</span>
            </div>
            <div className="mt-3">
              <Link to={`/tournaments/${t.id}`} className="text-primary-600 hover:underline">View details →</Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}