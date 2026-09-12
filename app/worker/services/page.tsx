'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Pencil, Trash2, Eye, EyeOff, Loader2, Tag, CheckCircle } from 'lucide-react';
import { useKola } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { JOB_CATEGORIES } from '@/lib/constants';
import { formatUgx } from '@/lib/pricing';
import { translateCategory } from '@/lib/i18n';
import { templatesFor } from '@/lib/service-suggestions';

interface MyService {
  id: string;
  title: string;
  category: string;
  unitLabel: string | null;
  priceUgx: number;
  description: string;
  active: boolean;
}

const UNIT_SUGGESTIONS = ['per room', 'per head', 'per day', 'per hour', 'per trip', 'per item', 'fixed price'];

const emptyForm = { title: '', category: '', unitLabel: '', priceUgx: '', description: '' };

/**
 * /worker/services — "My Services & Prices".
 *
 * The fundi's priced menu (Fiverr-style listings): what they do,
 * the unit ("per room", "per head"), and the price. Employers
 * browse these and book directly — no negotiation needed before
 * work starts. This is the worker half of the retention loop:
 * a listed price is an agreement waiting to happen.
 */
export default function WorkerServicesPage() {
  const { user } = useKola();
  const { t } = useI18n();
  const router = useRouter();

  const [services, setServices] = useState<MyService[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/services?workerId=${user.id}&limit=50`);
      const data = await res.json();
      setServices(res.ok ? data.services : []);
    } catch {
      setServices([]);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (s: MyService) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      category: s.category,
      unitLabel: s.unitLabel ?? '',
      priceUgx: String(s.priceUgx),
      description: s.description ?? '',
    });
    setError(null);
    setFormOpen(true);
  };

  const save = async () => {
    setError(null);
    const price = parseInt(form.priceUgx, 10);
    if (!form.title.trim()) { setError(t('svc.errTitle')); return; }
    if (!form.category) { setError(t('svc.errCategory')); return; }
    if (!Number.isInteger(price) || price <= 0) { setError(t('svc.errPrice')); return; }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        unitLabel: form.unitLabel.trim() || undefined,
        priceUgx: price,
        description: form.description.trim() || undefined,
      };
      const res = await fetch(editingId ? `/api/services/${editingId}` : '/api/services', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t('common.networkError'));
        return;
      }
      setFormOpen(false);
      await load();
    } catch {
      setError(t('common.networkError'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: MyService) => {
    setBusyId(s.id);
    try {
      await fetch(`/api/services/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !s.active }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (s: MyService) => {
    if (!window.confirm(t('svc.confirmDelete', { title: s.title }))) return;
    setBusyId(s.id);
    try {
      await fetch(`/api/services/${s.id}`, { method: 'DELETE' });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const fieldStyle = { border: '1.5px solid #E2E6F0' };

  return (
    <div className="min-h-screen bg-[#F7F9FF] pb-32">
      <header className="sticky top-0 z-40 h-14 px-4 flex items-center gap-3"
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(41,82,232,0.07)' }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-gray-100 transition-colors">
          <ChevronLeft size={22} color="#2952E8" strokeWidth={2.5} />
        </button>
        <span className="font-black text-base text-[#0A0F2C]">{t('svc.title')}</span>
      </header>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">

        {/* Why this matters */}
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
          <h2 className="text-white font-black text-base mb-1">{t('svc.heroTitle')}</h2>
          <p className="text-blue-100 text-xs leading-relaxed">{t('svc.heroSub')}</p>
        </div>

        {/* List */}
        {services === null ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
        ) : services.length === 0 && !formOpen ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
              <Tag size={24} color="#2952E8" />
            </div>
            <p className="text-slate-700 font-bold text-sm">{t('svc.emptyTitle')}</p>
            <p className="text-slate-400 text-xs mt-1 mb-4">{t('svc.emptySub')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map(s => (
              <div key={s.id} className={`bg-white rounded-2xl p-4 border shadow-sm ${s.active ? 'border-slate-100' : 'border-slate-200 opacity-60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-[#0A0F2C] text-sm">{s.title}</p>
                      {!s.active && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{t('svc.hidden')}</span>
                      )}
                    </div>
                    <p className="text-[#8B94B8] text-xs mt-0.5">{translateCategory(s.category, t)}</p>
                    {s.description && <p className="text-slate-500 text-xs mt-1 line-clamp-2">{s.description}</p>}
                    <p className="font-black text-[#2952E8] text-sm mt-1.5">
                      {formatUgx(s.priceUgx)}{s.unitLabel ? <span className="text-[#8B94B8] font-semibold text-xs"> · {s.unitLabel}</span> : null}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(s)} disabled={busyId === s.id}
                      className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center active:scale-95 transition-transform" aria-label={t('svc.edit')}>
                      <Pencil size={15} color="#2952E8" />
                    </button>
                    <button onClick={() => toggleActive(s)} disabled={busyId === s.id}
                      className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center active:scale-95 transition-transform"
                      aria-label={s.active ? t('svc.hide') : t('svc.show')}>
                      {s.active ? <EyeOff size={15} color="#64748B" /> : <Eye size={15} color="#2952E8" />}
                    </button>
                    <button onClick={() => remove(s)} disabled={busyId === s.id}
                      className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center active:scale-95 transition-transform" aria-label={t('common.cancel')}>
                      <Trash2 size={15} color="#DC2626" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / edit form */}
        {formOpen && (
          <div className="bg-white rounded-2xl p-4 space-y-4" style={{ border: '1px solid #E8EDF8', boxShadow: '0 2px 16px rgba(41,82,232,0.06)' }}>
            <h3 className="font-black text-[#0A0F2C] text-base">{editingId ? t('svc.editService') : t('svc.addService')}</h3>

            <div>
              <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">{t('svc.fieldTitle')} *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder={t('svc.fieldTitlePh')} maxLength={80}
                className="w-full rounded-xl px-4 py-3 text-sm text-[#0A0F2C] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                style={fieldStyle} />
            </div>

            <div>
              <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">{t('svc.fieldCategory')} *</label>
              <div className="flex flex-wrap gap-2">
                {JOB_CATEGORIES.map(c => (
                  <button key={c} onClick={() => setForm({ ...form, category: c })}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    style={{
                      background: form.category === c ? '#2952E8' : '#fff',
                      color: form.category === c ? '#fff' : '#4A5580',
                      borderColor: form.category === c ? '#2952E8' : '#E2E6F0',
                    }}>
                    {translateCategory(c, t)}
                  </button>
                ))}
              </div>
            </div>

            {/* One-tap templates: what fundis in this category actually
                sell (grounded in Jiji.ug listings). Tap = title + unit
                pre-filled; the worker only sets their price. */}
            {form.category && (
              <div>
                <p className="text-[#8B94B8] text-xs font-semibold mb-1.5">{t('svc.templatesHint')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {templatesFor(form.category).map(tp => (
                    <button key={tp.title}
                      onClick={() => setForm({ ...form, title: tp.title, unitLabel: tp.unit })}
                      className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 active:scale-95 transition-transform">
                      {tp.title} · {tp.unit}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">{t('svc.fieldPrice')} *</label>
                <input type="number" inputMode="numeric" value={form.priceUgx}
                  onChange={e => setForm({ ...form, priceUgx: e.target.value })}
                  placeholder="20000"
                  className="w-full rounded-xl px-4 py-3 text-sm text-[#0A0F2C] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={fieldStyle} />
              </div>
              <div>
                <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">{t('svc.fieldUnit')}</label>
                <input value={form.unitLabel} onChange={e => setForm({ ...form, unitLabel: e.target.value })}
                  placeholder={t('svc.fieldUnitPh')} maxLength={30}
                  className="w-full rounded-xl px-4 py-3 text-sm text-[#0A0F2C] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={fieldStyle} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 -mt-2">
              {UNIT_SUGGESTIONS.map(u => (
                <button key={u} onClick={() => setForm({ ...form, unitLabel: u })}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-500 border border-slate-200 active:scale-95 transition-transform">
                  {u}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[#0A0F2C] font-semibold text-sm mb-1.5 block">{t('svc.fieldDesc')}</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3} placeholder={t('svc.fieldDescPh')}
                className="w-full rounded-xl px-4 py-3 text-sm text-[#0A0F2C] placeholder-gray-400 focus:outline-none resize-none focus:ring-2 focus:ring-blue-500/30"
                style={fieldStyle} />
            </div>

            {error && <p className="text-red-600 text-xs font-semibold">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setFormOpen(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-500 active:scale-95 transition-transform">
                {t('common.cancel')}
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-black text-white active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)' }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {editingId ? t('common.save') : t('svc.publish')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom add button */}
      {!formOpen && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 py-4"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(41,82,232,0.08)' }}>
          <button onClick={openAdd}
            className="w-full py-4 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg,#2952E8,#1A2DB8)', boxShadow: '0 6px 20px rgba(41,82,232,0.35)' }}>
            <Plus size={18} /> {t('svc.addService')}
          </button>
        </div>
      )}
    </div>
  );
}
