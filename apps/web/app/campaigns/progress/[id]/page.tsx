"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Campaign {
    id: string;
    status: string;
    total_recipients: number;
    created_at: string;
}

interface CampaignCounts {
    queued: number;
    sent: number;
    failed: number;
    skipped: number;
}

export default function CampaignProgressPage() {
    const params = useParams();
    const campaignId = params.id as string;
    
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [counts, setCounts] = useState<CampaignCounts>({ queued: 0, sent: 0, failed: 0, skipped: 0 });
    const [loading, setLoading] = useState(true);

    const fetchProgress = async () => {
        if (!campaignId) return;
        
        // Fetch Campaign
        const { data: c } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
        if (c) setCampaign(c);

        // Fetch Counts
        // Queued
        const { count: queued } = await supabase.from('campaign_recipients').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'queued');
        // Sent
        const { count: sent } = await supabase.from('campaign_recipients').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'sent');
        // Failed
        const { count: failed } = await supabase.from('campaign_recipients').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'failed');
        // Skipped
        const { count: skipped } = await supabase.from('campaign_recipients').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'skipped_opted_out');

        setCounts({
            queued: queued || 0,
            sent: sent || 0,
            failed: failed || 0,
            skipped: skipped || 0
        });
        setLoading(false);
    };

    useEffect(() => {
        fetchProgress();
        const interval = setInterval(fetchProgress, 3000); // Poll every 3s
        return () => clearInterval(interval);
    }, [campaignId]);

    if (loading) return <div className="p-8">Loading campaign...</div>;
    if (!campaign) return <div className="p-8">Campaign not found.</div>;

    const percentComplete = campaign.total_recipients > 0 
        ? Math.round(((counts.sent + counts.failed + counts.skipped) / campaign.total_recipients) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto bg-white p-8 rounded shadow">
                <h1 className="text-2xl font-bold mb-2">Campaign Progress</h1>
                <p className="text-gray-500 mb-6">ID: {campaignId}</p>

                <div className="mb-6">
                    <div className="flex justify-between mb-2">
                        <span className="font-bold">Status: {campaign.status.toUpperCase()}</span>
                        <span>{percentComplete}% Complete</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                        <div className="bg-blue-600 h-4 rounded-full transition-all duration-500" style={{ width: `${percentComplete}%` }}></div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-100 p-4 rounded text-center">
                        <span className="block text-2xl font-bold">{counts.queued}</span>
                        <span className="text-sm text-gray-500">Queued</span>
                    </div>
                    <div className="bg-green-100 p-4 rounded text-center">
                        <span className="block text-2xl font-bold text-green-700">{counts.sent}</span>
                        <span className="text-sm text-green-700">Sent</span>
                    </div>
                    <div className="bg-red-100 p-4 rounded text-center">
                        <span className="block text-2xl font-bold text-red-700">{counts.failed}</span>
                        <span className="text-sm text-red-700">Failed</span>
                    </div>
                    <div className="bg-yellow-100 p-4 rounded text-center">
                        <span className="block text-2xl font-bold text-yellow-700">{counts.skipped}</span>
                        <span className="text-sm text-yellow-700">Skipped (Opt-out)</span>
                    </div>
                </div>
                
                <div className="mt-8 text-center">
                    <Link href="/home" className="text-blue-500 hover:underline">Back to Dashboard</Link>
                </div>
            </div>
        </div>
    );
}
