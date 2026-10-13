"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity, AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3,
  Bell, CalendarDays, CheckCircle2, ChevronDown, CircleHelp, Clock3, Download,
  Factory, FileSpreadsheet, Gauge, LayoutDashboard, LogOut, Menu, RefreshCw,
  Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Wallet, Users,
  X,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { DashboardPayload, SourceData } from "@/lib/types";

const demoTrend = [
  { month: "Mai", performance: 68, target: 75 },
  { month: "Jun", performance: 74, target: 75 },
  { month: "Jul", performance: 72, target: 78 },
  { month: "Ago", performance: 81, target: 80 },
  { month: "Set", performance: 79, target: 82 },
  { month: "Out", performance: 88, target: 85 },
  { month: "Nov", performance: 86, target: 85 },
  { month: "Dez", performance: 93, target: 88 },
];

const demoArea = [
  { name: "Operacional", value: 36, color: "#4779e8" },
  { name: "Segurança", value: 27, color: "#21a67a" },
  { name: "Pessoas", value: 21, color: "#e9a23b" },
  { name: "Financeiro", value: 16, color: "#8e75dc" },
];

const demoRows = [
  { area: "Operacional", metric: "Produtividade", result: "94,2%", status: "Na meta", color: "green", date: "13 out, 09:42" },
  { area: "Segurança", metric: "Treinamentos válidos", result: "98,6%", status: "Na meta", color: "green", date: "13 out, 09:18" },
  { area: "Pessoas", metric: "Absenteísmo", result: "2,4%", status: "Acompanhar", color: "amber", date: "13 out, 08:55" },
  { area: "Financeiro", metric: "Desvio orçamentário", result: "+3,1%", status: "Atenção", color: "red", date: "12 out, 17:32" },
  { area: "Operacional", metric: "Pedidos no prazo", result: "96,8%", status: "Na meta", color: "green", date: "12 out, 16:48" },
];

const navItems = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard, title: "Visão geral", description: "Uma leitura rápida dos indicadores mais importantes." },
  { id: "operational", label: "Operacional", icon: Factory, title: "Desempenho operacional", description: "Volumes, produtividade, prazos e eficiência." },
  { id: "safety", label: "Segurança", icon: ShieldCheck, title: "Segurança e conformidade", description: "Indicadores de segurança, treinamento e conformidade." },
  { id: "finance", label: "Financeiro", icon: Wallet, title: "Visão financeira", description: "Custos, orçamento, receitas e variações." },
  { id: "people", label: "Pessoas", icon: Users, title: "Indicadores de pessoas", description: "Acompanhamento de equipes e indicadores de pessoas." },
];

const sectionKeywords: Record<string, string[]> = {
  operational: ["operacional", "produção", "produtividade", "logística", "operação", "prazo", "volume"],
  safety: ["segurança", "sst", "acidente", "treinamento", "aso", "epi", "conformidade", "risco"],
  finance: ["financeiro", "custo", "receita", "despesa", "orçamento", "faturamento", "margem"],
  people: ["pessoas", "rh", "colaborador", "funcionário", "absenteísmo", "equipe", "headcount"],
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatLastUpdated(iso?: string) {
  if (!iso) return "Aguardando leitura";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }).format(new Date(iso));
}

function displayCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function DownloadCsv({ sources }: { sources: SourceData[] }) {
  const exportCsv = () => {
    const allHeaders = Array.from(new Set(["Fonte", ...sources.flatMap((source) => source.headers)]));
    const rows = sources.flatMap((source) => source.rows.map((row) => ({ Fonte: source.name, ...row })));
    const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [allHeaders.map(quote).join(";"), ...rows.map((row) => allHeaders.map((header) => quote((row as Record<string, unknown>)[header])).join(";"))].join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dados-portal-executivo-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };
  return <button className="button button-dark" onClick={exportCsv}><Download size={16} /> Exportar dados</button>;
}

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [period, setPeriod] = useState("6 meses");
  const [search, setSearch] = useState("");
  const [payload, setPayload] = useState<DashboardPayload>({ mode: "demo", generatedAt: new Date().toISOString(), sources: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiWarning, setApiWarning] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const result = await response.json();
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        setApiWarning(result.error || "Não foi possível conectar as fontes de dados.");
        return;
      }
      setPayload(result as DashboardPayload);
      setApiWarning("");
    } catch {
      setApiWarning("Não foi possível consultar a API. O painel de demonstração continua disponível.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const section = navItems.find((item) => item.id === activeSection) ?? (activeSection === "sources"
    ? { id: "sources", label: "Fontes de dados", title: "Fontes de dados", description: "Conecte e acompanhe as planilhas que alimentam o portal." }
    : activeSection === "settings"
      ? { id: "settings", label: "Configurações", title: "Configurações", description: "Ajuste o acesso, as integrações e a atualização dos dados." }
      : navItems[0]);
  const liveSources = payload.mode === "live" ? payload.sources : [];
  const totalRows = liveSources.reduce((sum, source) => sum + source.rowCount, 0);
  const totalColumns = new Set(liveSources.flatMap((source) => source.headers)).size;
  const sourceErrors = liveSources.filter((source) => source.status === "error").length;

  const sectionSources = useMemo(() => {
    if (activeSection === "overview") return liveSources;
    const keywords = sectionKeywords[activeSection] ?? [];
    return liveSources.filter((source) => {
      const searchable = `${source.name} ${source.headers.join(" ")}`.toLocaleLowerCase("pt-BR");
      return keywords.some((keyword) => searchable.includes(keyword));
    });
  }, [activeSection, liveSources]);

  const visibleRows = useMemo(() => {
    const rows = sectionSources.flatMap((source) => source.rows.map((row) => ({ source: source.name, values: row })));
    if (!search.trim()) return rows.slice(0, 12);
    const term = search.toLocaleLowerCase("pt-BR");
    return rows.filter((item) => `${item.source} ${Object.values(item.values).join(" ")}`.toLocaleLowerCase("pt-BR").includes(term)).slice(0, 50);
  }, [search, sectionSources]);

  const liveHeaders = useMemo(() => Array.from(new Set(sectionSources.flatMap((source) => source.headers))).slice(0, 5), [sectionSources]);
  const liveBars = sectionSources.map((source) => ({ name: source.name, registros: source.rowCount }));
  const lastUpdated = formatLastUpdated(payload.generatedAt);
  const displayDemoTrend = period === "3 meses" ? demoTrend.slice(-3) : period === "6 meses" ? demoTrend.slice(-6) : demoTrend;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  function chooseSection(id: string) {
    setActiveSection(id);
    setMobileNavOpen(false);
    setSearch("");
  }

  const demoSection = payload.mode === "demo" && activeSection !== "overview";

  return (
    <div className="app-shell">
      {mobileNavOpen && <button className="nav-scrim" onClick={() => setMobileNavOpen(false)} aria-label="Fechar menu" />}
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><span>N</span></div>
          <div className="brand-copy"><strong>nexo<span>.</span></strong><small>EXECUTIVE INTELLIGENCE</small></div>
          <button className="icon-button close-nav" aria-label="Fechar menu" onClick={() => setMobileNavOpen(false)}><X size={19} /></button>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-picker"><span className="workspace-avatar">E</span><span className="workspace-text"><strong>Empresa</strong><small>Portal corporativo</small></span><ChevronDown size={15} /></button>

        <div className="nav-label">PAINEL PRINCIPAL</div>
        <nav className="main-nav" aria-label="Navegação principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={`nav-item ${activeSection === item.id ? "active" : ""}`} onClick={() => chooseSection(item.id)}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === "safety" && <span className="nav-count">3</span>}</button>;
          })}
        </nav>

        <div className="nav-label source-label">DADOS E CONFIGURAÇÃO</div>
        <button className={`nav-item ${activeSection === "sources" ? "active" : ""}`} onClick={() => chooseSection("sources")}><FileSpreadsheet size={18} strokeWidth={1.8} /><span>Fontes de dados</span><span className="nav-count muted">{payload.mode === "live" ? liveSources.length : "—"}</span></button>
        <button className={`nav-item ${activeSection === "settings" ? "active" : ""}`} onClick={() => chooseSection("settings")}><Settings2 size={18} strokeWidth={1.8} /><span>Configurações</span></button>

        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><strong>Precisa de ajuda?</strong><p>Organize suas fontes e transforme dados em decisões.</p><a href="https://developers.google.com/workspace/sheets/api" target="_blank" rel="noreferrer">Ver guia de integração <ArrowRight size={13} /></a></div>
          <div className="user-row"><div className="user-avatar">DG</div><div className="user-info"><strong>Administrador</strong><small>Portal executivo</small></div>{payload.authEnabled && <button className="icon-button user-menu" aria-label="Sair do portal" onClick={logout}><LogOut size={16} /></button>}</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Abrir menu" onClick={() => setMobileNavOpen(true)}><Menu size={21} /></button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{section.label}</strong></div></div>
          <div className="topbar-actions"><div className="live-indicator"><span className={`status-dot ${payload.mode === "live" ? "connected" : "demo"}`} />{payload.mode === "live" ? "Fontes conectadas" : "Modo demonstração"}</div><span className="icon-button notification-button" aria-label="Notificações"><Bell size={18} /><i /></span><div className="topbar-divider" /><div className="mini-avatar">DG</div></div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div><p className="eyebrow">EXECUTIVE OVERVIEW <span className="eyebrow-line" /></p><h1>{section.title}</h1><p className="page-subtitle">{section.description}</p></div>
            <div className="heading-actions"><button className="button button-light" onClick={() => void loadData(true)} disabled={refreshing}><RefreshCw size={15} className={refreshing ? "spin" : ""} /> Atualizar</button>{payload.mode === "live" ? <DownloadCsv sources={sectionSources} /> : <button className="button button-dark" onClick={() => window.print()}><Download size={16} /> Exportar relatório</button>}</div>
          </section>

          {payload.mode === "demo" && <div className="demo-banner"><div className="demo-banner-icon"><Sparkles size={17} /></div><div><strong>Você está visualizando dados de demonstração</strong><p>Os números e gráficos abaixo são ilustrativos. Conecte as planilhas do Google Sheets para exibir os dados reais da empresa.</p></div><button onClick={() => chooseSection("sources")}>Configurar fontes <ArrowRight size={15} /></button></div>}
          {apiWarning && <div className="warning-banner"><AlertCircle size={18} /><div><strong>Conexão pendente</strong><p>{apiWarning}</p></div></div>}

          {activeSection === "sources" ? (
            <SourcesView mode={payload.mode} sources={liveSources} loading={loading} onRefresh={() => void loadData(true)} />
          ) : activeSection === "settings" ? (
            <SettingsView />
          ) : demoSection ? (
            <div className="module-placeholder"><div className="placeholder-icon"><SlidersHorizontal size={25} /></div><span className="eyebrow">MÓDULO PREPARADO</span><h2>Vamos configurar este painel com seus dados.</h2><p>Assim que analisarmos suas planilhas, definiremos os indicadores, metas e gráficos específicos desta área. Por enquanto, nenhum dado real está sendo exibido.</p><button className="button button-dark" onClick={() => chooseSection("sources")}>Conectar planilhas <ArrowRight size={16} /></button></div>
          ) : (
            <>
              <section className="kpi-grid">
                {payload.mode === "live" ? <>
                  <KpiCard label="Planilhas conectadas" value={formatNumber(liveSources.filter((source) => source.status === "ok").length)} delta={`${liveSources.length} configuradas`} icon={<FileSpreadsheet size={19} />} tone="blue" foot="Fontes de dados" />
                  <KpiCard label="Registros encontrados" value={formatNumber(totalRows)} delta="Até 1.000 linhas exibidas por fonte" icon={<Activity size={19} />} tone="green" foot="Linhas após o cabeçalho" />
                  <KpiCard label="Campos identificados" value={formatNumber(totalColumns)} delta="Nomes de colunas únicos" icon={<BarChart3 size={19} />} tone="violet" foot="Estrutura de dados" />
                  <KpiCard label="Fontes com erro" value={formatNumber(sourceErrors)} delta={sourceErrors ? "Verifique permissões" : "Todas as fontes consultadas"} icon={<AlertCircle size={19} />} tone={sourceErrors ? "amber" : "green"} foot="Status da leitura" />
                </> : <>
                  <KpiCard label="Planilhas conectadas" value="04" delta="Exemplo ilustrativo" icon={<FileSpreadsheet size={19} />} tone="blue" foot="Fontes de dados" demo />
                  <KpiCard label="Meta média atingida" value="92,8%" delta={<><ArrowUpRight size={14} /> +4,6% vs. período anterior</>} icon={<Gauge size={19} />} tone="green" foot="Índice ilustrativo" demo />
                  <KpiCard label="Pontos de atenção" value="07" delta={<><ArrowDownRight size={14} /> 3 pendências prioritárias</>} icon={<AlertCircle size={19} />} tone="amber" foot="Exemplo de alertas" demo />
                  <KpiCard label="Indicadores monitorados" value="24" delta="Distribuídos em 4 áreas" icon={<BarChart3 size={19} />} tone="violet" foot="Catálogo ilustrativo" demo />
                </>}
              </section>

              <section className="filters-row"><div className="section-title"><h2>Desempenho dos indicadores</h2><p>{payload.mode === "live" ? "Volume de registros por fonte conectada" : "Acompanhamento mensal · exemplo de desempenho versus meta"}</p></div><div className="filter-controls">{payload.mode === "demo" ? <div className="select-control"><CalendarDays size={15} /><select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Período do dashboard"><option>3 meses</option><option>6 meses</option><option>12 meses</option></select><ChevronDown size={14} /></div> : <div className="select-control" title="O filtro temporal será configurado após mapear as colunas de data"><CalendarDays size={15} /><span className="filter-static">Período por configurar</span></div>}</div></section>

              <section className="charts-grid">
                <div className="panel trend-panel"><div className="panel-header"><div><h3>{payload.mode === "live" ? "Registros por fonte" : "Evolução do desempenho"}</h3><p>{payload.mode === "live" ? "Linhas disponíveis nas planilhas consultadas" : "Índice consolidado e meta de referência"}</p></div><span className="panel-menu" aria-hidden="true"><span className="three-dots">•••</span></span></div>
                  <div className="chart-legend"><span><i className="legend-dot primary-dot" />{payload.mode === "live" ? "Registros" : "Realizado"}</span>{payload.mode === "demo" && <span><i className="legend-dot target-dot" />Meta</span>}</div>
                  <div className="chart-area"><ResponsiveContainer width="100%" height="100%">{payload.mode === "live" ? <BarChart data={liveBars} margin={{ top: 12, right: 8, left: -18, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf1f5" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8994a5", fontSize: 11 }} interval={0} angle={liveBars.length > 4 ? -15 : 0} textAnchor={liveBars.length > 4 ? "end" : "middle"} height={liveBars.length > 4 ? 44 : 28} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8994a5", fontSize: 11 }} /><Tooltip cursor={{ fill: "#f5f8fc" }} contentStyle={{ border: "1px solid #e7ebf1", borderRadius: 10, boxShadow: "0 8px 24px rgba(17,35,67,.08)" }} /><Bar dataKey="registros" name="Registros" fill="#4779e8" radius={[5, 5, 0, 0]} maxBarSize={46} /></BarChart> : <AreaChart data={displayDemoTrend} margin={{ top: 14, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="performanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4779e8" stopOpacity={0.2} /><stop offset="100%" stopColor="#4779e8" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf1f5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8994a5", fontSize: 11 }} dy={9} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#8994a5", fontSize: 11 }} tickFormatter={(v) => `${v}%`} /><Tooltip contentStyle={{ border: "1px solid #e7ebf1", borderRadius: 10, boxShadow: "0 8px 24px rgba(17,35,67,.08)" }} formatter={(value) => `${value}%`} /><Area type="monotone" dataKey="target" stroke="#b5becb" strokeWidth={2} strokeDasharray="5 5" fill="transparent" dot={false} /><Area type="monotone" dataKey="performance" stroke="#4779e8" strokeWidth={2.7} fill="url(#performanceFill)" activeDot={{ r: 5, strokeWidth: 0 }} dot={{ r: 3, fill: "#fff", strokeWidth: 2, stroke: "#4779e8" }} /></AreaChart>}</ResponsiveContainer></div>
                  <div className="chart-foot"><span><Clock3 size={13} /> {payload.mode === "live" ? `Consultado em ${lastUpdated}` : "Dados ilustrativos para validar o layout"}</span><span className="subtle-tag">{payload.mode === "demo" ? period : "Sem filtro temporal"}</span></div>
                </div>

                <div className="panel mix-panel"><div className="panel-header"><div><h3>{payload.mode === "live" ? "Distribuição das fontes" : "Indicadores por área"}</h3><p>{payload.mode === "live" ? "Participação no total de registros lidos" : "Exemplo de composição do painel"}</p></div><span className="panel-menu" aria-hidden="true"><span className="three-dots">•••</span></span></div>
                  <div className="donut-wrap"><div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={payload.mode === "live" ? liveBars.map((item, index) => ({ name: item.name, value: item.registros, color: ["#4779e8", "#21a67a", "#e9a23b", "#8e75dc", "#e56b75"][index % 5] })) : demoArea} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="88%" paddingAngle={3} stroke="none">{(payload.mode === "live" ? liveBars.map((item, index) => ({ ...item, color: ["#4779e8", "#21a67a", "#e9a23b", "#8e75dc", "#e56b75"][index % 5] })) : demoArea).map((item, index) => <Cell key={`cell-${index}`} fill={item.color} />)}</Pie><Tooltip contentStyle={{ border: "1px solid #e7ebf1", borderRadius: 10, boxShadow: "0 8px 24px rgba(17,35,67,.08)" }} /></PieChart></ResponsiveContainer></div><div className="donut-center"><strong>{payload.mode === "live" ? formatNumber(totalRows) : "24"}</strong><span>{payload.mode === "live" ? "registros" : "indicadores"}</span></div></div>
                  <div className="area-legend">{(payload.mode === "live" ? liveBars.map((item, index) => ({ name: item.name, value: item.registros, color: ["#4779e8", "#21a67a", "#e9a23b", "#8e75dc", "#e56b75"][index % 5] })) : demoArea).slice(0, 5).map((item) => <div className="area-legend-row" key={item.name}><span className="area-legend-label"><i style={{ background: item.color }} />{item.name}</span><strong>{formatNumber(item.value)}{payload.mode === "demo" ? "%" : ""}</strong></div>)}</div>
                  <div className="mix-foot"><span className="green-mini-dot" />{payload.mode === "live" ? `${liveSources.length} fontes na leitura` : "Estrutura de exemplo"}<span className="mix-foot-right">{payload.mode === "live" ? "Dados reais" : "Somente demonstração"}</span></div>
                </div>
              </section>

              <section className="panel records-panel"><div className="records-header"><div><h3>{payload.mode === "live" ? "Registros das planilhas" : "Últimas atualizações"}</h3><p>{payload.mode === "live" ? "Amostra dos dados disponíveis nas fontes conectadas" : "Exemplo de como os principais indicadores podem aparecer"}</p></div><div className="records-tools"><div className="search-box"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar indicador..." aria-label="Buscar registro" /></div>{payload.mode === "live" && <DownloadCsv sources={sectionSources} />}</div></div>
                {payload.mode === "live" ? <LiveTable sources={sectionSources} headers={liveHeaders} rows={visibleRows} loading={loading} search={search} /> : <DemoTable search={search} />}
                <div className="records-foot"><span>{payload.mode === "live" ? `${visibleRows.length} registros exibidos nesta página` : "Exemplo ilustrativo · sem dados da empresa"}</span><button onClick={() => chooseSection("sources")}>Ver fontes de dados <ArrowRight size={14} /></button></div>
              </section>
            </>
          )}

          <footer className="page-footer"><span>© 2026 Nexo Executivo</span><span><span className="footer-dot" /> {payload.mode === "live" ? "Conectado ao Google Sheets" : "Ambiente de demonstração"}</span><span>Portal de indicadores corporativos</span></footer>
        </div>
      </main>
    </div>
  );
}

