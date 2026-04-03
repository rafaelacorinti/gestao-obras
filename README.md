# Sistema de Gestão de Obras

Sistema web completo para gestão de obras: colaboradores, mobilização, passagens, custos, alojamento e relatórios.

## Tecnologias

- **Frontend:** React 18 + Vite + Tailwind CSS + React Query + Recharts
- **Backend:** Node.js + Express + PostgreSQL
- **Auth:** JWT com perfis (administrador, financeiro, engenheiro)

## Como rodar localmente

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+ (banco criado: `gestao_obras`)

### 1. Configurar o Backend

```bash
cd backend
cp env.example .env
# Edite .env e ajuste o DATABASE_URL com seu usuário/senha do PostgreSQL
npm install
node src/migrations/run.js   # cria tabelas e insere admin padrão
npm run dev                  # sobe na porta 3001
```

### 2. Configurar o Frontend

```bash
cd frontend
npm install
npm run dev                  # sobe em http://localhost:5173
```

### Acesso padrão
- **URL:** http://localhost:5173
- **Email:** admin@gestao.com
- **Senha:** Admin@123

## Estrutura do projeto

```
crie-um-sistema-web/
├── backend/
│   ├── src/
│   │   ├── migrations/run.js      # Cria banco + dados iniciais
│   │   ├── middleware/            # Auth, rate limit
│   │   ├── routes/                # Todas as rotas da API
│   │   └── server.js
│   ├── .env                       # Configurações locais
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/                 # Dashboard, Obras, Colaboradores...
    │   ├── components/ui/         # Modal, ConfirmDialog, Pagination
    │   ├── services/api.js        # Axios config
    │   └── utils/helpers.js       # Formatadores
    └── package.json
```

## Módulos disponíveis

| Módulo | Descrição |
|--------|-----------|
| Dashboard | KPIs, gráficos de evolução mensal, distribuição de custos |
| Obras | Cadastro e gestão de obras com status |
| Colaboradores | Cadastro completo + perfil individual |
| Mobilização | Registro de mob/desmob com cálculo de reembolso |
| Passagens | Controle de passagens aéreas com filtros |
| Custos | Lançamento por categoria com consolidação |
| Alojamento | Custos de aluguel, energia, limpeza etc. |
| Relatórios | Mensal, por colaborador, por obra — exportação PDF/Excel |
| Importação | Upload de planilhas Excel com mapeamento automático |
| Usuários | Gerenciamento de usuários e perfis (admin) |

## Deploy (produção)

### Backend — Railway / Render
1. Crie um serviço PostgreSQL na plataforma
2. Adicione as variáveis do `.env` nas configurações do serviço
3. Defina o start command: `node src/migrations/run.js && node src/server.js`

### Frontend — Vercel
1. Conecte o repositório
2. Root directory: `frontend`
3. Build command: `npm run build`
4. Output: `dist`
5. Adicione variável: `VITE_API_URL=https://seu-backend.railway.app`

> Lembre de atualizar `vite.config.js` para apontar o proxy para a URL de produção do backend.
