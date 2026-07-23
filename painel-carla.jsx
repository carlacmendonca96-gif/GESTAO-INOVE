import { useState, useEffect, useMemo } from "react";
import {
  LayoutGrid, CalendarDays, Wallet, Plus, Trash2, ChevronLeft, ChevronRight,
  CreditCard, X, Stamp, FileBarChart, List
} from "lucide-react";

const STATUSES = ["Novo", "Em andamento", "Aguardando documentos", "Concluído", "Cancelado"];
const CATEGORIAS = {
  seguros: { label: "Seguros", subtipos: ["Auto", "Residencial", "Vida", "Empresarial", "Saúde", "Viagem", "Outros"] },
  certificacao: { label: "Certificação Digital", subtipos: ["e-CPF A1", "e-CPF A3", "e-CNPJ A1", "e-CNPJ A3", "NF-e", "Outros"] },
};
const EMPRESAS = [
  { key: "seguros", label: "Seguros" },
  { key: "certificacao", label: "Certificação Digital" },
  { key: "pessoa_fisica", label: "Pessoa Física" },
];
const CARTOES = ["Itaú", "Bradesco", "C6 PF", "C6 PJ"];
const CLASSIFICACOES = [
  "Aluguel", "Conta de internet", "Conta de telefone", "Conta de luz", "Conta de água",
  "Material de escritório", "Marketing", "Impostos", "Salário/Pró-labore", "Alimentação",
  "Combustível", "Assinatura/Software", "Outros",
];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["D","S","T","Q","Q","S","S"];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayISO = () => new Date().toISOString().slice(0, 10);
const parseValorBR = (str) => {
  if (str === null || str === undefined) return NaN;
  const cleaned = String(str).trim().replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  return parseFloat(cleaned);
};
const fmtBRL = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const addMonthsISO = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1 + n, d);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

const EMPTY_DATA = { pipeline: [], transactions: [] };

