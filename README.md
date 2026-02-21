# MedOrganizer

Aplicação web para estudantes de medicina organizarem sua vida acadêmica: grade horária, provas, trabalhos, notas e médias — tudo em um só lugar.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (PostgreSQL + Auth)
- **Vercel** (deploy)

## Configuração

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. No **SQL Editor**, execute o conteúdo de `supabase/migrations/001_initial_schema.sql` para criar as tabelas e políticas RLS
3. Em **Authentication > Providers**, certifique-se de que o provedor **Email** está habilitado

### 2. Variáveis de ambiente

Copie o arquivo de exemplo e preencha com os dados do seu projeto Supabase:

```bash
cp .env.local.example .env.local
```

Preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

Esses valores estão em: **Supabase Dashboard > Settings > API**

### 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Deploy na Vercel

1. Faça push do repositório para o GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Adicione as variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`) nas configurações do projeto
4. Deploy será feito automaticamente

## Funcionalidades

- **Autenticação** — Login e cadastro com email/senha via Supabase Auth
- **Matérias** — CRUD de disciplinas com cores e resumo (aulas/semana, média, próxima prova)
- **Grade Horária** — Visualização semanal estilo grade com indicador "aula agora"
- **Agenda** — Calendário mensal + lista de eventos com filtros, contagem regressiva e marcação de conclusão
- **Notas** — Tabela de notas por matéria, média ponderada automática e simulador "quanto preciso tirar?"
- **Painel** — Visão geral com aulas de hoje, próximos eventos e alertas de urgência
- **Tema** — Modo claro e escuro
- **Responsivo** — Funciona em desktop e mobile
