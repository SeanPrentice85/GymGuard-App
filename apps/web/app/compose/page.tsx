'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, User, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function GymGuardDashboard() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => { fetchMembers(); }, [supabase]);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('last_churn_score', { ascending: false });
    if (error) console.error(error);
    else setMembers(data || []);
    setLoading(false);
  };

  const handleAction = async (memberId: string, isMass: boolean = false) => {
    setIsProcessing(true);
    try {
      // 1. Trigger Python Backend (Port 8000)
      const url = isMass 
        ? 'http://localhost:8000/api/campaigns/start-mass-outreach' 
        : 'http://localhost:8000/api/messages/send-sms';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isMass ? { min_score: 70 } : { member_id: memberId })
      });

      if (!response.ok) throw new Error("Backend Outreach Failed");

      // 2. Update Supabase
      if (!isMass) {
        await supabase.from('members').update({ last_contacted_at: new Date().toISOString() }).eq('id', memberId);
        setMembers(prev => prev.filter(m => m.id !== memberId));
      } else {
        await fetchMembers();
      }

      alert(isMass ? "Mass Outreach Campaign Started!" : "Success! SMS sent to member.");
    } catch (err) {
      alert("Error: Ensure Python Backend is running on Port 8000.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Watchlist...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">High-Risk Watchlist</h1>
        <Button 
          variant="destructive" 
          onClick={() => handleAction('', true)} 
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : "Mass Outreach (70%+)"}
        </Button>
      </div>

      <div className="grid gap-4">
        {members.filter(m => !m.last_contacted_at).map((m) => (
          <Card key={m.id} className={cn("border-l-4", m.last_churn_score >= 70 ? "border-l-red-500" : "border-l-orange-500")}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">{m.first_name} {m.last_name}</p>
                <p className="text-sm text-gray-500">ID: {m.id.slice(0, 8)}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs uppercase text-gray-500 font-semibold">Churn Risk</p>
                  <p className="text-2xl font-black text-red-600">{m.last_churn_score?.toFixed(1)}%</p>
                </div>
                <Button onClick={() => handleAction(m.id)} disabled={isProcessing}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Text
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}