export default function App() {
  const [data, setData] = useState(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("pipeline");

  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (window.storage) {
          const res = await window.storage.get("dashboard-data");
          if (res && res.value) setData(JSON.parse(res.value));
        }
      } catch (e) {
        // sem dados salvos ainda
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      if (!window.storage) { setSaveError(true); return; }
      window.storage.set("dashboard-data", JSON.stringify(data))
        .then(() => setSaveError(false))
        .catch(() => setSaveError(true));
    } catch (e) {
      setSaveError(true);
    }
  }, [data, loaded]);

  const addPipelineCard = (card) =>
    setData((d) => ({ ...d, pipeline: [...d.pipeline, { ...card, id: uid(), status: "Novo" }] }));
  const updateCardStatus = (id, status) =>
    setData((d) => ({ ...d, pipeline: d.pipeline.map((c) => (c.id === id ? { ...c, status } : c)) }));
  const deleteCard = (id) =>
    setData((d) => ({ ...d, pipeline: d.pipeline.filter((c) => c.id !== id) }));

  const addTransaction = (tx) => {
    const parcelaTotal = Number(tx.parcelaTotal) || 1;
    if (parcelaTotal > 1) {
      const grupo = uid();
      const novas = Array.from({ length: parcelaTotal }, (_, i) => ({
        ...tx,
        id: uid(),
        data: addMonthsISO(tx.data, i),
        parcelaAtual: i + 1,
        parcelaTotal,
        grupoParcelamento: grupo,
      }));
      setData((d) => ({ ...d, transactions: [...d.transactions, ...novas] }));
    } else {
      setData((d) => ({ ...d, transactions: [...d.transactions, { ...tx, id: uid(), parcelaTotal: 1 }] }));
    }
  };
  const deleteTransaction = (id) =>
    setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));

  if (!loaded) {
    return <div style={{ padding: 40, fontFamily: "Inter, sans-serif", color: "#5b6b76" }}>Carregando painel…</div>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)", fontFamily: "Inter, sans-serif", color: "var(--ink)" }}>
      <GlobalStyle />
      <Sidebar tab={tab} setTab={setTab} />
      <main style={{ flex: 1, padding: "28px 32px", minWidth: 0 }}>
        {saveError && (
          <div style={{ background: "#FBEAE8", border: "1px solid #E3A9A3", color: "var(--rose)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
            Não consegui salvar automaticamente agora — os dados continuam visíveis nesta sessão, mas podem se perder se você recarregar a página.
          </div>
        )}
        {tab === "pipeline" && (
          <Pipeline pipeline={data.pipeline} onAdd={addPipelineCard} onStatus={updateCardStatus} onDelete={deleteCard} />
        )}
        {tab === "calendario" && <Calendario transactions={data.transactions} pipeline={data.pipeline} />}
        {tab === "financeiro" && (
          <Financeiro transactions={data.transactions} onAdd={addTransaction} onDelete={deleteTransaction} />
        )}
      </main>
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
      :root{
        --bg:#EEF1F3; --surface:#FFFFFF; --ink:#16232E; --muted:#5B6B76;
        --navy:#1F3A5F; --navy-ink:#16283F; --teal:#0E7C7B; --amber:#C4890F;
        --rose:#C1443C; --line:#D9E0E5;
      }
      *{box-sizing:border-box;}
      h1,h2,h3{font-family:'Fraunces',serif; margin:0; letter-spacing:-0.01em;}
      .mono{font-family:'IBM Plex Mono',monospace;}
      .btn{border:none;border-radius:8px;padding:9px 14px;font-size:13.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:opacity .15s;}
      .btn:hover{opacity:.85;}
      .btn-primary{background:var(--navy);color:#fff;}
      .btn-teal{background:var(--teal);color:#fff;}
      .btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--line);}
      .btn-danger{background:transparent;color:var(--rose);padding:6px;}
      .card{background:var(--surface);border:1px solid var(--line);border-radius:12px;}
      .input,.select{border:1px solid var(--line);border-radius:7px;padding:8px 10px;font-size:13.5px;font-family:inherit;background:#fff;color:var(--ink);width:100%;}
      .input:focus,.select:focus{outline:2px solid var(--teal);outline-offset:1px;}
      .label{font-size:11.5px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;display:block;}
      .pill{border-radius:999px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid var(--line);background:#fff;color:var(--muted);}
      .pill.active{background:var(--navy);color:#fff;border-color:var(--navy);}
      .stamp{width:9px;height:9px;border-radius:50%;display:inline-block;}
      table{width:100%;border-collapse:collapse;}
      th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);padding:8px 10px;border-bottom:1px solid var(--line);font-weight:600;}
      td{padding:10px 10px;border-bottom:1px solid var(--line);font-size:13.5px;}
      tr:last-child td{border-bottom:none;}
    `}</style>
  );
}

function Sidebar({ tab, setTab }) {
  const items = [
    { key: "pipeline", label: "Pipeline", icon: LayoutGrid },
    { key: "calendario", label: "Calendário", icon: CalendarDays },
    { key: "financeiro", label: "Financeiro", icon: Wallet },
  ];
  return (
    <aside style={{ width: 216, background: "var(--navy-ink)", color: "#fff", padding: "24px 16px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 28px" }}>
        <Stamp size={20} color="#C4890F" />
        <h2 style={{ fontSize: 17, color: "#fff" }}>Painel Carla</h2>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((it) => {
          const Icon = it.icon;
          const active = tab === it.key;
          return (
            <button
              key={it.key}
              onClick={() => setTab(it.key)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8,
                background: active ? "rgba(255,255,255,0.12)" : "transparent", color: active ? "#fff" : "rgba(255,255,255,0.65)",
                border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, textAlign: "left", width: "100%",
              }}
            >
              <Icon size={17} />
              {it.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

/* ---------------- PIPELINE ---------------- */
function Pipeline({ pipeline, onAdd, onStatus, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ cliente: "", categoria: "seguros", subtipo: CATEGORIAS.seguros.subtipos[0], valor: "", dataPrevista: todayISO() });

  const submit = (e) => {
    e.preventDefault();
    const valorNum = parseValorBR(form.valor);
    if (!form.cliente.trim()) { setErro("Preencha o nome do cliente."); return; }
    if (!form.valor || isNaN(valorNum)) { setErro("Informe um valor válido (ex: 150,00)."); return; }
    setErro("");
    onAdd({ ...form, valor: valorNum });
    setForm({ cliente: "", categoria: "seguros", subtipo: CATEGORIAS.seguros.subtipos[0], valor: "", dataPrevista: todayISO() });
    setShowForm(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24 }}>Pipeline de atendimentos</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          <Plus size={15} /> Novo atendimento
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card" style={{ padding: 18, marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(5, 1fr) auto", gap: 12, alignItems: "end" }}>
          <div>
            <label className="label">Cliente</label>
            <input className="input" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} placeholder="Nome do cliente" />
          </div>
          <div>
            <label className="label">Categoria</label>
            <select className="select" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value, subtipo: CATEGORIAS[e.target.value].subtipos[0] })}>
              {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subtipo</label>
            <select className="select" value={form.subtipo} onChange={(e) => setForm({ ...form, subtipo: e.target.value })}>
              {CATEGORIAS[form.categoria].subtipos.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Valor (R$)</label>
            <input className="input" type="text" inputMode="decimal" placeholder="0,00" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </div>
          <div>
            <label className="label">Previsão</label>
            <input className="input" type="date" value={form.dataPrevista} onChange={(e) => setForm({ ...form, dataPrevista: e.target.value })} />
          </div>
          <button className="btn btn-teal" type="submit">Adicionar</button>
        </form>
      )}

      {erro && (
        <div style={{ background: "#FBEAE8", border: "1px solid #E3A9A3", color: "var(--rose)", borderRadius: 8, padding: "8px 14px", fontSize: 13, marginBottom: 16, marginTop: -8 }}>
          {erro}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${STATUSES.length}, minmax(220px, 1fr))`, gap: 14, overflowX: "auto" }}>
        {STATUSES.map((status) => {
          const cards = pipeline.filter((c) => c.status === status);
          return (
            <div key={status} style={{ background: "#E4E9EC", borderRadius: 12, padding: 12, minHeight: 200 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
                {status} <span>{cards.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cards.map((c) => (
                  <div key={c.id} className="card" style={{ padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <strong style={{ fontSize: 13.5 }}>{c.cliente}</strong>
                      <button className="btn-danger" onClick={() => onDelete(c.id)}><Trash2 size={14} /></button>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0" }}>
                      {CATEGORIAS[c.categoria].label} · {c.subtipo}
                    </div>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{fmtBRL(c.valor)}</div>
                    <select className="select" style={{ fontSize: 12, padding: "5px 6px" }} value={c.status} onChange={(e) => onStatus(c.id, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- CALENDÁRIO ---------------- */
function Calendario({ transactions, pipeline }) {
  const [ref, setRef] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selDay, setSelDay] = useState(null);

  const effDate = (t) => t.dataRecebimento || t.data;

  const sortedTx = useMemo(() => [...transactions].sort((a, b) => effDate(a).localeCompare(effDate(b))), [transactions]);

  const saldoAte = (iso) => {
    let saldo = 0;
    for (const t of sortedTx) {
      if (effDate(t) <= iso) saldo += t.tipo === "receita" ? t.valor : -t.valor;
    }
    return saldo;
  };

  const firstOfMonth = new Date(ref.y, ref.m, 1);
  const daysInMonth = new Date(ref.y, ref.m + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();
  const cells = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const isoFor = (day) => `${ref.y}-${String(ref.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const dayItems = (iso) => ({
    tx: transactions.filter((t) => effDate(t) === iso),
    compromissos: pipeline.filter((c) => c.dataPrevista === iso),
  });

  const selItems = selDay ? dayItems(selDay) : null;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Calendário</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <button className="btn btn-ghost" onClick={() => setRef((r) => (r.m === 0 ? { y: r.y - 1, m: 11 } : { y: r.y, m: r.m - 1 }))}><ChevronLeft size={15} /></button>
            <h3 style={{ fontSize: 16 }}>{MESES[ref.m]} de {ref.y}</h3>
            <button className="btn btn-ghost" onClick={() => setRef((r) => (r.m === 11 ? { y: r.y + 1, m: 0 } : { y: r.y, m: r.m + 1 }))}><ChevronRight size={15} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 6 }}>
            {DIAS_SEMANA.map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const iso = isoFor(day);
              const items = dayItems(iso);
              const hasReceita = items.tx.some((t) => t.tipo === "receita");
              const hasDespesa = items.tx.some((t) => t.tipo === "despesa");
              const isToday = iso === todayISO();
              return (
                <button
                  key={i}
                  onClick={() => setSelDay(iso)}
                  style={{
                    borderRadius: 8, padding: "6px 4px", minHeight: 58, textAlign: "left",
                    border: isToday ? "1.5px solid var(--navy)" : "1px solid var(--line)",
                    background: selDay === iso ? "#E4E9EC" : "#fff", cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{day}</div>
                  <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                    {hasReceita && <span className="stamp" style={{ background: "var(--teal)" }} />}
                    {hasDespesa && <span className="stamp" style={{ background: "var(--rose)" }} />}
                    {items.compromissos.length > 0 && <span className="stamp" style={{ background: "var(--amber)" }} />}
                  </div>
                  <div className="mono" style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 3 }}>{fmtBRL(saldoAte(iso)).replace("R$", "")}</div>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 12, color: "var(--muted)" }}>
            <span><span className="stamp" style={{ background: "var(--teal)" }} /> Receita</span>
            <span><span className="stamp" style={{ background: "var(--rose)" }} /> Despesa</span>
            <span><span className="stamp" style={{ background: "var(--amber)" }} /> Compromisso</span>
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>{selDay ? fmtDate(selDay) : "Selecione um dia"}</h3>
          {selDay && selItems && (
            <>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
                Saldo projetado: <span className="mono" style={{ color: "var(--ink)", fontWeight: 600 }}>{fmtBRL(saldoAte(selDay))}</span>
              </div>
              {selItems.tx.length === 0 && selItems.compromissos.length === 0 && (
                <div style={{ fontSize: 13, color: "var(--muted)" }}>Nada lançado neste dia.</div>
              )}
              {selItems.tx.map((t) => (
                <div key={t.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.descricao || t.classificacao}</div>
                  <div style={{ fontSize: 12, color: t.tipo === "receita" ? "var(--teal)" : "var(--rose)" }} className="mono">
                    {t.tipo === "receita" ? "+" : "−"} {fmtBRL(t.valor)} {t.parcelaTotal > 1 ? `(${t.parcelaAtual}/${t.parcelaTotal})` : ""}
                  </div>
                </div>
              ))}
              {selItems.compromissos.map((c) => (
                <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.cliente}</div>
                  <div style={{ fontSize: 12, color: "var(--amber)" }}>{CATEGORIAS[c.categoria].label} · {c.subtipo}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- FINANCEIRO ---------------- */
function Financeiro({ transactions, onAdd, onDelete }) {
  const [empresa, setEmpresa] = useState("seguros");
  const [subView, setSubView] = useState("lancamentos");
  const [showReport, setShowReport] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 style={{ fontSize: 24 }}>Financeiro</h1>
        <button className="btn btn-ghost" onClick={() => setShowReport((s) => !s)}>
          <FileBarChart size={15} /> Relatório por período
        </button>
      </div>

      {showReport ? (
        <Relatorio transactions={transactions} />
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {EMPRESAS.map((e) => (
              <button key={e.key} className={`pill ${empresa === e.key ? "active" : ""}`} onClick={() => { setEmpresa(e.key); setSubView("lancamentos"); }}>
                {e.label}
              </button>
            ))}
          </div>

          {empresa === "pessoa_fisica" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <button className={`pill ${subView === "lancamentos" ? "active" : ""}`} onClick={() => setSubView("lancamentos")}><List size={13} style={{ marginRight: 4 }} />Lançamentos</button>
              <button className={`pill ${subView === "cartao" ? "active" : ""}`} onClick={() => setSubView("cartao")}><CreditCard size={13} style={{ marginRight: 4 }} />Cartão de Crédito</button>
            </div>
          )}

          {subView === "cartao" && empresa === "pessoa_fisica" ? (
            <CartaoCredito transactions={transactions} onDelete={onDelete} />
          ) : (
            <LancamentosEmpresa empresa={empresa} transactions={transactions} onAdd={onAdd} onDelete={onDelete} />
          )}
        </>
      )}
    </div>
  );
}

function Totais({ list }) {
  const receitas = list.filter((t) => t.tipo === "receita").reduce((s, t) => s + t.valor, 0);
  const despesas = list.filter((t) => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
      {[
        { label: "Receitas", val: receitas, color: "var(--teal)" },
        { label: "Despesas", val: despesas, color: "var(--rose)" },
        { label: "Saldo", val: receitas - despesas, color: "var(--navy)" },
      ].map((c) => (
        <div key={c.label} className="card" style={{ padding: 16 }}>
          <div className="label">{c.label}</div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{fmtBRL(c.val)}</div>
        </div>
      ))}
    </div>
  );
}

function LancamentosEmpresa({ empresa, transactions, onAdd, onDelete }) {
  const list = transactions.filter((t) => t.empresa === empresa).sort((a, b) => b.data.localeCompare(a.data));
  const [showForm, setShowForm] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({
    tipo: "receita", valor: "", data: todayISO(), dataRecebimento: "", classificacao: CLASSIFICACOES[0],
    descricao: "", cartao: empresa === "pessoa_fisica" ? CARTOES[0] : "", parcelado: false, parcelaTotal: 2,
  });

  useEffect(() => {
    setForm((f) => ({ ...f, cartao: empresa === "pessoa_fisica" ? CARTOES[0] : "" }));
  }, [empresa]);

  const submit = (e) => {
    e.preventDefault();
    const valorNum = parseValorBR(form.valor);
    if (!form.valor || isNaN(valorNum)) { setErro("Informe um valor válido (ex: 150,00)."); return; }
    if (form.parcelado && (!form.parcelaTotal || Number(form.parcelaTotal) < 2)) { setErro("Informe o número de parcelas (mínimo 2)."); return; }
    setErro("");
    onAdd({
      empresa, tipo: form.tipo, valor: valorNum, data: form.data,
      dataRecebimento: form.dataRecebimento || null, classificacao: form.classificacao,
      descricao: form.descricao, cartao: form.tipo === "despesa" && empresa === "pessoa_fisica" ? form.cartao : null,
      parcelaTotal: form.parcelado ? Number(form.parcelaTotal) : 1,
    });
    setForm({ ...form, valor: "", descricao: "", dataRecebimento: "", parcelado: false });
    setShowForm(false);
  };

  return (
    <div>
      <Totais list={list} />
      <div style={{ marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}><Plus size={15} /> Novo lançamento</button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card" style={{ padding: 18, marginBottom: 18, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <div>
            <label className="label">Tipo</label>
            <select className="select" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>
          <div>
            <label className="label">{form.parcelado ? "Valor da parcela (R$)" : "Valor (R$)"}</label>
            <input className="input" type="text" inputMode="decimal" placeholder="0,00" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </div>
          <div>
            <label className="label">Data</label>
            <input className="input" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </div>
          {form.tipo === "receita" && (
            <div>
              <label className="label">Data de recebimento (se diferente)</label>
              <input className="input" type="date" value={form.dataRecebimento} onChange={(e) => setForm({ ...form, dataRecebimento: e.target.value })} />
            </div>
          )}
          <div>
            <label className="label">Classificação</label>
            <input className="input" list="classificacoes" value={form.classificacao} onChange={(e) => setForm({ ...form, classificacao: e.target.value })} />
            <datalist id="classificacoes">{CLASSIFICACOES.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label className="label">Descrição</label>
            <input className="input" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: certificado emitido para cliente X" />
          </div>
          {form.tipo === "despesa" && empresa === "pessoa_fisica" && (
            <div>
              <label className="label">Cartão</label>
              <select className="select" value={form.cartao} onChange={(e) => setForm({ ...form, cartao: e.target.value })}>
                {CARTOES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={form.parcelado} onChange={(e) => setForm({ ...form, parcelado: e.target.checked })} id="parc" />
            <label htmlFor="parc" style={{ fontSize: 13 }}>Compra parcelada</label>
          </div>
          {form.parcelado && (
            <div>
              <label className="label">Número de parcelas</label>
              <input className="input" type="number" min="2" value={form.parcelaTotal} onChange={(e) => setForm({ ...form, parcelaTotal: e.target.value })} />
            </div>
          )}
          <div style={{ gridColumn: "span 4" }}>
            <button className="btn btn-teal" type="submit">Adicionar lançamento</button>
          </div>
        </form>
      )}

      {erro && (
        <div style={{ background: "#FBEAE8", border: "1px solid #E3A9A3", color: "var(--rose)", borderRadius: 8, padding: "8px 14px", fontSize: 13, marginBottom: 16 }}>
          {erro}
        </div>
      )}

      <div className="card" style={{ padding: 4 }}>
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Classificação</th><th>Parcela</th><th>Valor</th><th></th></tr></thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id}>
                <td>{fmtDate(t.data)}</td>
                <td>{t.descricao || "—"}</td>
                <td>{t.classificacao}</td>
                <td>{t.parcelaTotal > 1 ? `${t.parcelaAtual}/${t.parcelaTotal}` : "—"}</td>
                <td className="mono" style={{ color: t.tipo === "receita" ? "var(--teal)" : "var(--rose)", fontWeight: 600 }}>
                  {t.tipo === "receita" ? "+" : "−"} {fmtBRL(t.valor)}
                </td>
                <td><button className="btn-danger" onClick={() => onDelete(t.id)}><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} style={{ color: "var(--muted)", textAlign: "center", padding: 20 }}>Nenhum lançamento ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CartaoCredito({ transactions, onDelete }) {
  const today = todayISO();
  const currentMonth = today.slice(0, 7);
  const cartaoTx = transactions.filter((t) => t.empresa === "pessoa_fisica" && t.tipo === "despesa" && t.cartao);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
      {CARTOES.map((cartao) => {
        const list = cartaoTx.filter((t) => t.cartao === cartao).sort((a, b) => b.data.localeCompare(a.data));
        const somaMensal = list.filter((t) => t.data.slice(0, 7) === currentMonth).reduce((s, t) => s + t.valor, 0);
        const somaParcelado = list.filter((t) => t.parcelaTotal > 1 && t.data > today).reduce((s, t) => s + t.valor, 0);
        return (
          <div key={cartao} className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ fontSize: 15 }}>{cartao}</h3>
              <CreditCard size={16} color="var(--muted)" />
            </div>
            <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
              <div>
                <div className="label">Soma do mês</div>
                <div className="mono" style={{ fontWeight: 700, fontSize: 15 }}>{fmtBRL(somaMensal)}</div>
              </div>
              <div>
                <div className="label">Parcelado pendente</div>
                <div className="mono" style={{ fontWeight: 700, fontSize: 15, color: "var(--amber)" }}>{fmtBRL(somaParcelado)}</div>
              </div>
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              <table>
                <tbody>
                  {list.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontSize: 12 }}>{fmtDate(t.data)}</td>
                      <td style={{ fontSize: 12 }}>{t.descricao || t.classificacao}</td>
                      <td style={{ fontSize: 12 }}>{t.parcelaTotal > 1 ? `${t.parcelaAtual}/${t.parcelaTotal}` : "—"}</td>
                      <td className="mono" style={{ fontSize: 12, textAlign: "right" }}>{fmtBRL(t.valor)}</td>
                      <td><button className="btn-danger" onClick={() => onDelete(t.id)}><Trash2 size={12} /></button></td>
                    </tr>
                  ))}
                  {list.length === 0 && <tr><td style={{ color: "var(--muted)", fontSize: 12, padding: 10 }}>Sem despesas neste cartão.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Relatorio({ transactions }) {
  const [inicio, setInicio] = useState(() => todayISO().slice(0, 8) + "01");
  const [fim, setFim] = useState(todayISO());

  const effDate = (t) => t.dataRecebimento || t.data;
  const filtrado = transactions.filter((t) => effDate(t) >= inicio && effDate(t) <= fim);

  return (
    <div>
      <div className="card" style={{ padding: 16, marginBottom: 18, display: "flex", gap: 16, alignItems: "end" }}>
        <div>
          <label className="label">De</label>
          <input className="input" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div>
          <label className="label">Até</label>
          <input className="input" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        </div>
      </div>

      <Totais list={filtrado} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {EMPRESAS.map((e) => {
          const list = filtrado.filter((t) => t.empresa === e.key);
          const receitas = list.filter((t) => t.tipo === "receita").reduce((s, t) => s + t.valor, 0);
          const despesas = list.filter((t) => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);
          return (
            <div key={e.key} className="card" style={{ padding: 16 }}>
              <h3 style={{ fontSize: 14, marginBottom: 10 }}>{e.label}</h3>
              <div style={{ fontSize: 13, color: "var(--teal)" }} className="mono">Receitas: {fmtBRL(receitas)}</div>
              <div style={{ fontSize: 13, color: "var(--rose)" }} className="mono">Despesas: {fmtBRL(despesas)}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }} className="mono">Saldo: {fmtBRL(receitas - despesas)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
