"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient'; // Adjusted path
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Megaphone, RefreshCw } from 'lucide-react';

// Update Member interface to match exact schema
interface Member {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  last_churn_score: number | null;
  last_score_date: string | null;
  is_high_risk: boolean;
  last_contacted_at: string | null;
  email?: string;
  phone?: string;
  gym_id: string;
  sms_opted_out: boolean;
}

export default function HomePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [massSending, setMassSending] = useState(false);
  const [showMassModal, setShowMassModal] = useState(false);
  const router = useRouter();

  // Auth Protection
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  // Fetch Logic
  const fetchMembers = async () => {
    try {
        setLoading(true);
        // Requirement: filtered by is_high_risk=true
        // Requirement: filtered by last_contacted_at is null or > 24h ago
        // Requirement: sort by last_churn_score desc

        // Calculate 24 hours ago
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('is_high_risk', true)
            .or(`last_contacted_at.is.null,last_contacted_at.lt.${oneDayAgo}`)
            .order('last_churn_score', { ascending: false });

        if (error) throw error;
        setMembers(data as Member[]);
    } catch (error: any) {
        console.error('Error fetching members:', error.message);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Text Selection
  const handleTextClick = (member: Member) => {
    setSelectedMember(member);
    setMessage(`Hi ${member.first_name}, just checking in on your fitness goals! Reply STOP to unsubscribe.`);
  };

  // Send Logic using API
  const handleSend = async () => {
    if (!selectedMember) return;
    setSending(true);
    
    try {
        // Send via API (Phase 7C)
        // Send via API (Phase 7C -> Phase 13 Strict Auth)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/messages/send-sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                member_id: selectedMember.member_id,
                message_body: message
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "API send failed");
        }

        // Optimistic UI update: Remove member from list
        setMembers(members.filter(m => m.id !== selectedMember.id));
        setSelectedMember(null);

    } catch (error: any) {
        alert("Error sending message: " + error.message);
    } finally {
        setSending(false);
    }
  };

  // Mass Send Logic
  const handleMassSend = async () => {
      setMassSending(true);
      try {
           const { data: { session } } = await supabase.auth.getSession();
           if (!session) return;
           
           // We need gym_id. Get from profile or first member (hacky but works if list not empty, if empty button disabled)
           // Better: fetch profile.
           const { data: profile } = await supabase.from('profiles').select('gym_id').eq('user_id', session.user.id).single();
           if (!profile) throw new Error("Profile not found");

           const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/campaigns/start-mass-outreach`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    message_body: "Hi from Gym! Checking in. Reply STOP to unsubscribe." // Default template
                })
           });

           if (!response.ok) {
               const err = await response.json();
               throw new Error(err.detail || "Campaign start failed");
           }

           const resData = await response.json();
           
           // Redirect to progress page
           if (resData.campaign_id) {
               router.push(`/campaigns/progress/${resData.campaign_id}`);
           } else {
               alert("No eligible members found.");
               setShowMassModal(false);
           }

      } catch (error: any) {
          alert("Error starting campaign: " + error.message);
      } finally {
          setMassSending(false);
      }
  };

  const getRiskColor = (score: number | null) => {
    if (score === null) return 'bg-gray-100';
    if (score >= 70) return 'bg-red-100 border-red-500'; // Critical (Satisfies 3.3)
    if (score >= 60) return 'bg-yellow-100 border-yellow-500'; // At Risk
    return 'bg-green-100 border-green-500'; // Safe
  };

  const getRiskLabel = (score: number | null) => {
      if (score === null) return 'Unknown';
      if (score >= 70) return 'Critical Risk';
      if (score >= 60) return 'At Risk';
      return 'Safe';
  };

    const getRiskText = (score: number | null) => {
      if (score === null) return '';
      if (score >= 70) return 'Immediate personal phone call/outreach.';
      if (score >= 60) return 'Monitor engagement or send a "Checking In" text.';
      return 'No action needed.';
  };

  const eligibleCount = members.length; // Approximate, API will re-verify.

  // Fetch Role
  const [role, setRole] = useState<string>('gym_owner');

  useEffect(() => {
      const getRole = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).single();
            if (data?.role) setRole(data.role);
          }
      };
      getRole();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">High-Risk Watchlist</h1>
            <div className="flex gap-4 items-center">
                {role === 'admin' && (
                    <Link href="/admin" className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 text-sm font-bold">
                        Admin
                    </Link>
                )}
                <button 
                    onClick={() => setShowMassModal(true)}
                    disabled={eligibleCount === 0}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Megaphone size={16} /> Mass Message ({eligibleCount})
                </button>
                <Link href="/contacted" className="text-blue-500 hover:text-blue-700">History</Link>
                <Link href="/compose" className="text-blue-500 hover:text-blue-700">Compose</Link>
                <Link href="/reports" className="text-blue-500 hover:text-blue-700">Reports</Link>
                <Link href="/activity" className="text-blue-500 hover:text-blue-700">Activity</Link>
                <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="text-red-500">Logout</button>
            </div>
        </div>

        {/* Mock Search & Filter */}
        <div className="flex gap-4 mb-6">
            <input type="text" placeholder="Search members..." className="p-2 border rounded w-full max-w-xs" />
            <button onClick={fetchMembers} className="p-2 border rounded bg-white hover:bg-gray-50"><RefreshCw size={16} /></button>
        </div>

        {loading ? <p>Loading...</p> : (
            <div className="space-y-4">
                {members.map(member => (
                    <div key={member.id} className={`p-4 rounded-lg border-l-4 shadow-sm bg-white flex justify-between items-center ${getRiskColor(member.last_churn_score)}`}>
                        <div>
                            <p className="text-lg font-bold">{member.first_name} {member.last_name}</p>
                            <p className="text-sm text-gray-500">Member ID: <Link href={`/members/${member.member_id}`} className="hover:underline text-blue-600">{member.member_id}</Link></p>
                            <p className="text-xs mt-1 font-semibold">{getRiskLabel(member.last_churn_score)}: {getRiskText(member.last_churn_score)}</p>
                            {member.sms_opted_out && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded ml-2">Opted Out</span>}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                             <div className="text-2xl font-bold">{member.last_churn_score ? Math.round(member.last_churn_score) : 0}%</div>
                             <button
                                onClick={() => handleTextClick(member)}
                                disabled={member.sms_opted_out}
                                className={`px-4 py-2 rounded text-white ${member.sms_opted_out ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                             >
                                {member.sms_opted_out ? 'Opted Out' : 'Text'}
                             </button>
                        </div>
                    </div>
                ))}
                {members.length === 0 && <p className="text-gray-500">No high-risk members found requiring contact.</p>}
            </div>
        )}

        {/* Single Text Modal */}
        {selectedMember && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4">Text {selectedMember.first_name}</h2>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full h-32 p-2 border rounded mb-4"
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setSelectedMember(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button 
                            onClick={handleSend} 
                            disabled={sending}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {sending ? 'Sending...' : 'Send (API)'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Mass Message Modal */}
         {showMassModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4 text-red-600">Start Mass Outreach?</h2>
                    <p className="mb-4">You are about to queue messages for <strong>{eligibleCount} high-risk members</strong>.</p>
                    <p className="text-sm text-gray-500 mb-6">Eligible: Score {'>'}= 70, not contacted in 24h, not opted out.</p>
                    
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowMassModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button 
                            onClick={handleMassSend} 
                            disabled={massSending}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                            {massSending ? 'Starting...' : 'Confirm Mass Send'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
