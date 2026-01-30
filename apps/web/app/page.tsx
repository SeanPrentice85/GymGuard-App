'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare } from 'lucide-react';

export default function GymGuardDashboard() {
  const [members, setMembers] = useState<any[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => { fetchMembers(); }, [supabase]);

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*').order('last_churn_score', { ascending: false });
    setMembers(data || []);
  };

  const handleAction = async (memberId: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/messages/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: String(memberId) }) 
      });
      if (response.ok) alert("Success! SMS sent.");
    } catch (err) { alert("Connection failed."); }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6" style={{ fontFamily: 'sans-serif' }}>
      <h1 className="text-3xl" style={{ fontWeight: 900, marginBottom: '30px', color: '#0f172a' }}>GymGuard Watchlist</h1>
      
      {members.map((m) => (
        <Card key={m.id} style={{ 
          borderLeft: '8px solid #dc2626', 
          marginBottom: '20px', 
          backgroundColor: '#fff5f5',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
        }}>
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>
                {m.first_name} {m.last_name}
              </p>
              <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginTop: '4px' }}>
                ID: {m.id.slice(0, 8)}
              </p>
            </div>

            <div className="flex items-center gap-10">
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>
                  Churn Risk
                </p>
                <p style={{ color: '#dc2626', fontSize: '42px', fontWeight: 900, margin: 0, lineHeight: 1 }}>
                  {m.last_churn_score?.toFixed(1)}%
                </p>
              </div>
              
              <Button 
                onClick={() => handleAction(m.id)} 
                style={{ backgroundColor: '#dc2626', color: 'white', fontWeight: 'bold', height: '50px', padding: '0 25px', borderRadius: '8px' }}
              >
                <MessageSquare style={{ marginRight: '8px' }} size={20} /> Text
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}