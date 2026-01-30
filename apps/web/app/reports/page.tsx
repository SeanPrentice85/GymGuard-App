"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import Link from 'next/link';

interface DailyMetric {
    id: string;
    metric_date: string;
    high_risk_count: number;
    contacted_last_1d_count: number;
    email_open_count: number;
    email_click_count: number;
    sms_sent_count: number;
    email_sent_count: number;
    sms_click_count: number;
}

interface OutreachStats {
    contacts_count: number;
    measured_count: number;
    avg_delta_7d: number;
    improved_percent_7d: number;
}

export default function ReportsPage() {
    const [metrics, setMetrics] = useState<DailyMetric[]>([]);
    const [outreachStats, setOutreachStats] = useState<OutreachStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
             setLoading(true);
             const { data: dailyData } = await supabase
                .from('gym_daily_metrics')
                .select('*')
                .order('metric_date', { ascending: false })
                .limit(30);
            
            if (dailyData) setMetrics(dailyData as DailyMetric[]);

            // Fetch Effectiveness Stats (Latest)
            const { data: effData } = await supabase
                .from('gym_outreach_effectiveness_daily')
                .select('*')
                .order('metric_date', { ascending: false })
                .limit(1)
                .single();
            
            if (effData) setOutreachStats(effData);

            setLoading(false);
        };
        fetchMetrics();
    }, []);

    // Latest snapshot (Today or Yesterday)
    const latest = metrics[0] || {
        high_risk_count: 0,
        contacted_last_1d_count: 0,
        email_open_count: 0,
        email_click_count: 0,
        sms_click_count: 0,
        sms_sent_count: 0,
        email_sent_count: 0
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Daily Metrics Report</h1>
                    <div className="flex gap-4">
                        <Link href="/reports/health" className="text-green-600 hover:underline font-semibold">System Health</Link>
                        <Link href="/home" className="text-blue-500 hover:underline">Back to Dashboard</Link>
                    </div>
                </div>

                {/* Cards Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                     <div className="bg-white p-6 rounded shadow border-l-4 border-red-500">
                        <h3 className="text-gray-500 font-bold mb-1 text-sm">High Risk (Snapshot)</h3>
                        <p className="text-3xl font-bold">{latest.high_risk_count}</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500">
                        <h3 className="text-gray-500 font-bold mb-1 text-sm">Contacted (24h)</h3>
                        <p className="text-3xl font-bold">{latest.contacted_last_1d_count}</p>
                    </div>

                    <div className="bg-white p-6 rounded shadow border-l-4 border-yellow-500">
                        <h3 className="text-gray-500 font-bold mb-1 text-sm">Email Opens (24h)</h3>
                        <p className="text-3xl font-bold">{latest.email_open_count}</p>
                    </div>

                     <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
                        <h3 className="text-gray-500 font-bold mb-1 text-sm">Clicks (SMS+Email)</h3>
                        <p className="text-3xl font-bold">{latest.sms_click_count + latest.email_click_count}</p>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                    <div className="p-4 border-b font-bold bg-gray-50 flex justify-between items-center">
                        <span>Past 30 Days</span>
                        <span className="text-xs text-gray-500 font-normal">Updated Daily via n8n</span>
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading metrics...</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-gray-600">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">High Risk</th>
                                    <th className="p-3">Contacted</th>
                                    <th className="p-3">Sent (SMS/Email)</th>
                                    <th className="p-3">Opens</th>
                                    <th className="p-3">Clicks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.map(row => (
                                    <tr key={row.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-medium">{new Date(row.metric_date).toLocaleDateString()}</td>
                                        <td className="p-3 text-red-600 font-semibold">{row.high_risk_count}</td>
                                        <td className="p-3 text-blue-600">{row.contacted_last_1d_count}</td>
                                        <td className="p-3">{row.sms_sent_count} / {row.email_sent_count}</td>
                                        <td className="p-3">{row.email_open_count}</td>
                                        <td className="p-3">{row.sms_click_count + row.email_click_count}</td>
                                    </tr>
                                ))}
                                {metrics.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">No daily metrics generated yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Outreach Effectiveness Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4">Outreach Effectiveness (Before vs After)</h2>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                            <div>
                                <h3 className="text-gray-500 font-semibold text-sm mb-1">Total Contacts</h3>
                                <p className="text-2xl font-bold">{outreachStats?.contacts_count || 0}</p>
                            </div>
                            <div>
                                <h3 className="text-gray-500 font-semibold text-sm mb-1">Measured (7d Follow-up)</h3>
                                <p className="text-2xl font-bold text-blue-600">{outreachStats?.measured_count || 0}</p>
                            </div>
                            <div>
                                <h3 className="text-gray-500 font-semibold text-sm mb-1">Avg Score Change</h3>
                                <p className={`text-2xl font-bold ${(outreachStats?.avg_delta_7d || 0) < 0 ? 'text-green-600' : 'text-gray-800'}`}>
                                    {(outreachStats?.avg_delta_7d || 0).toFixed(1)}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-gray-500 font-semibold text-sm mb-1">% Improved</h3>
                                <p className="text-2xl font-bold text-green-600">{(outreachStats?.improved_percent_7d || 0).toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t text-xs text-gray-500 text-center">
                            Note: This compares churn scores before outreach vs. 7 days after. It indicates correlation, not necessarily causation.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
