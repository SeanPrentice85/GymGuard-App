'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DataHealthPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchData() {
      // Fetch latest run
      const { data: runs, error } = await supabase
        .from('model_monitor_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !runs || runs.length === 0) {
        console.error("Error fetching runs:", error);
        setLoading(false);
        return;
      }

      const latestRun = runs[0];
      const runId = latestRun.id;

      // Fetch Score Stats
      const { data: scoreStats } = await supabase
        .from('model_monitor_score_stats')
        .select('*')
        .eq('run_id', runId)
        .single();

      // Fetch Feature Stats
      const { data: featureStats } = await supabase
        .from('model_monitor_feature_stats')
        .select('*')
        .eq('run_id', runId);

      setStats({
        run: latestRun,
        scores: scoreStats,
        features: featureStats
      });
      setLoading(false);
    }

    fetchData();
  }, [supabase]);

  if (loading) return <div className="p-8 text-xl">Loading Health Data...</div>;
  if (!stats) return <div className="p-8 text-xl">No Health Data Found.</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Data Health Report</h1>
      
      {/* Overall Status */}
      <Card className={stats.run.status === 'OK' ? 'border-green-500' : 'border-yellow-500'}>
        <CardHeader>
          <CardTitle>Run Status: {stats.run.status}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Drift Score</p>
              <p className="text-2xl font-bold">{stats.run.output_drift_score}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Data Quality</p>
              <p className="text-2xl font-bold">{stats.run.data_quality_score}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Stats */}
      {stats.scores && (
        <Card>
          <CardHeader><CardTitle>Model Scores</CardTitle></CardHeader>
          <CardContent>
             <p>Mean Score: {stats.scores.mean_score}</p>
             <p>High Risk Members: {stats.scores.high_risk_count}</p>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <h2 className="text-2xl font-semibold">Feature Monitoring</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.features?.map((feat: any) => (
          <Card key={feat.id}>
             <CardHeader><CardTitle className="text-lg">{feat.feature_name}</CardTitle></CardHeader>
             <CardContent>
               <p>Null Count: {feat.null_count}</p>
               <p>Mean: {feat.mean_value}</p>
               <p>Range: {feat.min_value} - {feat.max_value}</p>
             </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
