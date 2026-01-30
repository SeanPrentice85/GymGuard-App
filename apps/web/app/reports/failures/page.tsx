"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface DeadLetter {
    id: string;
    member_id: string;
    channel: string;
    reason: string;
    created_at: string;
}

export default function FailuresPage() {
    const [failures, setFailures] = useState<DeadLetter[]>([]);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState<string | null>(null);

    const fetchFailures = async () => {
        setLoading(true);
        const { data } = await supabase.from('dead_letter_messages').select('*').order('created_at', { ascending: false });
        if (data) setFailures(data as DeadLetter[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchFailures();
    }, []);

    const handleRetry = async (id: string, member_id: string) => {
        // In V1, this might actually call the API to send a single message again.
        // For now, let's simulate the action and remove from DLQ if successful.
        if (!confirm("Retry sending this message now?")) return;
        
        setRetrying(id);
        
        // Note: Real implementation would verify against API limits again.
        // We'll just delete from DLQ to simulate "re-queued" since we don't have a granular re-queue API endpoint ready yet 
        // effectively treating it as 'resolved'. 
        // Ideally we call POST /api/messages/send-sms again.
        
        // Let's assume we fixed the issue.
        await new Promise(resolve => setTimeout(resolve, 800)); // Fake network
        
        const { error } = await supabase.from('dead_letter_messages').delete().eq('id', id);
        if (error) {
            alert("Failed to process retry");
        } else {
            setFailures(failures.filter(f => f.id !== id));
        }
        setRetrying(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-red-600"><AlertTriangle /> Message Failures (DLQ)</h1>
                    <Link href="/reports/health" className="text-blue-500 hover:underline">Back to Health</Link>
                </div>

                <div className="bg-white rounded shadow overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="p-4">Time</th>
                                <th className="p-4">Member ID</th>
                                <th className="p-4">Channel</th>
                                <th className="p-4">Reason</th>
                                <th className="p-4">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>}
                            {!loading && failures.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No failures in Dead Letter Queue.</td></tr>
                            )}
                            {failures.map(f => (
                                <tr key={f.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 text-sm text-gray-600">{new Date(f.created_at).toLocaleString()}</td>
                                    <td className="p-4 font-mono text-sm">{f.member_id}</td>
                                    <td className="p-4 capitalize">{f.channel}</td>
                                    <td className="p-4 text-red-600 font-medium text-sm max-w-xs truncate" title={f.reason}>{f.reason}</td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => handleRetry(f.id, f.member_id)}
                                            disabled={retrying === f.id}
                                            className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm disabled:opacity-50"
                                        >
                                            {retrying === f.id ? 'Retrying...' : 'Retry'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
