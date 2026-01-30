"use client";

import { useEffect, useState, use } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Member {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    last_churn_score: number;
}

export default function AdminGymView({ params }: { params: Promise<{ id: string }> }) {
    // Unwrapping params properly for Next.js 15+ 
    // Wait, typical use is just `params: { id: string }` in older, or async/await in newer.
    // The requirement implies standard Next.js. I'll use `use(params)` or `await params` pattern if I was server component, 
    // but this is "use client". In "use client" we receive params as prop.
    // However, recent Next.js types suggest Promise. I'll use the simplest react `use` or just access if I can.
    // Actually, let's use unwrapped state for safety if we are unsure of version, 
    // but standard `params: { id: string }` usually works in client components if passed from layout?
    // Let's assume params is a Promise in recent Next.js (15).
    // I will use `use` from react to unwrap it.
    
    // Workaround for variable type:
    // I'll cast it inside useEffect or just use `React.use()` if available.
    // Or just `params` as prop.
    
    // Let's assume standard params for now.
    
    const [unwrappedParams, setUnwrappedParams] = useState<{ id: string } | null>(null);

    useEffect(() => {
        // Unwrap params promise
        (async () => {
             const p = await params;
             setUnwrappedParams(p);
        })();
    }, [params]);

    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const gymId = unwrappedParams?.id;

    useEffect(() => {
        if (!gymId) return;

        const fetchData = async () => {
             const { data: { session } } = await supabase.auth.getSession();
             if (!session) return router.push('/login');
             
             // Check Admin
             const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).single();
             if (profile?.role !== 'admin') return router.push('/home');

             // Fetch Members for this Gym
             // Admin RLS allows this!
             const { data, error } = await supabase
                .from('members')
                .select('*')
                .eq('gym_id', gymId) // Explicit filter
                .order('last_churn_score', { ascending: false });

            if (error) {
                console.error(error);
                alert("Error fetching members");
            } else {
                setMembers(data as Member[]);
            }
            setLoading(false);
        };
        fetchData();
    }, [gymId, router]);

    if (!gymId || loading) return <div className="p-8">Loading Gym Data...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <Link href="/admin" className="text-gray-500 hover:text-gray-900">&larr; Back to Gyms</Link>
                    <h1 className="text-2xl font-bold mt-2">Gym Inspector: <span className="font-mono text-base bg-gray-200 px-2 py-1 rounded">{gymId}</span></h1>
                </div>

                <div className="bg-white rounded shadow text-sm">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="p-3">Name</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map(m => (
                                <tr key={m.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium">{m.first_name} {m.last_name}</td>
                                    <td className="p-3 text-gray-500">{m.email || '-'}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            m.last_churn_score >= 70 ? 'bg-red-100 text-red-700' :
                                            m.last_churn_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {m.last_churn_score}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {members.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-500">No members found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
