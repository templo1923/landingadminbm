'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signup } from '@/app/actions/auth'

export default function SignupPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        setErrorMsg('')
        
        const formData = new FormData(e.currentTarget)
        const password = formData.get('password') as string
        
        if (password.length < 6) {
            setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
            setIsLoading(false)
            return
        }

        const res = await signup(formData)
        
        if (res?.error) {
            setErrorMsg(res.error)
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center font-sans overflow-hidden bg-[#0A0A0A] py-12">
            <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_60%_60%_at_50%_-20%,rgba(16,185,129,0.1),rgba(0,0,0,0))]" />
            
            <div className="w-full max-w-md px-6">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] mb-5">
                        <span className="text-black font-bold text-xl leading-none">S</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">Crea tu Workspace</h1>
                    <p className="text-sm text-zinc-400 mt-2 text-center">Registra tu empresa y comienza a reducir el churn con notificaciones automáticas.</p>
                </div>

                <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-[#111111]/80 backdrop-blur-xl shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {errorMsg && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
                                {errorMsg}
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Tu Nombre</label>
                                <input 
                                    name="first_name"
                                    type="text" 
                                    required
                                    placeholder="Ej. Carlos" 
                                    className="w-full mt-2 bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none transition-all placeholder:text-zinc-600"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Empresa</label>
                                <input 
                                    name="company_name"
                                    type="text" 
                                    required
                                    placeholder="Nombre de agencia" 
                                    className="w-full mt-2 bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none transition-all placeholder:text-zinc-600"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Correo Electrónico Oficial</label>
                            <input 
                                name="email"
                                type="email" 
                                required
                                placeholder="tu@empresa.com" 
                                className="w-full mt-2 bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-emerald-500 focus:outline-none transition-all placeholder:text-zinc-600"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Crea una Contraseña</label>
                            <input 
                                name="password"
                                type="password" 
                                required
                                placeholder="Mínimo 6 caracteres" 
                                className="w-full mt-2 bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-emerald-500 focus:outline-none transition-all placeholder:text-zinc-600"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full mt-6 py-4 rounded-full bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm text-zinc-500 mt-8">
                    ¿Ya tienes una cuenta?{' '}
                    <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                        Inicia sesión
                    </Link>
                </p>
            </div>
        </div>
    )
}
