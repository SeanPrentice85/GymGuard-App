"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import Link from 'next/link';

interface AuditLog {
    id: string;
    action: string;
    entity_type: string | null;
    metadata: any;
    created_at: string;
    user_id: string;
}

export default function ActivityPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
             setLoading(true);
             const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (error) {
                console.error("Error fetching logs:", error);
            } else {
                setLogs(data as AuditLog[]);
            }
            setLoading(false);
        };
        fetchLogs();
    }, []);

    const formatMetadata = (meta: any) => {
        if (!meta) return '';
        return JSON.stringify(meta).replace(/[{}"\\]/g, ' ').trim();
        // Or prettier formatting if needed, but simple string is fine for V1
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Activity Log</h1>
                    <Link href="/home" className="text-blue-500 hover:underline font-semibold">Back to Dashboard</Link>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b font-bold bg-gray-50 flex justify-between">
                         <span>Recent Actions</span>
                         <span className="text-xs text-gray-500 font-normal">Last 100 events</span>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading activity...</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-gray-600">
                                <tr>
                                    <th className="p-3">Time</th>
                                    <th className="p-3">Action</th>
                                    <th className="p-3">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 whitespace-nowrap text-gray-500">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-3 font-medium text-gray-900">
                                            {log.action}
                                        </td>
                                        <td className="p-3 text-gray-600 font-mono text-xs">
                                            {log.entity_type && <span className="mr-2 px-1.5 py-0.5 bg-gray-200 rounded text-gray-700">{log.entity_type}</span>}
                                            {formatMetadata(log.metadata)}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr><td colSpan={3} className="p-8 text-center text-gray-500">No activity recorded yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
