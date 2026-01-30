"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import Link from 'next/link';
import { Activity, AlertTriangle, CheckCircle, Mail, MessageSquare } from 'lucide-react';

interface HealthStats {
    total_sent: number;
    total_failed: number;
    total_retrying: number;
    dlq_count: number;
    opt_out_skips: number;
}

export default function HealthDashboard() {
    const [stats, setStats] = useState<HealthStats>({ total_sent: 0, total_failed: 0, total_retrying: 0, dlq_count: 0, opt_out_skips: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHealth = async () => {
             // Total Sent (All Time)
             const { count: sent } = await supabase.from('message_sends').select('*', { count: 'exact', head: true }).eq('final_status', 'sent');
             
             // Total Failed (Final)
             const { count: failed } = await supabase.from('message_sends').select('*', { count: 'exact', head: true }).eq('final_status', 'failed');
             
             // Retrying (Pending/Queued with attempts > 0 maybe? or just check campaign recipients queued?)
             // For simplicity, let's query message_sends pending
             const { count: retrying } = await supabase.from('message_sends').select('*', { count: 'exact', head: true }).or('final_status.eq.pending,final_status.eq.queued').gt('attempt_count', 0);

             // DLQ Count
             const { count: dlq } = await supabase.from('dead_letter_messages').select('*', { count: 'exact', head: true });

             // Opt Outs (Campaign Recipients skipped)
             const { count: skipped } = await supabase.from('campaign_recipients').select('*', { count: 'exact', head: true }).eq('status', 'skipped_opted_out');

            setStats({
                total_sent: sent || 0,
                total_failed: failed || 0,
                total_retrying: retrying || 0,
                dlq_count: dlq || 0,
                opt_out_skips: skipped || 0
            });
            setLoading(false);
        };
        fetchHealth();
    }, []);

    if (loading) return <div className="p-8">Loading health stats...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Activity /> System Health</h1>
                    <Link href="/reports" className="text-blue-500 hover:underline">Back to Reports</Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="text-gray-500 font-bold mb-1">Successfully Sent</p>
                                <h2 className="text-3xl font-bold">{stats.total_sent}</h2>
                             </div>
                             <CheckCircle className="text-green-500" />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded shadow border-l-4 border-red-500">
                         <div className="flex justify-between items-start">
                             <div>
                                <p className="text-gray-500 font-bold mb-1">Failures (Final)</p>
                                <h2 className="text-3xl font-bold">{stats.total_failed}</h2>
                             </div>
                             <AlertTriangle className="text-red-500" />
                        </div>
                        <div className="mt-4 pt-4 border-t flex justify-between items-center">
                            <span className="text-sm text-gray-500">Dead Letter Queue: <strong>{stats.dlq_count}</strong></span>
                            <Link href="/reports/failures" className="text-red-600 text-sm hover:underline">View Failures</Link>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded shadow border-l-4 border-yellow-500">
                         <div className="flex justify-between items-start">
                             <div>
                                <p className="text-gray-500 font-bold mb-1">Skipped (Opt-Outs)</p>
                                <h2 className="text-3xl font-bold">{stats.opt_out_skips}</h2>
                             </div>
                             <MessageSquare className="text-yellow-500" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
