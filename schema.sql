-- Schema do Painel da Corretora
-- Execute este arquivo uma vez no seu banco Aiven (PostgreSQL)

CREATE TABLE IF NOT EXISTS atendimentos (
  id TEXT PRIMARY KEY,
  cliente TEXT NOT NULL,
  categoria TEXT NOT NULL,
  subtipo TEXT NOT NULL,
  horario_solicitado TEXT,
  data_agendamento DATE,
  horario_agendamento TEXT,
  status TEXT NOT NULL DEFAULT 'iniciado',
  notas TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id TEXT PRIMARY KEY,
  cliente TEXT NOT NULL,
  categoria TEXT NOT NULL,
  subtipo TEXT NOT NULL,
  data DATE NOT NULL,
  horario TEXT NOT NULL,
  notas TEXT,
  atendimento_id TEXT REFERENCES atendimentos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS financeiro (
  id TEXT PRIMARY KEY,
  cliente TEXT NOT NULL,
  categoria TEXT NOT NULL,
  subtipo TEXT NOT NULL,
  valor_pago NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo NUMERIC(10,2) NOT NULL DEFAULT 0,
  forma TEXT NOT NULL,
  data DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data);
CREATE INDEX IF NOT EXISTS idx_financeiro_data ON financeiro(data);
CREATE INDEX IF NOT EXISTS idx_atendimentos_status ON atendimentos(status);
