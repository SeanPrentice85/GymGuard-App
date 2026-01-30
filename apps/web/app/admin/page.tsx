"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Gym {
    id: string;
    name: string;
    created_at: string;
}

export default function AdminDashboard() {
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkAdmin = async () => {
             const { data: { session } } = await supabase.auth.getSession();
             if (!session) {
                 router.push('/login');
                 return;
             }
             
             // Verify Role
             const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).single();
             if (profile?.role !== 'admin') {
                 router.push('/home'); // Redirect non-admins
                 return;
             }
             
             setIsAdmin(true);
             fetchGyms();
        };
        checkAdmin();
    }, [router]);

    const fetchGyms = async () => {
        try {
            // Admin RLS allows viewing all gyms
            const { data, error } = await supabase.from('gyms').select('*').order('name');
            if (error) throw error;
            setGyms(data || []);
        } catch (error: any) {
            console.error("Error fetching gyms:", error);
            alert("Failed to fetch gyms");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Loading Admin Dashboard...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Admin Support Dashboard</h1>
                    <Link href="/home" className="text-blue-600 hover:underline">Back to My Gym</Link>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">All Gyms ({gyms.length})</h2>
                    {gyms.length === 0 ? (
                         <p className="text-gray-500">No gyms found.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {gyms.map(gym => (
                                <Link key={gym.id} href={`/admin/gym/${gym.id}`} className="block p-4 border rounded hover:bg-gray-50 transition">
                                    <div className="font-bold text-lg">{gym.name || "Unnamed Gym"}</div>
                                    <div className="text-xs text-gray-500 mt-1">ID: {gym.id}</div>
                                    <div className="text-xs text-gray-400">Joined: {new Date(gym.created_at).toLocaleDateString()}</div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
