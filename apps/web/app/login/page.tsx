'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
  const supabase = createClientComponentClient();

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">GymGuard AI Login</h1>
        <Auth
          supabaseClient={supabase}
          view="magic_link"
          appearance={{ theme: ThemeSupa }}
          theme="dark"
          showLinks={false}
          providers={[]}
          redirectTo="http://localhost:3000/auth/callback"
        />
      </div>
    </div>
  );
}