"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
      window.location.assign("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="brand-mark large"><span>N</span></div>
        <p className="eyebrow">NEXO EXECUTIVO</p>
        <h1>Seus dados.<br /><span>Uma visão.</span></h1>
        <p className="login-copy">Entre no portal de indicadores para acompanhar os resultados da empresa em um só lugar.</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="password">Senha de acesso</label>
          <div className="password-wrap">
            <LockKeyhole size={17} aria-hidden="true" />
            <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" autoComplete="current-password" required />
            <button type="button" className="icon-button password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="login-submit" disabled={loading}>{loading ? "Validando..." : "Acessar portal"}<ArrowRight size={17} /></button>
        </form>
        <div className="login-security"><ShieldCheck size={17} /><span>Acesso protegido. Suas planilhas permanecem privadas.</span></div>
      </section>
      <aside className="login-art" aria-label="Visualização ilustrativa de dados">
        <div className="art-orb orb-one" /><div className="art-orb orb-two" />
        <div className="art-content">
          <span className="art-kicker">EXECUTIVE INTELLIGENCE</span>
          <h2>Transforme informação<br />em <em>decisões melhores.</em></h2>
          <div className="art-stats"><div><span>01</span><p>Visão centralizada</p></div><div><span>02</span><p>Indicadores claros</p></div><div><span>03</span><p>Decisões com contexto</p></div></div>
          <div className="art-bottom"><span className="art-dot" /> Plataforma de indicadores corporativos</div>
        </div>
      </aside>
    </main>
  );
}
