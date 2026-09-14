'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Briefcase, Wrench, Users } from 'lucide-react';

interface SignupDay { date: string; workers: number; employers: number }
interface JobDay { date: string; open: number; in_progress: number; completed: number; cancelled: number }
interface CategoryCount { category: string; count: number }

interface ChartData {
  signupsByDay: SignupDay[];
  jobsByDay: JobDay[];
  jobsByCategory: CategoryCount[];
  sexDistribution: { male: number; female: number; notShared: number };
}

const shortDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-UG', { month: 'short', day: 'numeric' });

const JOB_STATUS_COLORS: { key: keyof Omit<JobDay, 'date'>; label: string; color: string }[] = [
  { key: 'completed',  label: 'Completed',   color: '#16A34A' },
  { key: 'in_progress',label: 'In progress', color: '#F97316' },
  { key: 'open',       label: 'Open',        color: '#2952E8' },
  { key: 'cancelled',  label: 'Cancelled',   color: '#94A3B8' },
];

function ChartCard({ title, sub, Icon, children }: {
  title: string; sub: string; Icon: any; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
          <Icon size={15} className="text-blue-600" />
        </div>
        <h3 className="font-black text-slate-900">{title}</h3>
      </div>
      <p className="text-slate-400 text-xs mb-4">{sub}</p>
      {children}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
      {items.map(i => (
        <span key={i.label} className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Grouped bars: workers vs employers who joined each day */
function SignupsChart({ data }: { data: SignupDay[] }) {
  const W = 560, H = 170, PAD_B = 22, PAD_T = 8;
  const max = Math.max(...data.map(d => d.workers + d.employers), 1);
  const groupW = W / data.length;
  const barW = Math.max((groupW - 6) / 2, 2);
  const scale = (v: number) => (v / max) * (H - PAD_B - PAD_T);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={0} x2={W} y1={H - PAD_B - f * (H - PAD_B - PAD_T)} y2={H - PAD_B - f * (H - PAD_B - PAD_T)}
            stroke="#F1F5F9" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const x = i * groupW + 3;
          return (
            <g key={d.date}>
              <rect x={x} y={H - PAD_B - scale(d.workers)} width={barW} height={Math.max(scale(d.workers), d.workers ? 2 : 0)}
                rx={1.5} fill="#2952E8">
                <title>{`${shortDate(d.date)}: ${d.workers} worker${d.workers === 1 ? '' : 's'} joined`}</title>
              </rect>
              <rect x={x + barW + 1.5} y={H - PAD_B - scale(d.employers)} width={barW} height={Math.max(scale(d.employers), d.employers ? 2 : 0)}
                rx={1.5} fill="#9333EA">
                <title>{`${shortDate(d.date)}: ${d.employers} employer${d.employers === 1 ? '' : 's'} joined`}</title>
              </rect>
              {(i % 5 === 0 || i === data.length - 1) && (
                <text x={i * groupW + groupW / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="#94A3B8">
                  {shortDate(d.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <Legend items={[
        { label: 'Workers', color: '#2952E8' },
        { label: 'Employers', color: '#9333EA' },
      ]} />
    </div>
  );
}

/** Stacked bars: jobs posted each day, coloured by where they ended up */
function JobsStatusChart({ data }: { data: JobDay[] }) {
  const W = 560, H = 170, PAD_B = 22, PAD_T = 8;
  const totals = data.map(d => d.open + d.in_progress + d.completed + d.cancelled);
  const max = Math.max(...totals, 1);
  const groupW = W / data.length;
  const barW = Math.max(groupW - 5, 3);
  const scale = (v: number) => (v / max) * (H - PAD_B - PAD_T);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={0} x2={W} y1={H - PAD_B - f * (H - PAD_B - PAD_T)} y2={H - PAD_B - f * (H - PAD_B - PAD_T)}
            stroke="#F1F5F9" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const x = i * groupW + 2.5;
          let y = H - PAD_B;
          return (
            <g key={d.date}>
              {JOB_STATUS_COLORS.map(s => {
                const h = scale(d[s.key]);
                y -= h;
                return h > 0 ? (
                  <rect key={s.key} x={x} y={y} width={barW} height={Math.max(h, 1.5)} fill={s.color}>
                    <title>{`${shortDate(d.date)}: ${d[s.key]} ${s.label.toLowerCase()}`}</title>
                  </rect>
                ) : null;
              })}
              {(i % 5 === 0 || i === data.length - 1) && (
                <text x={i * groupW + groupW / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="#94A3B8">
                  {shortDate(d.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <Legend items={JOB_STATUS_COLORS.map(s => ({ label: s.label, color: s.color }))} />
    </div>
  );
}

/** Horizontal bars: how many jobs asked for each trade */
function CategoryChart({ data }: { data: CategoryCount[] }) {
  const top = data.slice(0, 8);
  const max = Math.max(...top.map(c => c.count), 1);
  if (top.length === 0) {
    return <p className="text-slate-400 text-sm py-6 text-center">No jobs posted yet — trades will appear here.</p>;
  }
  return (
    <svg viewBox={`0 0 560 ${top.length * 30 + 6}`} className="w-full">
      {top.map((c, i) => {
        const y = i * 30;
        const w = Math.max((c.count / max) * 360, 4);
        return (
          <g key={c.category}>
            <text x={0} y={y + 15} fontSize={11} fill="#334155" fontWeight={600}>
              {c.category.length > 22 ? c.category.slice(0, 21) + '…' : c.category}
            </text>
            <rect x={170} y={y + 4} width={w} height={14} rx={4} fill="#2952E8">
              <title>{`${c.category}: ${c.count} job${c.count === 1 ? '' : 's'}`}</title>
            </rect>
            <text x={170 + w + 8} y={y + 15} fontSize={11} fill="#0A0F2C" fontWeight={700}>{c.count}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Donut: who our users are, by sex */
function SexChart({ data }: { data: ChartData['sexDistribution'] }) {
  const total = data.male + data.female + data.notShared;
  if (total === 0) {
    return <p className="text-slate-400 text-sm py-6 text-center">No users yet.</p>;
  }
  const slices = [
    { label: 'Male', value: data.male, color: '#2952E8' },
    { label: 'Female', value: data.female, color: '#EC4899' },
    { label: 'Not shared yet', value: data.notShared, color: '#CBD5E1' },
  ].filter(s => s.value > 0);

  const CX = 80, CY = 80, R = 62, IR = 38;
  let angle = -Math.PI / 2;
  const paths = slices.map(s => {
    const frac = s.value / total;
    const a0 = angle;
    const a1 = angle + frac * Math.PI * 2;
    angle = a1;
    const large = frac > 0.5 ? 1 : 0;
    const p = (r: number, a: number) => `${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`;
    // A full circle can't be drawn as one arc — nudge the end angle back a hair
    const end = frac >= 0.999 ? a1 - 0.0001 : a1;
    const d = [
      `M ${p(R, a0)}`,
      `A ${R},${R} 0 ${large} 1 ${p(R, end)}`,
      `L ${p(IR, end)}`,
      `A ${IR},${IR} 0 ${large} 0 ${p(IR, a0)}`,
      'Z',
    ].join(' ');
    return { ...s, d };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg viewBox="0 0 160 160" className="w-36 h-36 flex-shrink-0">
        {paths.map(p => (
          <path key={p.label} d={p.d} fill={p.color}>
            <title>{`${p.label}: ${p.value} (${Math.round((p.value / total) * 100)}%)`}</title>
          </path>
        ))}
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize={22} fontWeight={800} fill="#0A0F2C">{total}</text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize={9} fill="#94A3B8">users</text>
      </svg>
      <div className="space-y-2">
        {slices.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ background: s.color }} />
            <span className="text-slate-600 font-semibold">{s.label}</span>
            <span className="text-slate-900 font-bold">{s.value}</span>
            <span className="text-slate-400 text-xs">({Math.round((s.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GrowthCharts() {
  const [data, setData] = useState<ChartData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch('/api/admin/charts')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null;
  if (!data) {
    return (
      <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400 text-sm">
        Loading graphs…
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="font-black text-[#0A0F2C] text-lg mb-1">Growth Graphs</h2>
      <p className="text-slate-400 text-xs mb-4">Live counts from the database — hover any bar or slice for the exact number.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="New sign-ups, last 30 days" sub="How many people joined each day — workers vs customers" Icon={UserPlus}>
          <SignupsChart data={data.signupsByDay} />
        </ChartCard>
        <ChartCard title="Jobs posted, last 30 days" sub="Jobs posted each day, coloured by where they ended up" Icon={Briefcase}>
          <JobsStatusChart data={data.jobsByDay} />
        </ChartCard>
        <ChartCard title="Most requested trades" sub="All jobs ever posted, grouped by the kind of work" Icon={Wrench}>
          <CategoryChart data={data.jobsByCategory} />
        </ChartCard>
        <ChartCard title="Who our users are" sub="All registered users by sex — 'not shared' means they skipped that question at sign-up" Icon={Users}>
          <SexChart data={data.sexDistribution} />
        </ChartCard>
      </div>
    </div>
  );
}
