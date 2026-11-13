'use client';

import { Suspense } from 'react';
import OAuthCallbackContent from './OAuthCallbackContent';

export default function OAuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-black font-sans">
                    <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.1),rgba(0,0,0,0))]" />
                    <div className="text-center">
                        <svg className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="text-zinc-400">Procesando autorización...</p>
                    </div>
                </div>
            }
        >
            <OAuthCallbackContent />
        </Suspense>
    );
}
