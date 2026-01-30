"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import Link from 'next/link';
import Papa from 'papaparse';

// Schema Definitions
const MEMBER_COLUMNS = ['member_id', 'first_name', 'last_name', 'phone', 'email'];
const FEATURE_COLUMNS = [
    'member_id', // Key
    'Gender', 'Near_Location', 'Partner', 'Promo_friends', 'Phone', 'Age', 'Lifetime_Tenure', 
    'Contract_period', 'Month_to_end_contract', 'Group_visits', 'Avg_class_frequency_total', 
    'Avg_class_frequency_current_month', 'Avg_additional_charges_total', 'Days_Since_Last_Visit', 
    'Month_1', 'Month_2', 'Month_3', 'Month_4', 'Month_5', 'Month_6', 'Month_7', 
    'Month_8', 'Month_9', 'Month_10', 'Month_11', 'Month_12', 'Month_13'
];

export default function ImportPage() {
    const [activeTab, setActiveTab] = useState<'csv' | 'sheets'>('csv');
    const [importType, setImportType] = useState<'members' | 'member_features'>('members');
    
    // CSV State
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [validCount, setValidCount] = useState(0);
    const [errorCount, setErrorCount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    // Sheets State
    const [sheetConfig, setSheetConfig] = useState({
        spreadsheet_id: '',
        tab_name: '',
        range: 'A2:Z'
    });
    const [savedSourceId, setSavedSourceId] = useState<string | null>(null);
    const [syncLoading, setSyncLoading] = useState(false);

    useEffect(() => {
        // Load existing Sheet config if any
        const loadConfig = async () => {
             const { data: { session } } = await supabase.auth.getSession();
             if (!session) return;
             
             // Get Gym
             const { data: profile } = await supabase.from('profiles').select('gym_id').eq('user_id', session.user.id).single();
             if (!profile) return;
             
             const { data: source } = await supabase.from('gym_data_sources')
                .select('*')
                .eq('gym_id', profile.gym_id)
                .eq('source_type', 'google_sheets')
                .eq('import_type', importType) // Config per import type
                .limit(1)
                .single();
            
            if (source) {
                setSheetConfig({
                    spreadsheet_id: source.google_sheet_spreadsheet_id || '',
                    tab_name: source.google_sheet_tab_name || '',
                    range: source.google_sheet_range || 'A2:Z'
                });
                setSavedSourceId(source.id);
            } else {
                setSavedSourceId(null);
                 setSheetConfig({ spreadsheet_id: '', tab_name: '', range: 'A2:Z' });
            }
        };
        if (activeTab === 'sheets') loadConfig();
    }, [activeTab, importType]);

    // --- CSV Handlers ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            parseFile(e.target.files[0]);
        }
    };

    const parseFile = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                validateRows(results.data);
            }
        });
    };

    const validateRows = (rows: any[]) => {
        const requiredCols = importType === 'members' ? MEMBER_COLUMNS : FEATURE_COLUMNS;
        let valid = 0;
        let errors = 0;
        
        const validated = rows.map((row, index) => {
            const missing = requiredCols.filter(col => !Object.keys(row).includes(col));
            const isValid = missing.length === 0 && !!row['member_id'];
            
            if (isValid) valid++;
            else errors++;

            return {
                ...row,
                _isValid: isValid,
                _error: missing.length > 0 ? `Missing columns: ${missing.join(', ')}` : (!row['member_id'] ? 'Missing member_id' : null)
            };
        });

        setPreview(validated);
        setValidCount(valid);
        setErrorCount(errors);
    };

    const handleImportCSV = async () => {
        if (!file || validCount === 0) return;
        setIsProcessing(true);
        setStatusMessage("Initializing import...");

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Not authenticated");
            const { data: profile } = await supabase.from('profiles').select('gym_id').eq('user_id', session.user.id).single();
            const gymId = profile?.gym_id;
            if (!gymId) throw new Error("No gym profile");

            // 1. Create Job
            const { data: job, error: jobError } = await supabase.from('member_import_jobs').insert({
                gym_id: gymId,
                created_by_user_id: session.user.id,
                source_type: 'csv',
                import_type: importType,
                status: 'uploaded'
            }).select().single();

            if (jobError) throw jobError;

            // 2. Insert Staging
            const validRows = preview.filter(r => r._isValid);
            const stagingPayload = preview.map((r, i) => ({
                gym_id: gymId,
                import_job_id: job.id,
                row_number: i + 1,
                raw_row: r,
                is_valid: r._isValid,
                error_message: r._error
            }));
            await supabase.from('member_import_rows').insert(stagingPayload);

            // 3. Upsert Real Data
            setStatusMessage("Importing data...");
             if (importType === 'members') {
                const upsertPayload = validRows.map(r => ({
                    gym_id: gymId,
                    member_id: r.member_id,
                    first_name: r.first_name,
                    last_name: r.last_name,
                    phone: r.phone,
                    email: r.email,
                    is_high_risk: false
                }));
                const { error } = await supabase.from('members').upsert(upsertPayload, { onConflict: 'gym_id,member_id' });
                if (error) throw error;
            } else {
                const upsertPayload = validRows.map(r => {
                    const clean: any = { gym_id: gymId, member_id: r.member_id };
                    FEATURE_COLUMNS.slice(1).forEach(col => clean[col.toLowerCase()] = r[col]);
                    return clean;
                });
                const { error } = await supabase.from('member_features').upsert(upsertPayload, { onConflict: 'gym_id,member_id' });
                 if (error) throw error;
            }

            // 4. Update Job
            await supabase.from('member_import_jobs').update({ status: 'imported' }).eq('id', job.id);
            setStatusMessage(`Successfully imported ${validCount} rows!`);
            setFile(null);
            setPreview([]);

        } catch (error: any) {
            console.error(error);
            setStatusMessage(`Error: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Sheets Handlers ---
    const saveSheetConfig = async () => {
         try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const { data: profile } = await supabase.from('profiles').select('gym_id').eq('user_id', session.user.id).single();
            const gymId = profile?.gym_id;

            const payload = {
                gym_id: gymId,
                source_type: 'google_sheets',
                import_type: importType,
                google_sheet_spreadsheet_id: sheetConfig.spreadsheet_id,
                google_sheet_tab_name: sheetConfig.tab_name,
                google_sheet_range: sheetConfig.range,
                is_active: true
            };

            let error;
            if (savedSourceId) {
                const res = await supabase.from('gym_data_sources').update(payload).eq('id', savedSourceId);
                error = res.error;
            } else {
                 const res = await supabase.from('gym_data_sources').insert(payload).select().single();
                 error = res.error;
                 if (res.data) setSavedSourceId(res.data.id);
            }

            if (error) throw error;
            alert("Settings saved!");
         } catch (e: any) {
             alert(e.message);
         }
    };

    const triggerSync = async () => {
        setSyncLoading(true);
        try {
            // Call n8n Webhook
             const WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_SHEETS_WEBHOOK;
             if (!WEBHOOK_URL) {
                 alert("Sync not configured (Missing Webhook URL)");
                 return;
             }
             
             const { data: { session } } = await supabase.auth.getSession();
             const { data: profile } = await supabase.from('profiles').select('gym_id').eq('user_id', session!.user.id).single();

             // Send context to n8n so it knows which gym to sync
             const res = await fetch(WEBHOOK_URL, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ 
                     gym_id: profile!.gym_id, 
                     source_id: savedSourceId,
                     import_type: importType 
                })
             });
             
             if (res.ok) alert("Sync triggered! Check Dashboard/Activity for updates.");
             else alert("Sync failed to trigger.");

        } catch (e) {
            console.error(e);
            alert("Sync error");
        } finally {
            setSyncLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Data Import</h1>
                    <Link href="/home" className="text-blue-600 hover:underline">Back to Dashboard</Link>
                </div>

                {/* Tabs */}
                <div className="flex mb-6 border-b">
                    <button 
                        className={`py-2 px-4 font-semibold ${activeTab === 'csv' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('csv')}
                    >
                        CSV Upload
                    </button>
                    <button 
                        className={`py-2 px-4 font-semibold ${activeTab === 'sheets' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('sheets')}
                    >
                        Google Sheets
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="mb-6">
                        <label className="mr-4 font-semibold">Import Type:</label>
                        <select 
                            value={importType} 
                            onChange={(e) => { 
                                setImportType(e.target.value as any); 
                                setPreview([]); 
                                setFile(null); 
                                // Reset sheets config load trigger
                                setSavedSourceId(null);
                            }}
                            className="border p-2 rounded"
                        >
                            <option value="members">Members</option>
                            <option value="member_features">Member Features (27-Point)</option>
                        </select>
                    </div>

                    {activeTab === 'csv' ? (
                        <>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 mb-6">
                                <input 
                                    type="file" 
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                <p className="mt-2 text-sm text-gray-500">Upload CSV matching the required schema.</p>
                            </div>

                            {file && (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-lg font-bold">Preview</h2>
                                        <div className="text-sm">
                                            <span className="text-green-600 font-bold mr-4">Valid: {validCount}</span>
                                            <span className="text-red-600 font-bold">Invalid: {errorCount}</span>
                                        </div>
                                    </div>
                                    {statusMessage && (
                                        <div className={`p-4 rounded mb-4 ${statusMessage.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {statusMessage}
                                        </div>
                                    )}
                                    <div className="max-h-64 overflow-auto border rounded mb-4">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="p-2">Status</th>
                                                    {importType === 'members' ? MEMBER_COLUMNS.map(c => <th key={c} className="p-2">{c}</th>) : <th className="p-2">Row Data</th>}
                                                    <th className="p-2">Error</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {preview.slice(0, 50).map((row, i) => (
                                                    <tr key={i} className={`border-b ${row._isValid ? '' : 'bg-red-50'}`}>
                                                        <td className="p-2">{row._isValid ? '✅' : '❌'}</td>
                                                        {importType === 'members' ? (
                                                            MEMBER_COLUMNS.map(c => <td key={c} className="p-2">{row[c] || '-'}</td>)
                                                        ) : (
                                                            <td className="p-2 font-mono">{JSON.stringify(row).substring(0, 50)}...</td>
                                                        )}
                                                        <td className="p-2 text-red-600">{row._error}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex justify-end">
                                        <button 
                                            onClick={handleImportCSV} 
                                            disabled={validCount === 0 || isProcessing}
                                            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {isProcessing ? 'Importing...' : `Import ${validCount} Valid Rows`}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        // Google Sheets UI
                        <div>
                             <div className="mb-6 p-4 bg-yellow-50 text-amber-800 text-sm rounded border border-yellow-200">
                                <p className="font-bold">Instructions:</p>
                                <ul className="list-disc ml-5 mt-1">
                                    <li>Share your Google Sheet with the Service Account email (managed by Admin).</li>
                                    <li>Enter the Spreadsheet ID (from the URL) and Tab Name below.</li>
                                    <li>Ensure headers match exactly what is required for <b>{importType}</b>.</li>
                                </ul>
                            </div>
                            
                            <div className="grid gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Spreadsheet ID</label>
                                    <input 
                                        type="text" 
                                        value={sheetConfig.spreadsheet_id} 
                                        onChange={e => setSheetConfig({...sheetConfig, spreadsheet_id: e.target.value})}
                                        className="w-full border p-2 rounded" 
                                        placeholder="1BxiMVs0XRA5nFMdKbBdB_..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Tab Name</label>
                                        <input 
                                            type="text" 
                                            value={sheetConfig.tab_name} 
                                            onChange={e => setSheetConfig({...sheetConfig, tab_name: e.target.value})}
                                            className="w-full border p-2 rounded" 
                                            placeholder="Sheet1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Range</label>
                                        <input 
                                            type="text" 
                                            value={sheetConfig.range} 
                                            onChange={e => setSheetConfig({...sheetConfig, range: e.target.value})}
                                            className="w-full border p-2 rounded" 
                                            placeholder="A2:Z"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    onClick={saveSheetConfig}
                                    className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
                                >
                                    Save Settings
                                </button>
                                <button 
                                    onClick={triggerSync}
                                    disabled={!savedSourceId || syncLoading}
                                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                    {syncLoading ? 'Syncing...' : 'Sync Now'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
