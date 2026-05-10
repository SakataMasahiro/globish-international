'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase client ────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ───────────────────────────────────────────────────────────
interface Clinic {
  id: string;
  clinic_name: string;
  email: string;
  plan: string;
  status: string;
  trial_ends_at: string;
  created_at: string;
  stripe_customer_id?: string;
  line_channel_id?: string;
  patient_count?: number;
}

// ─── Password gate ───────────────────────────────────────────────────
const SUPER_ADMIN_PASSWORD = process.env.NEXT_PUBLIC_SUPER_ADMIN_PASSWORD || 'tascal-sakata-2026';

export default function SuperAdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'clinics' | 'revenue' | 'delivery'>('overview');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [now] = useState(new Date());

  // ── Auth ────────────────────────────────────────────────────────────
  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pw === SUPER_ADMIN_PASSWORD) {
      setAuthed(true);
      loadData();
    } else {
      setPwError(true);
      setTimeout(() => setPwError(false), 2000);
    }
  }

  // ── Data ─────────────────────────────────────────────────────────────
  async function loadData() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setClinics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // ── Derived stats ─────────────────────────────────────────────────────
  const total      = clinics.length;
  const trials     = clinics.filter(c => c.status === 'trial').length;
  const active     = clinics.filter(c => c.status === 'active').length;
  const cancelled  = clinics.filter(c => c.status === 'cancelled').length;

  const planPrice: Record<string, number> = {
    starter: 5900, basic: 9800, standard: 9800, growth: 15800, premium: 29800
  };
  const mrr = clinics
    .filter(c => c.status === 'active')
    .reduce((s, c) => s + (planPrice[c.plan?.toLowerCase()] ?? 9800), 0);

  const filtered = clinics
    .filter(c => filterStatus === 'all' || c.status === filterStatus)
    .filter(c =>
      !search ||
      c.clinic_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    );

  // ── Plan badge ────────────────────────────────────────────────────────
  function PlanBadge({ plan }: { plan: string }) {
    const map: Record<string, { label: string; color: string }> = {
      starter:  { label: 'Starter',  color: '#64748b' },
      basic:    { label: 'Basic',    color: '#0891b2' },
      standard: { label: 'Standard', color: '#059669' },
      growth:   { label: 'Growth',   color: '#7c3aed' },
      premium:  { label: 'Premium',  color: '#dc2626' },
    };
    const p = map[plan?.toLowerCase()] ?? { label: plan ?? '−', color: '#94a3b8' };
    return (
      <span style={{
        display: 'inline-block', padding: '2px 10px', borderRadius: 20,
        fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
        background: p.color + '18', color: p.color, border: `1px solid ${p.color}40`
      }}>{p.label}</span>
    );
  }

  // ── Status badge ──────────────────────────────────────────────────────
  function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; color: string; dot: string }> = {
      trial:     { label: 'トライアル', color: '#f59e0b', dot: '#f59e0b' },
      active:    { label: '契約中',    color: '#10b981', dot: '#10b981' },
      cancelled: { label: '解約',     color: '#ef4444', dot: '#ef4444' },
      pending:   { label: '未設定',   color: '#94a3b8', dot: '#94a3b8' },
    };
    const s = map[status?.toLowerCase()] ?? { label: status ?? '−', color: '#94a3b8', dot: '#94a3b8' };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
        background: s.color + '15', color: s.color, border: `1px solid ${s.color}35` }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
        {s.label}
      </span>
    );
  }

  // ── Days remaining ────────────────────────────────────────────────────
  function daysLeft(dateStr: string) {
    if (!dateStr) return '−';
    const diff = Math.ceil((new Date(dateStr).getTime() - now.getTime()) / 86400000);
    if (diff < 0) return <span style={{ color: '#ef4444' }}>期限切れ</span>;
    return <span style={{ color: diff <= 3 ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>残{diff}日</span>;
  }

  // ── Format date ───────────────────────────────────────────────────────
  function fmtDate(d: string) {
    if (!d) return '−';
    return new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  // ════════════════════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ════════════════════════════════════════════════════════════════════
  if (!authed) return (
    <div style={{
      minHeight: '100vh', background: '#0f172a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Noto Sans JP', sans-serif",
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid #334155',
        borderRadius: 16, padding: '3rem', width: 380,
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #0891b2, #0e7490)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, marginBottom: 12,
          }}>🦷</div>
          <div style={{ color: '#94a3b8', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
            Tascal Dental
          </div>
          <div style={{ color: '#f8fafc', fontSize: 20, fontWeight: 700 }}>
            Super Admin
          </div>
          <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>
            坂田さん専用管理画面
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              パスワード
            </label>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="••••••••••••"
              autoFocus
              style={{
                width: '100%', padding: '12px 16px', background: '#0f172a',
                border: `1px solid ${pwError ? '#ef4444' : '#334155'}`,
                borderRadius: 8, color: '#f8fafc', fontSize: 15,
                outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
            />
            {pwError && (
              <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>
                パスワードが違います
              </p>
            )}
          </div>
          <button type="submit" style={{
            width: '100%', padding: '13px', background: 'linear-gradient(135deg, #0891b2, #0e7490)',
            border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.05em',
            transition: 'opacity 0.2s',
          }}>
            ログイン →
          </button>
        </form>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════
  // MAIN DASHBOARD
  // ════════════════════════════════════════════════════════════════════
  const C = {
    bg:       '#0f172a',
    surface:  '#1e293b',
    border:   '#334155',
    text:     '#f8fafc',
    muted:    '#94a3b8',
    accent:   '#0891b2',
    accentLt: '#0e7490',
    green:    '#10b981',
    amber:    '#f59e0b',
    red:      '#ef4444',
    purple:   '#7c3aed',
  };

  const statCards = [
    { label: '総申し込み数', value: total, icon: '🏥', color: C.accent, sub: '全プラン合計' },
    { label: 'トライアル中', value: trials, icon: '⏳', color: C.amber, sub: '30日間無料' },
    { label: '契約中', value: active, icon: '✅', color: C.green, sub: 'アクティブ' },
    { label: '月次MRR', value: `¥${mrr.toLocaleString()}`, icon: '💰', color: C.purple, sub: '契約院合計' },
  ];

  const tabs = [
    { key: 'overview', label: '概要', icon: '📊' },
    { key: 'clinics',  label: '医院一覧', icon: '🏥' },
    { key: 'revenue',  label: '売上', icon: '💰' },
    { key: 'delivery', label: '配信状況', icon: '📨' },
  ] as const;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Noto Sans JP', sans-serif", color: C.text }}>

      {/* ── TOP BAR ── */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '0 2rem', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🦷</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Tascal Dental</div>
            <div style={{ fontSize: 10, color: C.accent, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Super Admin — 坂田さん専用
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: C.muted }}>
            {now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </div>
          <button
            onClick={() => loadData()}
            style={{
              padding: '6px 14px', background: C.accent + '20', border: `1px solid ${C.accent}40`,
              borderRadius: 8, color: C.accent, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.05em',
            }}>
            🔄 更新
          </button>
          <button
            onClick={() => setAuthed(false)}
            style={{
              padding: '6px 14px', background: C.red + '15', border: `1px solid ${C.red}30`,
              borderRadius: 8, color: C.red, fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
            }}>
            ログアウト
          </button>
        </div>
      </div>

      <div style={{ padding: '2rem' }}>

        {/* ── STAT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {statCards.map((card, i) => (
            <div key={i} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: '1.5rem',
              borderTop: `3px solid ${card.color}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: card.color, lineHeight: 1 }}>
                    {loading ? '...' : card.value}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{card.sub}</div>
                </div>
                <div style={{ fontSize: 28, opacity: 0.7 }}>{card.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', background: C.surface, padding: 4, borderRadius: 10, width: 'fit-content' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, letterSpacing: '0.03em',
              background: activeTab === tab.key ? C.accent : 'transparent',
              color: activeTab === tab.key ? '#fff' : C.muted,
              transition: 'all 0.2s',
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ══════ OVERVIEW TAB ══════ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

            {/* Plan distribution */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '1.5rem' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem', color: C.text }}>
                📊 プラン別分布
              </div>
              {Object.entries(planPrice).map(([plan, price]) => {
                const count = clinics.filter(c => c.plan?.toLowerCase() === plan).length;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={plan} style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: C.muted, textTransform: 'capitalize' }}>{plan}</span>
                      <span style={{ color: C.text, fontWeight: 700 }}>{count}院 ({pct}%)</span>
                    </div>
                    <div style={{ height: 6, background: C.bg, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: C.accent, borderRadius: 3, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent signups */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '1.5rem' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem', color: C.text }}>
                🆕 最近の申し込み
              </div>
              {loading ? (
                <div style={{ color: C.muted, fontSize: 13 }}>読み込み中...</div>
              ) : clinics.slice(0, 5).map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.6rem 0', borderBottom: `1px solid ${C.border}`,
                  fontSize: 13,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: C.text }}>{c.clinic_name || '未設定'}</div>
                    <div style={{ color: C.muted, fontSize: 11 }}>{fmtDate(c.created_at)}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
              {!loading && clinics.length === 0 && (
                <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '2rem 0' }}>
                  まだ申し込みはありません
                </div>
              )}
            </div>

            {/* MRR breakdown */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '1.5rem', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem', color: C.text }}>
                💰 売上サマリー
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {[
                  { label: '月次MRR', value: `¥${mrr.toLocaleString()}`, color: C.green },
                  { label: '年間ARR（想定）', value: `¥${(mrr * 12).toLocaleString()}`, color: C.accent },
                  { label: '契約院数', value: `${active}院`, color: C.purple },
                  { label: '平均単価', value: active > 0 ? `¥${Math.round(mrr / active).toLocaleString()}` : '−', color: C.amber },
                ].map((item, i) => (
                  <div key={i} style={{ background: C.bg, borderRadius: 10, padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{item.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════ CLINICS TAB ══════ */}
        {activeTab === 'clinics' && (
          <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 医院名・メールで検索..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, minWidth: 200, padding: '9px 14px',
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 8, color: C.text, fontSize: 13, outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              {['all', 'trial', 'active', 'cancelled'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} style={{
                  padding: '9px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: filterStatus === s ? C.accent : C.surface,
                  color: filterStatus === s ? '#fff' : C.muted,
                  transition: 'all 0.15s',
                }}>
                  {{ all: '全て', trial: 'トライアル', active: '契約中', cancelled: '解約' }[s]}
                  {' '}({clinics.filter(c => s === 'all' || c.status === s).length})
                </button>
              ))}
            </div>

            {/* Table */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                    {['医院名', 'メール', 'プラン', 'ステータス', 'トライアル残日数', '申込日', 'LINE'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>読み込み中...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>データがありません</td></tr>
                  ) : filtered.map((c, i) => (
                    <tr key={c.id} style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: i % 2 === 0 ? 'transparent' : C.bg + '80',
                    }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: C.text }}>{c.clinic_name || '未設定'}</td>
                      <td style={{ padding: '12px 16px', color: C.muted }}>{c.email}</td>
                      <td style={{ padding: '12px 16px' }}><PlanBadge plan={c.plan} /></td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={c.status} /></td>
                      <td style={{ padding: '12px 16px' }}>{c.status === 'trial' ? daysLeft(c.trial_ends_at) : '−'}</td>
                      <td style={{ padding: '12px 16px', color: C.muted }}>{fmtDate(c.created_at)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 6,
                          background: c.line_channel_id ? C.green + '20' : C.red + '15',
                          color: c.line_channel_id ? C.green : C.red,
                          border: `1px solid ${c.line_channel_id ? C.green : C.red}30`,
                          fontWeight: 600,
                        }}>
                          {c.line_channel_id ? '連携済' : '未連携'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: 12, color: C.muted, textAlign: 'right' }}>
              {filtered.length}件 表示中（全{total}件）
            </div>
          </div>
        )}

        {/* ══════ REVENUE TAB ══════ */}
        {activeTab === 'revenue' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '1.5rem', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.5rem' }}>💴 プラン別売上内訳</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {Object.entries(planPrice).map(([plan, price]) => {
                  const count = clinics.filter(c => c.plan?.toLowerCase() === plan && c.status === 'active').length;
                  const revenue = count * price;
                  return (
                    <div key={plan} style={{ background: C.bg, borderRadius: 10, padding: '1.25rem' }}>
                      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{plan}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>¥{price.toLocaleString()}/月 × {count}院</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: revenue > 0 ? C.green : C.muted }}>
                        ¥{revenue.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '1.5rem' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem' }}>📈 収益サマリー</div>
              {[
                { label: '月次MRR', value: `¥${mrr.toLocaleString()}`, color: C.green },
                { label: '四半期売上（想定）', value: `¥${(mrr * 3).toLocaleString()}`, color: C.accent },
                { label: '年間ARR（想定）', value: `¥${(mrr * 12).toLocaleString()}`, color: C.purple },
                { label: '契約中の院数', value: `${active}院`, color: C.amber },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.muted, fontSize: 13 }}>{item.label}</span>
                  <span style={{ color: item.color, fontWeight: 700, fontSize: 15 }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '1.5rem' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem' }}>⚠️ 要注意</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {clinics.filter(c => c.status === 'trial' && c.trial_ends_at && Math.ceil((new Date(c.trial_ends_at).getTime() - now.getTime()) / 86400000) <= 3).map(c => (
                  <div key={c.id} style={{ background: C.amber + '12', border: `1px solid ${C.amber}30`, borderRadius: 8, padding: '0.75rem 1rem', fontSize: 12 }}>
                    <div style={{ color: C.amber, fontWeight: 700 }}>⏳ トライアル期限間近</div>
                    <div style={{ color: C.text, marginTop: 2 }}>{c.clinic_name} — {daysLeft(c.trial_ends_at)}</div>
                  </div>
                ))}
                {clinics.filter(c => c.status === 'cancelled').slice(0, 3).map(c => (
                  <div key={c.id} style={{ background: C.red + '12', border: `1px solid ${C.red}30`, borderRadius: 8, padding: '0.75rem 1rem', fontSize: 12 }}>
                    <div style={{ color: C.red, fontWeight: 700 }}>❌ 解約</div>
                    <div style={{ color: C.text, marginTop: 2 }}>{c.clinic_name}</div>
                  </div>
                ))}
                {clinics.filter(c => c.status === 'trial' && Math.ceil((new Date(c.trial_ends_at).getTime() - now.getTime()) / 86400000) > 3).length === 0 &&
                 clinics.filter(c => c.status === 'cancelled').length === 0 && (
                  <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '1rem 0' }}>✅ 要注意案件なし</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════ DELIVERY TAB ══════ */}
        {activeTab === 'delivery' && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '1.5rem' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem' }}>📨 Smile Capsule 配信状況</div>
            <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '3rem 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
              <div>配信データはLINE Messaging APIから取得されます。</div>
              <div style={{ marginTop: 8 }}>医院のLINE連携が完了すると、ここに開封率・配信数が表示されます。</div>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '2rem', color: C.muted, fontSize: 11, borderTop: `1px solid ${C.border}` }}>
        Tascal Dental Super Admin — 坂田昌鴻 専用 — © 2026 Globish International Co., Ltd.
      </div>
    </div>
  );
}
