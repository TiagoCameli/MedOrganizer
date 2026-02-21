import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GraduationCap, Clock, CalendarDays, BookOpen } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950">
      <header className="container mx-auto flex items-center justify-between p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          MedOrganizer
        </h1>
        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="ghost">Entrar</Button>
          </Link>
          <Link href="/cadastro">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Cadastrar</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Organize sua vida acadêmica em{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Medicina
            </span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Grade horária, provas, trabalhos e notas em um só lugar.
            Foque no que importa: aprender e se tornar um(a) grande médico(a).
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/cadastro">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Começar agora
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
          <FeatureCard
            icon={<Clock className="h-8 w-8 text-indigo-600" />}
            title="Grade Horária"
            description="Visualize sua semana com a grade de aulas organizada por cores."
          />
          <FeatureCard
            icon={<CalendarDays className="h-8 w-8 text-purple-600" />}
            title="Agenda"
            description="Acompanhe provas, trabalhos e tarefas com alertas de prazo."
          />
          <FeatureCard
            icon={<GraduationCap className="h-8 w-8 text-indigo-600" />}
            title="Notas"
            description="Calcule médias ponderadas e simule notas para aprovação."
          />
          <FeatureCard
            icon={<BookOpen className="h-8 w-8 text-purple-600" />}
            title="Matérias"
            description="Gerencie todas as disciplinas do semestre em um só lugar."
          />
        </div>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        MedOrganizer &copy; {new Date().getFullYear()} — Feito para estudantes de Medicina
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border bg-card p-6 text-left shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
