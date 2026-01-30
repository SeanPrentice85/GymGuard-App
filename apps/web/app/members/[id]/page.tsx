"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Member {
    member_id: string;
    last_churn_score: number;
    last_score_date: string;
    is_high_risk: boolean;
    sms_opted_out: boolean;
    phone: string;
}

interface ScoreHistory {
    id: string;
    churn_score: number;
    score_date: string;
}

export default function MemberDetailPage({ params }: { params: { id: string } }) {
    const [member, setMember] = useState<Member | null>(null);
    const [history, setHistory] = useState<ScoreHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchMemberData = async () => {
            setLoading(true);
            const { id } = params;

            // Fetch Member Details
            const { data: memberData, error: memberError } = await supabase
                .from('members')
                .select('*')
                .eq('member_id', id)
                .single();
            
            if (memberError || !memberData) {
                alert("Member not found");
                router.push('/home');
                return;
            }
            setMember(memberData);

            // Fetch History (Last 30)
            const { data: historyData } = await supabase
                .from('member_score_history')
                .select('*')
                .eq('member_id', id)
                .order('score_date', { ascending: false })
                .limit(30);

            if (historyData) {
                setHistory(historyData);
            }
            
            setLoading(false);
        };
        fetchMemberData();
    }, [params, router]);

    if (loading) return <div className="p-8">Loading member details...</div>;
    if (!member) return null;

    // Trend Analysis
    let trend = "Flat";
    let TrendIcon = Minus;
    let trendColor = "text-gray-500";
    
    if (history.length >= 2) {
        const latest = history[0].churn_score;
        const previous = history[1].churn_score;
        if (latest > previous) {
            trend = "Rising";
            TrendIcon = TrendingUp;
            trendColor = "text-red-500";
        } else if (latest < previous) {
            trend = "Falling";
            TrendIcon = TrendingDown;
            trendColor = "text-green-500";
        }
    }

    // Chart Data
    // Reverse history for chart (oldest to newest)
    const chartHistory = [...history].sort((a, b) => new Date(a.score_date).getTime() - new Date(b.score_date).getTime());
    
    const chartData = {
        labels: chartHistory.map(h => new Date(h.score_date).toLocaleDateString()),
        datasets: [
            {
                label: 'Churn Risk Score',
                data: chartHistory.map(h => h.churn_score),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                tension: 0.2,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: '30-Day Risk Trend',
            },
        },
        scales: {
            y: {
                min: 0,
                max: 100,
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-900 mb-6">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>

                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Member: {member.member_id}</h1>
                            <p className="text-gray-500">Phone: {member.phone || 'N/A'} {member.sms_opted_out && <span className="text-red-500 text-xs font-bold border border-red-200 bg-red-50 px-1 rounded ml-2">OPTED OUT</span>}</p>
                        </div>
                        <div className="text-right">
                             <div className="text-sm text-gray-500 uppercase font-semibold">Current Risk</div>
                             <div className={`text-4xl font-bold ${member.is_high_risk ? 'text-red-600' : 'text-green-600'}`}>
                                 {member.last_churn_score?.toFixed(1)}%
                             </div>
                             <div className={`flex items-center justify-end mt-1 ${trendColor} font-medium`}>
                                 <TrendIcon className="w-4 h-4 mr-1" /> {trend} Trend
                             </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Chart Section */}
                    <div className="bg-white rounded-lg shadow p-6">
                         <Line options={chartOptions} data={chartData} />
                    </div>

                    {/* History Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 border-b font-bold bg-gray-50">Recent History</div>
                        <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100 text-gray-600 sticky top-0">
                                    <tr>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(row => (
                                        <tr key={row.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3">{new Date(row.score_date).toLocaleString()}</td>
                                            <td className={`p-3 font-semibold ${row.churn_score >= 70 ? 'text-red-600' : 'text-gray-800'}`}>
                                                {row.churn_score.toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && (
                                        <tr><td colSpan={2} className="p-4 text-center text-gray-500">No history available yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
