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
  const { id, cliente, categoria, subtipo, horarioSolicitado, dataAgendamento, horarioAgendamento, status, notas } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO atendimentos (id, cliente, categoria, subtipo, horario_solicitado, data_agendamento, horario_agendamento, status, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, cliente, categoria, subtipo, horarioSolicitado || null, dataAgendamento || null, horarioAgendamento || null, status || "iniciado", notas || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar atendimento" });
  }
});

app.patch("/api/atendimentos/:id", async (req, res) => {
  const { status } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE atendimentos SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id]
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
  const { id, cliente, categoria, subtipo, valorPago, custo, forma, data } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO financeiro (id, cliente, categoria, subtipo, valor_pago, custo, forma, data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, cliente, categoria, subtipo, valorPago || 0, custo || 0, forma, data]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar lançamento" });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