function KpiCard({ label, value, delta, icon, tone, foot, demo = false }: { label: string; value: string; delta: ReactNode; icon: ReactNode; tone: string; foot: string; demo?: boolean }) {
  return <article className="kpi-card"><div className="kpi-top"><span className={`kpi-icon ${tone}`}>{icon}</span>{demo && <span className="sample-pill">EXEMPLO</span>}</div><p className="kpi-label">{label}</p><div className="kpi-value">{value}</div><div className={`kpi-delta ${tone === "amber" ? "delta-amber" : ""}`}>{delta}</div><div className="kpi-divider" /><p className="kpi-foot">{foot}</p></article>;
}

function LiveTable({ sources, headers, rows, loading, search }: { sources: SourceData[]; headers: string[]; rows: { source: string; values: Record<string, unknown> }[]; loading: boolean; search: string }) {
  if (loading) return <div className="empty-state"><RefreshCw size={20} className="spin" /><p>Consultando suas planilhas...</p></div>;
  if (sources.length === 0 || sources.every((source) => source.rowCount === 0)) return <div className="empty-state"><FileSpreadsheet size={24} /><strong>Nenhum registro encontrado</strong><p>Confira os intervalos configurados e se a primeira linha contém os nomes das colunas.</p></div>;
  if (rows.length === 0) return <div className="empty-state"><Search size={23} /><strong>{search ? "Nenhum resultado para esta busca" : "Nenhuma linha disponível neste módulo"}</strong><p>{search ? "Tente outro termo." : "Confira se a fonte corresponde à área escolhida no menu."}</p></div>;
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Fonte</th>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((item, index) => <tr key={`${item.source}-${index}`}><td><span className="source-cell"><span className="source-cell-dot" />{item.source}</span></td>{headers.map((header) => <td key={header} title={displayCell(item.values[header])}>{displayCell(item.values[header])}</td>)}</tr>)}</tbody></table></div>;
}

