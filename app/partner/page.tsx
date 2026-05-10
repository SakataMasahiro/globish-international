'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Types ────────────────────────────────────────────────────────────
interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company?: string;
  referral_code: string;
  status: 'pending' | 'active' | 'suspended';
  bank_name?: string;
  bank_account?: string;
  created_at: string;
}

interface ReferredClinic {
  id: string;
  clinic_name: string;
  plan: string;
  status: string;
  created_at: string;
  monthly_fee: number;
  commission: number;
}

// ── Commission rate ──────────────────────────────────────────────────
const COMMISSION_RATE = 0.35;
const PLAN_PRICES: Record<string, number> = {
  starter: 5900, standard: 9800, growth: 15800, premium: 29800
};

// ── Colors ───────────────────────────────────────────────────────────
const C = {
  bg:      '#0D1117',
  surface: '#161B22',
  surface2:'#21262D',
  border:  '#30363D',
  text:    '#F0F6FC',
  muted:   '#8B949E',
  accent:  '#2196F3',
  green:   '#3FB950',
  amber:   '#D29922',
  red:     '#F85149',
  gold:    '#F0C05A',
  purple:  '#BC8CFF',
  teal:    '#39D353',
};

type View = 'lp' | 'register' | 'login' | 'dashboard' | 'clinics' | 'earnings' | 'tools';

