"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import Link from 'next/link';

interface LogEntry {
    id: string;
    member_id: string;
    channel: string;
    message_body: string;
    sent_at: string;
}

export default function ContactedPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    
    useEffect(() => {
        const fetchContacted = async () => {
             // Calculate 24 hours ago (if we want to limit view, but requirement 3.2.2 says "not just members... real audit trail", implies showing recent logs)
             // Phase 4D said "within last 1 day". Let's keep that filter but query the log now.
             const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

             const { data } = await supabase
                .from('contacted_log')
                .select('*')
                .gte('sent_at', oneDayAgo)
                .order('sent_at', { ascending: false });
            
            if (data) setLogs(data as LogEntry[]);
        };
        fetchContacted();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Recently Contacted (Last 24h)</h1>
                    <Link href="/home" className="text-blue-500">Back to Dashboard</Link>
                </div>
                <div className="bg-white rounded shadow">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="p-4">Member ID</th>
                                <th className="p-4">Channel</th>
                                <th className="p-4">Sent At</th>
                                <th className="p-4">Snippet</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id} className="border-b">
                                    <td className="p-4">{log.member_id}</td>
                                    <td className="p-4 capitalize">{log.channel}</td>
                                    <td className="p-4">{new Date(log.sent_at).toLocaleString()}</td>
                                    <td className="p-4 text-gray-500 truncate max-w-xs">{log.message_body}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {logs.length === 0 && <p className="p-4 text-gray-500">No recent logs.</p>}
                </div>
            </div>
        </div>
    );
}
