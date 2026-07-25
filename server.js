require("dotenv").config();

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { pool, inicializar } = require("./db");

const app = express();
const PORTA = process.env.PORT || 3000;
const SEGREDO = process.env.SESSION_SECRET;
const PRODUCAO = process.env.NODE_ENV === "production";

if (!SEGREDO || SEGREDO.length < 32) {
  console.error(
    "Falta a variavel SESSION_SECRET (minimo 32 caracteres). Configure-a no Render."
  );
  process.exit(1);
}

app.set("trust proxy", 1); // o Render fica atras de um proxy
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

// Cabecalhos basicos de seguranca
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

/* ------------------------------------------------------------------
   Limite de tentativas de login
   Cinco tentativas erradas por IP bloqueiam novas tentativas por 15 min.
------------------------------------------------------------------ */
const tentativas = new Map();
const LIMITE = 5;
const JANELA_MS = 15 * 60 * 1000;

function registrarFalha(ip) {
  const agora = Date.now();
  const atual = tentativas.get(ip);
  if (!atual || agora > atual.expira) {
    tentativas.set(ip, { contagem: 1, expira: agora + JANELA_MS });
  } else {
    atual.contagem += 1;
  }
}

function bloqueado(ip) {
  const atual = tentativas.get(ip);
  if (!atual) return false;
  if (Date.now() > atual.expira) {
    tentativas.delete(ip);
    return false;
  }
  return atual.contagem >= LIMITE;
}

/* ------------------------------------------------------------------
   Sessao
------------------------------------------------------------------ */
const NOME_COOKIE = "sessao";

function criarSessao(res, usuario) {
  const token = jwt.sign({ id: usuario.id, email: usuario.email }, SEGREDO, {
    expiresIn: "7d",
  });
  res.cookie(NOME_COOKIE, token, {
    httpOnly: true, // o JavaScript da pagina nao consegue ler
    secure: PRODUCAO, // so trafega por HTTPS em producao
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function exigirLogin(req, res, next) {
  const token = req.cookies[NOME_COOKIE];
  if (!token) return res.status(401).json({ erro: "Sessao expirada." });
  try {
    req.usuario = jwt.verify(token, SEGREDO);
    next();
  } catch {
    res.clearCookie(NOME_COOKIE);
    return res.status(401).json({ erro: "Sessao expirada." });
  }
}

/* ------------------------------------------------------------------
   Rotas de autenticacao
------------------------------------------------------------------ */
app.post("/api/login", async (req, res) => {
  const ip = req.ip;

  if (bloqueado(ip)) {
    return res.status(429).json({
      erro: "Muitas tentativas. Aguarde 15 minutos antes de tentar de novo.",
    });
  }

  const email = String(req.body.email || "").trim().toLowerCase();
  const senha = String(req.body.senha || "");

  if (!email || !senha) {
    return res.status(400).json({ erro: "Informe email e senha." });
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, email, senha_hash FROM usuarios WHERE email = $1",
      [email]
    );
    const usuario = rows[0];

    // Compara mesmo sem usuario, para nao revelar quais emails existem.
    const hashFalso = "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
    const confere = await bcrypt.compare(senha, usuario ? usuario.senha_hash : hashFalso);

    if (!usuario || !confere) {
      registrarFalha(ip);
      return res.status(401).json({ erro: "Email ou senha incorretos." });
    }

    tentativas.delete(ip);
    criarSessao(res, usuario);
    res.json({ email: usuario.email });
  } catch (err) {
    console.error("Erro no login:", err.message);
    res.status(500).json({ erro: "Nao foi possivel entrar. Tente de novo." });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie(NOME_COOKIE);
  res.json({ ok: true });
});

app.get("/api/me", exigirLogin, (req, res) => {
  res.json({ email: req.usuario.email });
});

/* ------------------------------------------------------------------
   Dados do painel
------------------------------------------------------------------ */
app.get("/api/dados", exigirLogin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT conteudo FROM dados_painel WHERE usuario_id = $1",
      [req.usuario.id]
    );
    res.json({ conteudo: rows[0] ? rows[0].conteudo : null });
  } catch (err) {
    console.error("Erro ao ler dados:", err.message);
    res.status(500).json({ erro: "Nao foi possivel carregar os dados." });
  }
});

app.put("/api/dados", exigirLogin, async (req, res) => {
  const conteudo = req.body.conteudo;
  if (conteudo === undefined || conteudo === null) {
    return res.status(400).json({ erro: "Conteudo ausente." });
  }
  try {
    await pool.query(
      `INSERT INTO dados_painel (usuario_id, conteudo, atualizado_em)
       VALUES ($1, $2, now())
       ON CONFLICT (usuario_id)
       DO UPDATE SET conteudo = EXCLUDED.conteudo, atualizado_em = now()`,
      [req.usuario.id, conteudo]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao salvar dados:", err.message);
    res.status(500).json({ erro: "Nao foi possivel salvar." });
  }
});

/* ------------------------------------------------------------------
   Troca de senha
------------------------------------------------------------------ */
app.post("/api/trocar-senha", exigirLogin, async (req, res) => {
  const atual = String(req.body.atual || "");
  const nova = String(req.body.nova || "");

  if (nova.length < 10) {
    return res.status(400).json({ erro: "A nova senha precisa ter ao menos 10 caracteres." });
  }

  try {
    const { rows } = await pool.query(
      "SELECT senha_hash FROM usuarios WHERE id = $1",
      [req.usuario.id]
    );
    const confere = await bcrypt.compare(atual, rows[0].senha_hash);
    if (!confere) return res.status(401).json({ erro: "Senha atual incorreta." });

    const hash = await bcrypt.hash(nova, 12);
    await pool.query("UPDATE usuarios SET senha_hash = $1 WHERE id = $2", [
      hash,
      req.usuario.id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao trocar senha:", err.message);
    res.status(500).json({ erro: "Nao foi possivel trocar a senha." });
  }
});

/* ------------------------------------------------------------------
   Arquivos estaticos
------------------------------------------------------------------ */
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ------------------------------------------------------------------
   Primeiro acesso

   Se ainda nao existe nenhum usuario e as variaveis ADMIN_EMAIL e
   ADMIN_SENHA_INICIAL estiverem preenchidas, o usuario e criado no
   primeiro boot. A senha e gravada apenas como hash.

   Depois de entrar pela primeira vez, troque a senha pelo painel e
   apague ADMIN_SENHA_INICIAL das variaveis do Render.
------------------------------------------------------------------ */
async function garantirUsuarioInicial() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM usuarios");
  if (rows[0].total > 0) return;

  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const senha = String(process.env.ADMIN_SENHA_INICIAL || "");

  if (!email || !senha) {
    console.warn(
      "Nenhum usuario cadastrado. Preencha ADMIN_EMAIL e ADMIN_SENHA_INICIAL para criar o primeiro acesso."
    );
    return;
  }

  if (senha.length < 10) {
    console.warn("ADMIN_SENHA_INICIAL curta demais. Use ao menos 10 caracteres.");
    return;
  }

  const hash = await bcrypt.hash(senha, 12);
  await pool.query("INSERT INTO usuarios (email, senha_hash) VALUES ($1, $2)", [email, hash]);
  console.log(`Usuario inicial criado: ${email}`);
}

/* ------------------------------------------------------------------
   Inicializacao
------------------------------------------------------------------ */
inicializar()
  .then(garantirUsuarioInicial)
  .then(() => {
    app.listen(PORTA, () => console.log(`Servidor rodando na porta ${PORTA}`));
  })
  .catch((err) => {
    console.error("Falha ao iniciar:", err.message);
    process.exit(1);
  });