function DemoTable({ search }: { search: string }) {
  const filtered = demoRows.filter((row) => `${row.area} ${row.metric} ${row.result} ${row.status}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Área</th><th>Indicador</th><th>Resultado</th><th>Status</th><th>Última atualização</th></tr></thead><tbody>{filtered.map((row) => <tr key={`${row.area}-${row.metric}`}><td><span className="area-name"><span className={`area-icon ${row.color}`} />{row.area}</span></td><td className="metric-name">{row.metric}</td><td className="result-number">{row.result}</td><td><span className={`status-pill ${row.color}`}>{row.status}</span></td><td className="date-cell">{row.date}</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-search">Nenhum indicador encontrado para “{search}”.</div>}</div>;
}

function SourcesView({ mode, sources, loading, onRefresh }: { mode: string; sources: SourceData[]; loading: boolean; onRefresh: () => void }) {
  return <section className="sources-page"><div className="panel source-intro"><div className="source-intro-icon"><FileSpreadsheet size={22} /></div><div><h2>Central de fontes</h2><p>Gerencie a conexão do portal com as planilhas que alimentam os dashboards. As credenciais são lidas somente no servidor.</p></div><button className="button button-light" onClick={onRefresh}><RefreshCw size={15} /> Testar conexão</button></div>
    {mode === "demo" ? <div className="connect-guide"><div className="guide-heading"><span className="guide-step">01</span><div><h3>Conecte seu Google Sheets</h3><p>Esta versão está preparada para ler várias planilhas privadas pela API oficial do Google.</p></div></div><div className="guide-steps"><div><span>1</span><strong>Ative a API</strong><p>No Google Cloud Console, habilite Google Sheets API e crie uma conta de serviço.</p></div><div><span>2</span><strong>Compartilhe as planilhas</strong><p>Adicione o e-mail da conta de serviço como Leitor em cada planilha.</p></div><div><span>3</span><strong>Configure a Vercel</strong><p>Cadastre as variáveis do arquivo <code>.env.example</code> nas configurações do projeto.</p></div></div><div className="guide-note"><ShieldCheck size={18} /><p><strong>Privacidade:</strong> não deixe suas planilhas públicas. Antes da conexão real, configure a senha do portal e o segredo da sessão.</p></div><a className="guide-link" href="https://console.cloud.google.com/apis/library/sheets.googleapis.com" target="_blank" rel="noreferrer">Abrir Google Sheets API <ArrowRight size={15} /></a></div> : <div className="source-grid">{sources.map((source) => <article className="panel source-card" key={source.name}><div className="source-card-top"><div className="source-file-icon"><FileSpreadsheet size={19} /></div><span className={`source-status ${source.status}`}>{source.status === "ok" ? <><CheckCircle2 size={13} /> Conectada</> : <><AlertCircle size={13} /> Com erro</>}</span></div><h3>{source.name}</h3><p>{source.headers.length} colunas identificadas · {formatNumber(source.rowCount)} registros</p>{source.error && <div className="source-error">{source.error}</div>}<div className="source-card-bottom"><span>Intervalo consultado</span><strong>{source.headers.length ? `${source.headers.length} campos` : "Sem cabeçalho"}</strong></div></article>)}</div>}
    {loading && <div className="loading-inline"><RefreshCw size={15} className="spin" /> Atualizando fontes…</div>}
    <div className="source-security"><div className="security-shield"><ShieldCheck size={19} /></div><div><strong>Segurança dos dados</strong><p>A integração usa permissão de leitura. IDs e credenciais devem ficar em variáveis de ambiente, nunca no código do navegador ou em repositório público.</p></div></div>
  </section>;
}

function SettingsView() {
  return <section className="settings-page"><div className="panel settings-intro"><div className="settings-intro-icon"><Settings2 size={23} /></div><div><h2>Configurações do portal</h2><p>Esta versão inicial usa variáveis de ambiente para manter as credenciais privadas e facilitar a implantação na Vercel.</p></div></div><div className="settings-grid"><article className="panel settings-card"><span className="setting-index">01 / ACESSO</span><h3>Proteção por senha</h3><p>Configure uma senha de acesso compartilhada e uma chave de sessão forte para impedir o acesso público aos dados reais.</p><div className="setting-code">DASHBOARD_PASSWORD<br />DASHBOARD_SESSION_SECRET</div><span className="setting-status"><ShieldCheck size={15} /> Configuração por ambiente</span></article><article className="panel settings-card"><span className="setting-index">02 / DADOS</span><h3>Fontes do Google Sheets</h3><p>Cadastre uma ou mais planilhas, com o nome amigável, o ID e o intervalo de células a ser lido.</p><div className="setting-code">GOOGLE_SERVICE_ACCOUNT_EMAIL<br />GOOGLE_PRIVATE_KEY<br />SHEETS_SOURCES_JSON</div><span className="setting-status"><FileSpreadsheet size={15} /> API somente leitura</span></article><article className="panel settings-card"><span className="setting-index">03 / ATUALIZAÇÃO</span><h3>Consulta sob demanda</h3><p>O botão Atualizar consulta as fontes novamente. Depois, podemos configurar cache, agendamento e histórico de dados conforme o volume.</p><div className="setting-code">Atualizar → consultar API → renderizar</div><span className="setting-status"><RefreshCw size={15} /> Atualização manual nesta versão</span></article></div><div className="settings-note"><AlertCircle size={18} /><div><strong>Personalização necessária antes de produção</strong><p>Os nomes das colunas, fórmulas dos KPIs, metas e regras de consolidação serão ajustados quando as planilhas reais forem analisadas. Não use os indicadores de demonstração como resultado corporativo.</p></div></div></section>;
}
