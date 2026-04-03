const db = require('../models/db');

const schema = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  perfil VARCHAR(50) NOT NULL DEFAULT 'engenheiro' CHECK (perfil IN ('administrador','financeiro','engenheiro')),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS obras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  codigo VARCHAR(100) UNIQUE,
  cliente VARCHAR(255),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(50),
  data_inicio DATE,
  data_previsao_fim DATE,
  status VARCHAR(50) DEFAULT 'ativa' CHECK (status IN ('ativa','concluida','suspensa','cancelada')),
  descricao TEXT,
  orcamento NUMERIC(15,2) DEFAULT 0,
  criado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  apelido VARCHAR(100),
  indicacao VARCHAR(255),
  data_admissao DATE,
  funcao VARCHAR(100),
  data_nascimento DATE,
  rg VARCHAR(30),
  cpf VARCHAR(20) UNIQUE,
  telefone VARCHAR(20),
  email VARCHAR(255),
  cidade_origem VARCHAR(100),
  estado_origem VARCHAR(50),
  status VARCHAR(50) DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','ferias','afastado')),
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobilizacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  data_mobilizacao DATE NOT NULL,
  data_desmobilizacao DATE,
  cidade_origem VARCHAR(100),
  estado_origem VARCHAR(50),
  cidade_destino VARCHAR(100),
  estado_destino VARCHAR(50),
  km NUMERIC(10,2) DEFAULT 0,
  valor_reembolso NUMERIC(10,2) DEFAULT 0,
  tipo VARCHAR(50) DEFAULT 'mobilizacao' CHECK (tipo IN ('mobilizacao','desmobilizacao','folga_campo','compra_folga')),
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','pago','cancelado')),
  observacoes TEXT,
  criado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS passagens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  data_compra DATE,
  data_viagem DATE,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  parcelas INTEGER DEFAULT 1,
  empresa VARCHAR(100),
  cartao_utilizado VARCHAR(100),
  origem VARCHAR(100),
  destino VARCHAR(100),
  tipo VARCHAR(50) DEFAULT 'ida' CHECK (tipo IN ('ida','volta','ida_volta')),
  status VARCHAR(50) DEFAULT 'confirmado' CHECK (status IN ('confirmado','cancelado','reembolsado')),
  observacoes TEXT,
  importado_de VARCHAR(255),
  criado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  categoria VARCHAR(100) NOT NULL,
  subcategoria VARCHAR(100),
  descricao TEXT,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  data_lancamento DATE NOT NULL,
  mes_referencia INTEGER,
  ano_referencia INTEGER,
  forma_pagamento VARCHAR(50),
  comprovante_url TEXT,
  status VARCHAR(50) DEFAULT 'aprovado' CHECK (status IN ('pendente','aprovado','pago','cancelado')),
  importado_de VARCHAR(255),
  criado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alojamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  tipo VARCHAR(100) NOT NULL CHECK (tipo IN ('aluguel','agua_energia_internet','mao_de_obra','material_limpeza','outros')),
  descricao TEXT,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  data_lancamento DATE NOT NULL,
  mes_referencia INTEGER,
  ano_referencia INTEGER,
  fornecedor VARCHAR(255),
  numero_colaboradores INTEGER DEFAULT 0,
  criado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS relatorios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(100) NOT NULL,
  titulo VARCHAR(255),
  parametros JSONB,
  arquivo_url TEXT,
  gerado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passagens_colaborador ON passagens(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_passagens_obra ON passagens(obra_id);
CREATE INDEX IF NOT EXISTS idx_passagens_data_viagem ON passagens(data_viagem);
CREATE INDEX IF NOT EXISTS idx_custos_obra ON custos(obra_id);
CREATE INDEX IF NOT EXISTS idx_custos_categoria ON custos(categoria);
CREATE INDEX IF NOT EXISTS idx_custos_mes_ano ON custos(mes_referencia,ano_referencia);
CREATE INDEX IF NOT EXISTS idx_mobilizacao_colaborador ON mobilizacao(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_mobilizacao_obra ON mobilizacao(obra_id);
CREATE INDEX IF NOT EXISTS idx_alojamento_obra ON alojamento(obra_id);
CREATE INDEX IF NOT EXISTS idx_alojamento_mes_ano ON alojamento(mes_referencia,ano_referencia);

CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$ BEGIN NEW.atualizado_em = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$ BEGIN CREATE TRIGGER trg_usuarios_updated BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_atualizado_em(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER trg_obras_updated BEFORE UPDATE ON obras FOR EACH ROW EXECUTE FUNCTION update_atualizado_em(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER trg_colaboradores_updated BEFORE UPDATE ON colaboradores FOR EACH ROW EXECUTE FUNCTION update_atualizado_em(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO usuarios (nome, email, senha, perfil)
VALUES ('Administrador', 'admin@gestao.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'administrador')
ON CONFLICT (email) DO NOTHING;
`;

async function runMigrations() {
  try {
    console.log('Executando migrations...');
    await db.query(schema);
    console.log('Migrations concluidas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro nas migrations:', error);
    process.exit(1);
  }
}

runMigrations();
