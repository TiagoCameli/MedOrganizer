'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Preencha todos os campos')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      toast.error('Erro ao entrar: ' + error.message)
    } else {
      toast.success('Login realizado com sucesso!')
      router.push('/dashboard')
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      toast.error('Digite seu email primeiro')
      return
    }
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    })
    setResetLoading(false)
    if (error) {
      toast.error('Erro: ' + error.message)
    } else {
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 overflow-hidden">

      {/* Scattered illustrations — absolute positioned, subtle */}

      {/* Top-left: Stethoscope */}
      <svg viewBox="0 0 120 120" fill="none" className="absolute top-[8%] left-[5%] w-28 lg:w-36 text-emerald-300/30 dark:text-emerald-400/10">
        <path d="M40 20 C40 20 35 50 35 65 C35 82 48 92 60 92 C72 92 85 82 85 65 C85 50 80 20 80 20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <circle cx="60" cy="98" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="40" cy="16" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="80" cy="16" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="40" cy="16" r="2.5" fill="currentColor" opacity="0.5"/>
        <circle cx="80" cy="16" r="2.5" fill="currentColor" opacity="0.5"/>
      </svg>

      {/* Top-right: Open book */}
      <svg viewBox="0 0 140 100" fill="none" className="absolute top-[6%] right-[6%] w-32 lg:w-40 text-emerald-300/25 dark:text-emerald-400/10">
        <path d="M70 25 C70 25 50 18 20 20 L20 80 C50 78 70 85 70 85" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M70 25 C70 25 90 18 120 20 L120 80 C90 78 70 85 70 85" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <line x1="70" y1="25" x2="70" y2="85" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
        {/* Left page lines */}
        <line x1="30" y1="35" x2="60" y2="33" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
        <line x1="30" y1="45" x2="60" y2="43" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
        <line x1="30" y1="55" x2="60" y2="53" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
        <line x1="30" y1="65" x2="55" y2="63" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
        {/* Right page lines */}
        <line x1="80" y1="33" x2="110" y2="35" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
        <line x1="80" y1="43" x2="110" y2="45" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
        <line x1="80" y1="53" x2="110" y2="55" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
        <line x1="80" y1="63" x2="105" y2="65" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      </svg>

      {/* Left-center: Brain */}
      <svg viewBox="0 0 120 130" fill="none" className="absolute top-[40%] left-[3%] lg:left-[10%] w-24 lg:w-32 text-emerald-300/25 dark:text-emerald-400/10 -translate-y-1/2">
        <path d="M60 15 Q35 15 28 35 Q20 55 32 70 Q24 78 28 90 Q32 105 50 110 Q55 113 60 110 Q65 113 70 110 Q88 105 92 90 Q96 78 88 70 Q100 55 92 35 Q85 15 60 15Z" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M60 18 L60 108" stroke="currentColor" strokeWidth="1" opacity="0.25" strokeDasharray="3 4"/>
        <path d="M32 42 Q42 38 52 44" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.35"/>
        <path d="M30 58 Q42 52 54 58" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.35"/>
        <path d="M34 76 Q46 70 56 76" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.35"/>
        <path d="M68 44 Q78 38 90 42" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.35"/>
        <path d="M66 58 Q78 52 90 58" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.35"/>
        <path d="M64 76 Q76 70 88 76" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.35"/>
      </svg>

      {/* Right-center: DNA helix */}
      <svg viewBox="0 0 80 160" fill="none" className="absolute top-[35%] right-[4%] lg:right-[10%] w-16 lg:w-24 text-blue-300/25 dark:text-blue-400/10 -translate-y-1/2">
        <path d="M20 10 C50 30 50 50 20 70 C50 90 50 110 20 130 C50 150 50 155 40 160" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M60 10 C30 30 30 50 60 70 C30 90 30 110 60 130 C30 150 30 155 40 160" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
        {/* Rungs */}
        <line x1="30" y1="22" x2="50" y2="22" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
        <line x1="24" y1="40" x2="56" y2="40" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
        <line x1="28" y1="58" x2="52" y2="58" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
        <line x1="30" y1="82" x2="50" y2="82" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
        <line x1="24" y1="100" x2="56" y2="100" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
        <line x1="28" y1="118" x2="52" y2="118" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
      </svg>

      {/* Bottom-left: Microscope */}
      <svg viewBox="0 0 100 120" fill="none" className="absolute bottom-[8%] left-[8%] lg:left-[15%] w-20 lg:w-28 text-emerald-300/25 dark:text-emerald-400/10">
        <ellipse cx="50" cy="108" rx="30" ry="6" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="50" y1="102" x2="50" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="50" y1="60" x2="35" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <rect x="28" y="14" width="14" height="20" rx="3" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(-15 35 24)"/>
        <circle cx="34" cy="32" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5"/>
        <line x1="38" y1="60" x2="65" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <rect x="58" y="55" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5"/>
      </svg>

      {/* Bottom-right: Flashcards stack */}
      <svg viewBox="0 0 120 100" fill="none" className="absolute bottom-[8%] right-[6%] lg:right-[14%] w-24 lg:w-32 text-emerald-300/20 dark:text-emerald-400/10">
        <rect x="25" y="10" width="70" height="48" rx="5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" transform="rotate(6 60 34)"/>
        <rect x="20" y="16" width="70" height="48" rx="5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" transform="rotate(2 55 40)"/>
        <rect x="15" y="22" width="70" height="48" rx="5" stroke="currentColor" strokeWidth="2" fill="none"/>
        <text x="40" y="52" fontSize="20" fontFamily="serif" fill="currentColor" opacity="0.4" fontWeight="bold">?</text>
        <line x1="25" y1="36" x2="55" y2="36" stroke="currentColor" strokeWidth="1" opacity="0.2"/>
        {/* Checkmark */}
        <circle cx="90" cy="78" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
        <path d="M85 78 L88 81 L96 73" stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      {/* Bottom-center: Heart (medical) */}
      <svg viewBox="0 0 80 80" fill="none" className="absolute bottom-[3%] left-1/2 -translate-x-1/2 w-14 lg:w-20 text-red-300/20 dark:text-red-400/8">
        <path d="M40 68 C20 52 8 40 8 28 C8 18 16 10 26 10 C32 10 37 13 40 18 C43 13 48 10 54 10 C64 10 72 18 72 28 C72 40 60 52 40 68Z" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M18 38 L30 38 L34 28 L40 48 L46 32 L50 38 L62 38" stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      {/* Soft glow blurs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-emerald-200/20 dark:bg-emerald-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-emerald-200/20 dark:bg-emerald-500/5 blur-3xl pointer-events-none" />

      {/* Login card — centered */}
      <Card className="relative z-10 w-full max-w-md shadow-lg border-border/50 backdrop-blur-sm bg-card/90">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent">
            MedOrganizer
          </CardTitle>
          <CardDescription>Entre com sua conta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="text-xs text-emerald-600 hover:underline disabled:opacity-50"
              >
                {resetLoading ? 'Enviando...' : 'Esqueci minha senha'}
              </button>
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link href="/cadastro" className="text-emerald-600 hover:underline">
              Cadastre-se
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
