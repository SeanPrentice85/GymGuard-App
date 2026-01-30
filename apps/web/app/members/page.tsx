'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, MessageSquare, CheckCircle2 } from 'lucide-react';

export default function MemberDirectory() {
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => { fetchMembers(); }, [supabase]);

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*').order('last_name');
    setMembers(data || []);
    setLoading(false);
  };

  const sendText = async (id: string) => {
    try {
      const res = await fetch('http://localhost:8000/api/messages/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: id })
      });
      if (res.ok) {
        await supabase.from('members').update({ last_contacted_at: new Date().toISOString() }).eq('id', id);
        alert("Success! Message delivered.");
        fetchMembers();
      }
    } catch (err) { alert("Backend Connection Failed"); }
  };

  const filtered = members.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Member Directory</h1>
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        <input 
          className="w-full pl-10 pr-4 py-2 border rounded-lg" 
          placeholder="Search name..." 
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.map(m => (
          <Card key={m.id}>
            <CardContent className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center font-bold">
                  {m.first_name[0]}{m.last_name[0]}
                </div>
                <div>
                  <p className="font-semibold">{m.first_name} {m.last_name}</p>
                  <p className="text-xs text-gray-400">
                    {m.last_contacted_at ? `Contacted: ${new Date(m.last_contacted_at).toLocaleDateString()}` : "Not contacted"}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => sendText(m.id)}>
                <MessageSquare className="mr-2 h-4 w-4" /> Text
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}