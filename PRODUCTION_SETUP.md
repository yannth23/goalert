# Guia de Deploy para Produção - TactiqSense

Este documento descreve como fazer o deploy da aplicação **TactiqSense** em produção usando **Neon** (PostgreSQL), **Upstash** (Redis) e plataformas como **Vercel** (Frontend) e **Render/Railway** (Backend).

## 📋 Pré-requisitos

- Conta no [Neon](https://neon.tech)
- Conta no [Upstash](https://upstash.com)
- Conta no [Vercel](https://vercel.com) ou similar
- Conta no [Render](https://render.com) ou [Railway](https://railway.app)
- Chave de API da [API-Football](https://api-sports.io)
- Chave de API do [Groq](https://console.groq.com) para acesso ao modelo Llama 3

## 🗄️ 1. Configurar Banco de Dados (Neon)

### Passo 1: Criar Projeto no Neon

1. Acesse [neon.tech](https://neon.tech) e faça login
2. Clique em **"Create a new project"**
3. Escolha um nome para o projeto (ex: `tactiqsense-prod`)
4. Selecione a região mais próxima
5. Clique em **"Create project"**

### Passo 2: Obter Connection String

1. Na página do projeto, vá para **"Connection string"**
2. Copie a string no formato: `postgresql://user:password@host/dbname?sslmode=require`
3. Guarde esta string como `DATABASE_URL`

### Passo 3: Executar Migrations

Quando o backend estiver rodando pela primeira vez, as migrations do Prisma serão executadas automaticamente. Se precisar executar manualmente:

```bash
cd backend
npx prisma migrate deploy
```

## 🔴 2. Configurar Redis (Upstash)

### Passo 1: Criar Database no Upstash

1. Acesse [console.upstash.com](https://console.upstash.com)
2. Clique em **"Create database"**
3. Escolha um nome (ex: `tactiqsense-prod`)
4. Selecione a região
5. Clique em **"Create"**

### Passo 2: Obter Connection String

1. Na página do database, copie a **"Redis CLI"** ou **"REST URL"**
2. Para usar com Node.js, copie a string no formato: `redis://default:password@host:port`
3. Guarde como `REDIS_URL`

## 🚀 3. Deploy do Backend (Render ou Railway)

### Opção A: Render

#### Passo 1: Conectar Repositório

1. Acesse [render.com](https://render.com)
2. Clique em **"New +"** → **"Web Service"**
3. Selecione **"Connect a repository"**
4. Escolha o repositório `goalert`
5. Clique em **"Connect"**

#### Passo 2: Configurar Serviço

1. **Name:** `tactiqsense-backend`
2. **Environment:** `Node`
3. **Build Command:** `cd backend && npm install && npm run build`
4. **Start Command:** `cd backend && npm run start:prod`
5. **Instance Type:** `Starter` (ou superior)

#### Passo 3: Adicionar Variáveis de Ambiente

Clique em **"Environment"** e adicione:

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=seu-secret-aleatorio-muito-seguro
FOOTBALL_DATA_API_KEY=sua-chave-api
API_FOOTBALL_KEY=sua-chave-api-sports
GROQ_API_KEY=sua-chave-groq
CORS_ORIGINS=https://seu-frontend.vercel.app
NODE_ENV=production
```

#### Passo 4: Deploy

Clique em **"Create Web Service"**. O Render iniciará o deploy automaticamente.

### Opção B: Railway

#### Passo 1: Conectar Repositório

1. Acesse [railway.app](https://railway.app)
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub"**
4. Escolha o repositório
5. Clique em **"Deploy Now"**

#### Passo 2: Configurar Serviço

1. Vá para **"Settings"**
2. Em **"Build Command":** `cd backend && npm install && npm run build`
3. Em **"Start Command":** `cd backend && npm run start:prod`

#### Passo 3: Adicionar Variáveis

Vá para **"Variables"** e adicione as mesmas variáveis listadas acima.

#### Passo 4: Deploy

Railway fará o deploy automaticamente ao detectar mudanças no repositório.

## 🌐 4. Deploy do Frontend (Vercel)

### Passo 1: Conectar Repositório

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Add New"** → **"Project"**
3. Selecione o repositório `goalert`
4. Clique em **"Import"**

### Passo 2: Configurar Build

1. **Framework Preset:** `Next.js`
2. **Root Directory:** `frontend`
3. **Build Command:** `npm run build`
4. **Output Directory:** `.next`

### Passo 3: Adicionar Variáveis de Ambiente

Em **"Environment Variables"**, adicione:

```
NEXT_PUBLIC_API_URL=https://seu-backend.render.com
```

(Substitua pela URL real do seu backend)

### Passo 4: Deploy

Clique em **"Deploy"**. Vercel fará o deploy e fornecerá uma URL pública.

## 🔐 Segurança - Checklist

- [ ] `JWT_SECRET` é uma string aleatória forte (mínimo 32 caracteres)
- [ ] `DATABASE_URL` usa `sslmode=require` para conexão segura
- [ ] `CORS_ORIGINS` aponta apenas para seu domínio frontend
- [ ] Variáveis sensíveis **nunca** estão commitadas no repositório
- [ ] `.env.production` está no `.gitignore`
- [ ] HTTPS está ativado em todas as URLs
- [ ] `GROQ_API_KEY` e `API_FOOTBALL_KEY` estão protegidas

## 📊 Monitoramento

### Logs do Backend

**Render:**
- Vá para o serviço → **"Logs"**

**Railway:**
- Vá para o projeto → **"Deployments"** → clique no deployment

### Métricas

- **Render:** Vá para **"Metrics"** para ver CPU, memória e requisições
- **Railway:** Vá para **"Metrics"** para informações similares

### Alertas

Configure alertas para:
- Falhas de deploy
- Uso de memória > 80%
- Erros de banco de dados
- Taxa de erro > 5%

## 🔄 Atualizações e Rollback

### Fazer Deploy de Atualizações

1. Faça commit e push das mudanças para `main`
2. O Render/Railway detectará automaticamente e iniciará o deploy
3. Verifique os logs para confirmar sucesso

### Rollback

**Render:**
1. Vá para **"Deployments"**
2. Clique no deployment anterior
3. Clique em **"Redeploy"**

**Railway:**
1. Vá para **"Deployments"**
2. Clique em **"Rollback"** no deployment anterior

## 🐛 Troubleshooting

### Erro: "JWT_SECRET is not set"

**Solução:** Verifique se `JWT_SECRET` está configurado nas variáveis de ambiente da plataforma.

### Erro: "Cannot connect to Redis"

**Solução:** Verifique se `REDIS_URL` está correto e se o Upstash está ativo.

### Erro: "Connection refused" no Frontend

**Solução:** Verifique se `NEXT_PUBLIC_API_URL` aponta para a URL correta do backend e se CORS está configurado.

### Erro: "Groq API key not found"

**Solução:** Verifique se `GROQ_API_KEY` está configurado corretamente nas variáveis de ambiente.

### Migrations não foram executadas

**Solução:** Execute manualmente:
```bash
cd backend
npx prisma migrate deploy
```

## 📞 Suporte

Para problemas com:
- **Neon:** https://neon.tech/docs
- **Upstash:** https://upstash.com/docs
- **Render:** https://render.com/docs
- **Railway:** https://docs.railway.app
- **Vercel:** https://vercel.com/docs
- **API-Football:** https://api-sports.io/documentation
- **Groq:** https://console.groq.com/docs

---

**Última atualização:** Junho 2026
