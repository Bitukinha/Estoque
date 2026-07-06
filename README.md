# Nutrimilho - Controle de Estoque

Sistema de controle de estoque da Nutrimilho.

## Tecnologias

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Vercel Functions (API)
- Neon (Postgres)

## Como rodar localmente

Pré-requisito: Node.js e npm instalados ([instalar com nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
# Clone o repositório
git clone https://github.com/Bitukinha/Estoque.git

# Entre na pasta do projeto
cd Estoque

# Instale as dependências
npm i

# Configure as variáveis de ambiente
cp .env.example .env
# preencha DATABASE_URL e JWT_SECRET

# Inicie o servidor de desenvolvimento
npm run dev
```

## Variáveis de ambiente

Veja `.env.example`. É necessário configurar:

- `DATABASE_URL`: string de conexão do banco Neon (Postgres)
- `JWT_SECRET`: segredo usado para assinar os tokens de autenticação

## Deploy

O projeto é hospedado na Vercel, conectado ao repositório do GitHub. Cada push na branch principal gera um novo deploy automaticamente. As variáveis de ambiente (`DATABASE_URL`, `JWT_SECRET`) precisam ser configuradas no painel do projeto na Vercel.
