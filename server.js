const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // necessário para conectar no Aiven
});

// ---------- healthcheck ----------
app.get("/", (req, res) => res.send("API do Painel da Corretora no ar."));

// ---------- ATENDIMENTOS ----------
app.get("/api/atendimentos", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM atendimentos ORDER BY criado_em DESC");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar atendimentos" });
  }
});

app.post("/api/atendimentos", async (req, res) => {
  const { id, cliente, categoria, subtipo, horarioSolicitado, dataAgendamento, horarioAgendamento, valor, pagamento, status, notas } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO atendimentos (id, cliente, categoria, subtipo, horario_solicitado, data_agendamento, horario_agendamento, valor, pagamento, status, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [id, cliente, categoria, subtipo, horarioSolicitado || null, dataAgendamento || null, horarioAgendamento || null, valor != null ? valor : null, pagamento || null, status || "iniciado", notas || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar atendimento" });
  }
});

app.patch("/api/atendimentos/:id", async (req, res) => {
  const fields = {
    cliente: req.body.cliente,
    categoria: req.body.categoria,
    subtipo: req.body.subtipo,
    horario_solicitado: req.body.horarioSolicitado,
    data_agendamento: req.body.dataAgendamento || null,
    horario_agendamento: req.body.horarioAgendamento,
    valor: req.body.valor != null ? req.body.valor : undefined,
    pagamento: req.body.pagamento,
    status: req.body.status,
    notas: req.body.notas,
  };
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length === 0) return res.status(400).json({ error: "Nada para atualizar" });
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => fields[k]);
  values.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE atendimentos SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar atendimento" });
  }
});

app.delete("/api/atendimentos/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM atendimentos WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir atendimento" });
  }
});

// ---------- AGENDAMENTOS ----------
app.get("/api/agendamentos", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM agendamentos ORDER BY data, horario");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar agendamentos" });
  }
});

app.post("/api/agendamentos", async (req, res) => {
  const { id, cliente, categoria, subtipo, data, horario, notas, atendimentoId } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO agendamentos (id, cliente, categoria, subtipo, data, horario, notas, atendimento_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, cliente, categoria, subtipo, data, horario, notas || null, atendimentoId || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar agendamento" });
  }
});

app.patch("/api/agendamentos/:id", async (req, res) => {
  const fields = {
    cliente: req.body.cliente,
    categoria: req.body.categoria,
    subtipo: req.body.subtipo,
    data: req.body.data,
    horario: req.body.horario,
    notas: req.body.notas,
  };
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length === 0) return res.status(400).json({ error: "Nada para atualizar" });
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => fields[k]);
  values.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE agendamentos SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar agendamento" });
  }
});

app.delete("/api/agendamentos/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM agendamentos WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir agendamento" });
  }
});

// ---------- FINANCEIRO ----------
app.get("/api/financeiro", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM financeiro ORDER BY data DESC");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar lançamentos" });
  }
});

app.post("/api/financeiro", async (req, res) => {
  const { id, cliente, categoria, subtipo, valorPago, custo, forma, data, pago, atendimentoId } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO financeiro (id, cliente, categoria, subtipo, valor_pago, custo, forma, data, pago, atendimento_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, cliente, categoria, subtipo, valorPago || 0, custo || 0, forma || null, data, pago !== false, atendimentoId || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar lançamento" });
  }
});

app.patch("/api/financeiro/:id", async (req, res) => {
  const fields = {
    cliente: req.body.cliente,
    categoria: req.body.categoria,
    subtipo: req.body.subtipo,
    valor_pago: req.body.valorPago,
    custo: req.body.custo,
    forma: req.body.forma,
    data: req.body.data,
    pago: req.body.pago,
  };
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length === 0) return res.status(400).json({ error: "Nada para atualizar" });
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => fields[k]);
  values.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE financeiro SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar lançamento" });
  }
});

app.delete("/api/financeiro/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM financeiro WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir lançamento" });
  }
});

// ---------- CARTÕES DE CRÉDITO ----------
app.get("/api/cartoes", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM cartoes ORDER BY nome");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar cartões" });
  }
});

app.post("/api/cartoes", async (req, res) => {
  const { id, nome, cor } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO cartoes (id, nome, cor) VALUES ($1,$2,$3) RETURNING *`,
      [id, nome, cor || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar cartão" });
  }
});

app.delete("/api/cartoes/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM cartoes WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir cartão" });
  }
});

// ---------- COMPRAS PARCELADAS NO CARTÃO ----------
app.get("/api/compras-cartao", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM compras_cartao ORDER BY data_compra DESC");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar compras" });
  }
});

app.post("/api/compras-cartao", async (req, res) => {
  const { id, cartaoId, descricao, valorParcela, dataCompra, parcelas, notas } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO compras_cartao (id, cartao_id, descricao, valor_parcela, data_compra, parcelas, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, cartaoId, descricao, valorParcela || 0, dataCompra, parcelas || 1, notas || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar compra" });
  }
});

app.patch("/api/compras-cartao/:id", async (req, res) => {
  const fields = {
    descricao: req.body.descricao,
    valor_parcela: req.body.valorParcela,
    data_compra: req.body.dataCompra,
    parcelas: req.body.parcelas,
    notas: req.body.notas,
  };
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length === 0) return res.status(400).json({ error: "Nada para atualizar" });
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => fields[k]);
  values.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE compras_cartao SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar compra" });
  }
});

app.delete("/api/compras-cartao/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM compras_cartao WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir compra" });
  }
});

// ---------- DESPESAS PESSOAIS (avulsas/fixas) ----------
app.get("/api/despesas", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM despesas ORDER BY data DESC");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar despesas" });
  }
});

app.post("/api/despesas", async (req, res) => {
  const { id, titulo, tipo, valor, data, notas, forma } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO despesas (id, titulo, tipo, valor, data, notas, forma) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, titulo, tipo, valor || 0, data, notas || null, forma || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar despesa" });
  }
});

app.patch("/api/despesas/:id", async (req, res) => {
  const fields = {
    titulo: req.body.titulo,
    tipo: req.body.tipo,
    valor: req.body.valor,
    data: req.body.data,
    notas: req.body.notas,
    forma: req.body.forma,
  };
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length === 0) return res.status(400).json({ error: "Nada para atualizar" });
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => fields[k]);
  values.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE despesas SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar despesa" });
  }
});

app.delete("/api/despesas/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM despesas WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir despesa" });
  }
});

// ---------- CLIENTES ----------
app.get("/api/clientes", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM clientes ORDER BY nome");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar clientes" });
  }
});

app.post("/api/clientes", async (req, res) => {
  const { id, nome, categoria, subtipo, dataInicio, dataVencimento, notas, atendimentoId } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO clientes (id, nome, categoria, subtipo, data_inicio, data_vencimento, notas, atendimento_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, nome, categoria, subtipo, dataInicio, dataVencimento || null, notas || null, atendimentoId || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar cliente" });
  }
});

app.patch("/api/clientes/:id", async (req, res) => {
  const fields = {
    nome: req.body.nome,
    categoria: req.body.categoria,
    subtipo: req.body.subtipo,
    data_inicio: req.body.dataInicio,
    data_vencimento: req.body.dataVencimento,
    notas: req.body.notas,
  };
  const keys = Object.keys(fields).filter((k) => fields[k] !== undefined);
  if (keys.length === 0) return res.status(400).json({ error: "Nada para atualizar" });
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => fields[k]);
  values.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE clientes SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar cliente" });
  }
});

app.delete("/api/clientes/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM clientes WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir cliente" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