export default function PartnerPortalPage() {
  const [view, setView] = useState<View>('lp');
  const [partner, setPartner] = useState<Partner | null>(null);
  const [clinics, setClinics] = useState<ReferredClinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [copied, setCopied] = useState(false);

  // ── Register form ────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', company: '',
    bank_name: '', bank_account: '',
  });
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState('');

  // ── Generate referral code ────────────────────────────────────────
  function genCode(name: string) {
    const prefix = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'PART';
    const num = Math.floor(1000 + Math.random() * 9000);
    return `TDC-${prefix}-${num}`;
  }

  // ── Register ──────────────────────────────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setRegError('');
    try {
      const code = genCode(form.name);
      const { error } = await supabase.from('partners').insert([{
        ...form,
        referral_code: code,
        status: 'pending',
      }]);
      if (error) throw error;
      setRegSuccess(true);
    } catch (err: any) {
      setRegError('登録に失敗しました。メールアドレスが既に登録されている可能性があります。');
    } finally {
      setLoading(false);
    }
  }

  // ── Login ────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('email', loginEmail)
        .eq('referral_code', loginCode.toUpperCase())
        .single();
      if (error || !data) throw new Error('not found');
      setPartner(data);
      await loadClinics(data.referral_code);
      setView('dashboard');
    } catch {
      setLoginError('メールアドレスまたは紹介コードが正しくありません');
    } finally {
      setLoading(false);
    }
  }

  // ── Load referred clinics ─────────────────────────────────────────
  async function loadClinics(code: string) {
    const { data } = await supabase
      .from('clinics')
      .select('*')
      .eq('referral_code', code);
    if (data) {
      setClinics(data.map(c => ({
        ...c,
        monthly_fee: PLAN_PRICES[c.plan?.toLowerCase()] ?? 9800,
        commission: Math.floor((PLAN_PRICES[c.plan?.toLowerCase()] ?? 9800) * COMMISSION_RATE),
      })));
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────
  const activeClinics = clinics.filter(c => c.status === 'active');
  const monthlyCommission = activeClinics.reduce((s, c) => s + c.commission, 0);
  const totalCommission = clinics.reduce((s, c) => s + c.commission, 0);
  const referralURL = `https://tascal-dental.vercel.app/register?ref=${partner?.referral_code ?? ''}`;

  function copyURL() {
    navigator.clipboard.writeText(referralURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ════════════════════════════════════════════════════════════════════
  // SHARED STYLES
  // ════════════════════════════════════════════════════════════════════
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: C.bg,
    fontFamily: "'Noto Sans JP', 'Segoe UI', sans-serif",
    color: C.text,
  };

  const cardStyle: React.CSSProperties = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: '1.75rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.text,
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
  };

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    padding: '13px',
    background: `linear-gradient(135deg, ${C.accent}, #1976D2)`,
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.05em',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: C.muted,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 6,
  };

  // ════════════════════════════════════════════════════════════════════
  // LP — Landing Page
  // ════════════════════════════════════════════════════════════════════
  if (view === 'lp') return (
    <div style={pageStyle}>

      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, #0D1117 0%, #1a237e 50%, #0D1117 100%)`,
        padding: '5rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'rgba(33,150,243,0.05)', top: -200, right: -100, border: '1px solid rgba(33,150,243,0.1)' }} />
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(240,192,90,0.05)', bottom: -100, left: -50, border: '1px solid rgba(240,192,90,0.1)' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '4px 16px', background: 'rgba(33,150,243,0.15)', border: '1px solid rgba(33,150,243,0.3)', borderRadius: 20, fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            🤝 Marketing Partner Program
          </div>
          <h1 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, lineHeight: 1.2, marginBottom: '1.5rem', color: C.text }}>
            紹介するたびに、<br />
            <span style={{ color: C.gold }}>毎月継続して報酬を受け取る</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: C.muted, lineHeight: 1.8, marginBottom: '2.5rem' }}>
            Tascal Dental のパートナーとして歯科医院を紹介するだけ。<br />
            その医院が契約を続ける限り、<strong style={{ color: C.text }}>売上の35%</strong>が毎月継続して振り込まれます。
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setView('register')} style={{ ...btnPrimary, width: 'auto', padding: '14px 36px', fontSize: 15 }}>
              パートナー登録を申請する →
            </button>
            <button onClick={() => setView('login')} style={{ padding: '14px 28px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              ログイン
            </button>
          </div>
        </div>
      </div>

      {/* Commission examples */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '5rem 2rem' }}>
        <h2 style={{ textAlign: 'center', fontFamily: "'Noto Serif JP', serif", fontSize: '1.8rem', marginBottom: '0.75rem' }}>報酬シミュレーション</h2>
        <p style={{ textAlign: 'center', color: C.muted, marginBottom: '3rem' }}>契約が続く限り毎月振り込まれる継続報酬型</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
          {[
            { clinics: 5,  plan: 'Standard', monthly: 9800, label: '小さなスタート' },
            { clinics: 10, plan: 'Standard', monthly: 9800, label: '副収入として' },
            { clinics: 30, plan: 'Standard', monthly: 9800, label: '本格的な収入' },
            { clinics: 50, plan: 'Growth',   monthly: 15800, label: 'ビジネスとして' },
          ].map((sim, i) => {
            const commission = Math.floor(sim.monthly * COMMISSION_RATE * sim.clinics);
            return (
              <div key={i} style={{ ...cardStyle, textAlign: 'center', borderTop: `3px solid ${C.accent}` }}>
                <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{sim.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.gold, marginBottom: 4 }}>
                  ¥{commission.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>月収（継続）</div>
                <div style={{ fontSize: 12, color: C.text }}>
                  {sim.plan} × {sim.clinics}院<br />
                  ¥{sim.monthly.toLocaleString()} × 35%
                </div>
              </div>
            );
          })}
        </div>

        {/* How it works */}
        <h2 style={{ textAlign: 'center', fontFamily: "'Noto Serif JP', serif", fontSize: '1.8rem', marginBottom: '3rem' }}>3ステップで始められる</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '4rem' }}>
          {[
            { step: '01', icon: '📝', title: 'パートナー登録', desc: '情報を入力して申請。審査後（通常1〜2営業日）に承認連絡が届きます。' },
            { step: '02', icon: '🔗', title: '専用リンクを共有', desc: 'あなた専用の紹介URLとQRコードが発行されます。歯科医院に渡すだけ。' },
            { step: '03', icon: '💰', title: '毎月報酬を受け取る', desc: '紹介した医院が契約する限り、毎月35%が振り込まれます。' },
          ].map((s, i) => (
            <div key={i} style={{ ...cardStyle, position: 'relative' }}>
              <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '3.5rem', color: `${C.accent}15`, fontWeight: 700, position: 'absolute', top: 12, right: 16 }}>{s.step}</div>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{s.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: '0.5rem' }}>{s.title}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => setView('register')} style={{ ...btnPrimary, width: 'auto', padding: '16px 48px', fontSize: 16 }}>
            今すぐパートナー登録する →
          </button>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════
  // REGISTER
  // ════════════════════════════════════════════════════════════════════
  if (view === 'register') return (
    <div style={{ ...pageStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <button onClick={() => setView('lp')} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, marginBottom: '1.5rem', fontFamily: 'inherit' }}>
          ← 戻る
        </button>

        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🤝</div>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1.5rem', marginBottom: '0.5rem' }}>パートナー登録申請</h2>
            <p style={{ fontSize: 13, color: C.muted }}>審査後1〜2営業日以内にご連絡します</p>
          </div>

          {regSuccess ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h3 style={{ color: C.green, marginBottom: '0.75rem' }}>申請を受け付けました</h3>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
                登録いただいたメールアドレスに確認メールをお送りしました。<br />
                審査完了後、紹介コードをお送りします。
              </p>
              <button onClick={() => setView('lp')} style={{ ...btnPrimary, marginTop: '1.5rem' }}>トップに戻る</button>
            </div>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>お名前 *</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="山田 太郎" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>メールアドレス *</label>
                  <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="example@email.com" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>電話番号 *</label>
                  <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="090-0000-0000" style={inputStyle} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>住所 *</label>
                  <input required value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                    placeholder="東京都渋谷区..." style={inputStyle} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>会社名・所属（任意）</label>
                  <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
                    placeholder="〇〇株式会社" style={inputStyle} />
                </div>

                <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${C.border}`, paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: '0.75rem' }}>💴 報酬振込先情報</div>
                </div>

                <div>
                  <label style={labelStyle}>銀行名</label>
                  <input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })}
                    placeholder="〇〇銀行" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>口座番号</label>
                  <input value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value })}
                    placeholder="普通 0000000" style={inputStyle} />
                </div>

              </div>

              {regError && <p style={{ color: C.red, fontSize: 12, marginTop: '0.75rem' }}>{regError}</p>}

              <button type="submit" disabled={loading} style={{ ...btnPrimary, marginTop: '1.5rem', opacity: loading ? 0.6 : 1 }}>
                {loading ? '送信中...' : '申請する →'}
              </button>

              <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: '1rem', lineHeight: 1.6 }}>
                申請後、審査結果をメールでお知らせします。<br />
                承認後に紹介コード・ログイン情報をお送りします。
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════
  // LOGIN
  // ════════════════════════════════════════════════════════════════════
  if (view === 'login') return (
    <div style={{ ...pageStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <button onClick={() => setView('lp')} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, marginBottom: '1.5rem', fontFamily: 'inherit' }}>
          ← 戻る
        </button>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔑</div>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1.4rem' }}>パートナーログイン</h2>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>メールアドレス</label>
              <input required type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                placeholder="登録メールアドレス" style={inputStyle} autoFocus />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>紹介コード</label>
              <input required value={loginCode} onChange={e => setLoginCode(e.target.value)}
                placeholder="TDC-XXXX-0000" style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.1em' }} />
            </div>
            {loginError && <p style={{ color: C.red, fontSize: 12, marginBottom: '0.75rem' }}>{loginError}</p>}
            <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'ログイン中...' : 'ログイン →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════
  // AUTHENTICATED VIEWS
  // ════════════════════════════════════════════════════════════════════
  const navItems: { key: View; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'ダッシュボード', icon: '📊' },
    { key: 'clinics',   label: '紹介医院',       icon: '🏥' },
    { key: 'earnings',  label: '報酬明細',        icon: '💰' },
    { key: 'tools',     label: '営業ツール',      icon: '🔗' },
  ];

  return (
    <div style={{ ...pageStyle, display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '0 2rem', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>🦷</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Tascal Dental</div>
            <div style={{ fontSize: 10, color: C.accent, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Partner Portal</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', gap: 4 }}>
          {navItems.map(n => (
            <button key={n.key} onClick={() => setView(n.key)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              background: view === n.key ? C.accent : 'transparent',
              color: view === n.key ? '#fff' : C.muted,
              transition: 'all 0.15s',
            }}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: C.muted }}>{partner?.name}</div>
          <div style={{
            padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700,
            background: partner?.status === 'active' ? `${C.green}20` : `${C.amber}20`,
            color: partner?.status === 'active' ? C.green : C.amber,
            border: `1px solid ${partner?.status === 'active' ? C.green : C.amber}40`,
          }}>
            {partner?.status === 'active' ? '認証済み' : '審査中'}
          </div>
          <button onClick={() => { setPartner(null); setView('lp'); }} style={{
            padding: '5px 12px', background: `${C.red}15`, border: `1px solid ${C.red}30`,
            borderRadius: 8, color: C.red, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ログアウト
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: '2rem', maxWidth: 1100, width: '100%', margin: '0 auto' }}>

        {/* ── DASHBOARD ── */}
        {view === 'dashboard' && (
          <div>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              おはようございます、{partner?.name}さん 👋
            </h2>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: '2rem' }}>
              紹介コード：<code style={{ color: C.gold, fontWeight: 700, letterSpacing: '0.1em' }}>{partner?.referral_code}</code>
            </p>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: '今月の報酬', value: `¥${monthlyCommission.toLocaleString()}`, icon: '💰', color: C.gold, sub: '契約中の医院から' },
                { label: '紹介医院数', value: `${clinics.length}院`, icon: '🏥', color: C.accent, sub: '累計' },
                { label: '契約中', value: `${activeClinics.length}院`, icon: '✅', color: C.green, sub: 'アクティブ' },
                { label: '累計報酬', value: `¥${totalCommission.toLocaleString()}`, icon: '📈', color: C.purple, sub: '全期間合計' },
              ].map((card, i) => (
                <div key={i} style={{ ...cardStyle, borderTop: `3px solid ${card.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{card.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{card.sub}</div>
                    </div>
                    <div style={{ fontSize: 24 }}>{card.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick tools */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={cardStyle}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem' }}>🔗 あなたの紹介リンク</div>
                <div style={{
                  background: C.bg, borderRadius: 8, padding: '12px 14px',
                  fontFamily: 'monospace', fontSize: 12, color: C.muted,
                  border: `1px solid ${C.border}`, wordBreak: 'break-all', marginBottom: '0.75rem',
                }}>
                  {referralURL}
                </div>
                <button onClick={copyURL} style={{
                  ...btnPrimary,
                  background: copied ? `linear-gradient(135deg, ${C.green}, #2e7d32)` : `linear-gradient(135deg, ${C.accent}, #1976D2)`,
                }}>
                  {copied ? '✓ コピーしました！' : 'URLをコピー'}
                </button>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem' }}>📋 最近の紹介医院</div>
                {clinics.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: C.muted, fontSize: 13 }}>
                    まだ紹介実績がありません
                  </div>
                ) : clinics.slice(0, 4).map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{c.clinic_name}</div>
                    <div style={{ color: C.gold, fontWeight: 700 }}>+¥{c.commission.toLocaleString()}/月</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CLINICS ── */}
        {view === 'clinics' && (
          <div>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1.5rem', marginBottom: '2rem' }}>🏥 紹介した医院一覧</h2>
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                    {['医院名', 'プラン', 'ステータス', '月額', '毎月の報酬', '紹介日'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clinics.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>まだ紹介実績がありません</td></tr>
                  ) : clinics.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : `${C.bg}80` }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.clinic_name}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: `${C.accent}20`, color: C.accent }}>{c.plan}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                          background: c.status === 'active' ? `${C.green}20` : `${C.amber}20`,
                          color: c.status === 'active' ? C.green : C.amber,
                        }}>{c.status === 'active' ? '契約中' : c.status === 'trial' ? 'トライアル' : '解約'}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: C.muted }}>¥{c.monthly_fee.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: C.gold }}>¥{c.commission.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', color: C.muted }}>{new Date(c.created_at).toLocaleDateString('ja-JP')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── EARNINGS ── */}
        {view === 'earnings' && (
          <div>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1.5rem', marginBottom: '2rem' }}>💰 報酬明細</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: '今月の報酬', value: `¥${monthlyCommission.toLocaleString()}`, color: C.gold },
                { label: '年間換算', value: `¥${(monthlyCommission * 12).toLocaleString()}`, color: C.accent },
                { label: '報酬率', value: '35%', color: C.green },
              ].map((item, i) => (
                <div key={i} style={{ ...cardStyle, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>{item.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem' }}>内訳</div>
              {activeClinics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: C.muted, fontSize: 13 }}>
                  現在契約中の医院がありません
                </div>
              ) : activeClinics.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.clinic_name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>¥{c.monthly_fee.toLocaleString()} × 35%</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.gold }}>+¥{c.commission.toLocaleString()}</div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0 0', borderTop: `2px solid ${C.border}`, marginTop: '0.5rem' }}>
                <div style={{ fontWeight: 700 }}>合計</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.gold }}>¥{monthlyCommission.toLocaleString()}/月</div>
              </div>
            </div>

            <div style={{ ...cardStyle, marginTop: '1.5rem', background: `linear-gradient(135deg, ${C.surface}, #1a237e20)` }}>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
                💴 <strong style={{ color: C.text }}>振込スケジュール</strong><br />
                毎月末日締め、翌月15日に登録口座に振り込みます。<br />
                口座情報の変更はサポートまでご連絡ください：<span style={{ color: C.accent }}>support@tascal.jp</span>
              </div>
            </div>
          </div>
        )}

        {/* ── TOOLS ── */}
        {view === 'tools' && (
          <div>
            <h2 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: '1.5rem', marginBottom: '2rem' }}>🔗 営業ツール</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

              {/* Referral URL */}
              <div style={cardStyle}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1rem' }}>🔗 専用紹介URL</div>
                <div style={{ background: C.bg, borderRadius: 8, padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: C.gold, border: `1px solid ${C.border}`, wordBreak: 'break-all', marginBottom: '0.75rem' }}>
                  {referralURL}
                </div>
                <button onClick={copyURL} style={{ ...btnPrimary, background: copied ? `linear-gradient(135deg, ${C.green}, #2e7d32)` : `linear-gradient(135deg, ${C.accent}, #1976D2)` }}>
                  {copied ? '✓ コピーしました！' : '📋 URLをコピー'}
                </button>
              </div>

              {/* QR code placeholder */}
              <div style={cardStyle}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1rem' }}>📱 QRコード</div>
                <div style={{ background: C.bg, border: `2px dashed ${C.border}`, borderRadius: 10, height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📱</div>
                  <div style={{ fontSize: 12, color: C.muted }}>QRコードを表示</div>
                </div>
                <button style={{ ...btnPrimary, background: C.surface2, color: C.text }}>
                  📥 QRコードをダウンロード
                </button>
              </div>

              {/* Pitch points */}
              <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1rem' }}>💬 説明トーク（歯科医院向け）</div>
                {[
                  { title: '月額¥9,800から', body: '歯科専用AIが患者さんに月2回、健康情報をLINEで自動配信。先生は何もしなくていい。' },
                  { title: '消費税ゼロ', body: 'マレーシア法人からの提供なので日本の消費税はかかりません。表示価格がそのままの支払額です。' },
                  { title: '30日間完全無料', body: 'カード登録不要で30日間お試し。効果を実感してから判断できます。' },
                  { title: 'ROI 470%以上', body: '月¥9,800の投資で、再来院促進により平均¥46,000/月の売上貢献が実証されています。' },
                ].map((pt, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, padding: '0.75rem 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${C.accent}20`, color: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>✓</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{pt.title}</div>
                      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{pt.body}</div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '1.5rem', color: C.muted, fontSize: 11, borderTop: `1px solid ${C.border}` }}>
        Tascal Dental Partner Portal — © 2026 Globish International Co., Ltd.
      </div>
    </div>
  );
}
