'use client';

import { useState } from 'react';
import { Flag, CheckCircle, XCircle, AlertTriangle, MessageSquare } from 'lucide-react';

type DisputeStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';
type ReportStatus  = 'pending' | 'reviewed' | 'actioned';

const INITIAL_DISPUTES = [
  { id: 'd1', jobTitle: 'House Cleaning', workerName: 'Sarah Namuli', employerName: 'John Okello', issue: 'Worker did not show up at agreed time', date: '2024-01-15', status: 'open', type: 'no_show' },
  { id: 'd2', jobTitle: 'Plumbing Repair', workerName: 'Moses Byarugaba', employerName: 'Grace Atim', issue: 'Payment not received after completing work', date: '2024-01-14', status: 'reviewing', type: 'payment' },
  { id: 'd3', jobTitle: 'Garden Work', workerName: 'Peter Ssali', employerName: 'Martha Nambooze', issue: 'Work quality was below expectations', date: '2024-01-13', status: 'resolved', type: 'quality' },
];

const INITIAL_REPORTS = [
  { id: 'r1', reportedName: 'John Mugisha', reportedRole: 'Worker', reason: 'Aggressive behavior', reportedBy: 'Employer', date: '2024-01-15', status: 'pending' },
  { id: 'r2', reportedName: 'Alice Nansubuga', reportedRole: 'Employer', reason: 'Refused to pay for completed work', reportedBy: 'Worker', date: '2024-01-14', status: 'reviewed' },
];

export default function AdminModerationPage() {
  const [tab, setTab] = useState<'disputes' | 'reports'>('disputes');
  const [disputes, setDisputes] = useState(INITIAL_DISPUTES);
  const [reports, setReports]   = useState(INITIAL_REPORTS);

  const updateDispute = (id: string, status: DisputeStatus) =>
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, status } : d));

  const updateReport = (id: string, status: ReportStatus) =>
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));

  const typeColor: Record<string, string> = {
    no_show: 'bg-orange-100 text-orange-600',
    payment: 'bg-red-100 text-red-600',
    quality: 'bg-yellow-100 text-yellow-600',
  };

  const statusColor: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    reviewing: 'bg-orange-100 text-orange-600',
    resolved: 'bg-green-100 text-green-700',
    pending: 'bg-blue-100 text-blue-700',
    reviewed: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
          <Flag size={20} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[#0A0F2C]">Moderation</h1>
          <p className="text-slate-500 text-sm">Disputes and user reports</p>
        </div>
      </div>

      {/* Alert banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
        <AlertTriangle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-orange-800 text-sm">
            {disputes.filter(d => d.status === 'open').length} open disputes and {reports.filter(r => r.status === 'pending').length} pending reports require attention
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm mb-5 w-fit">
        {(['disputes', 'reports'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'disputes' && (
        <div className="space-y-3">
          {disputes.map(dispute => (
            <div key={dispute.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-900">{dispute.jobTitle}</h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Worker: {dispute.workerName} → Employer: {dispute.employerName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${typeColor[dispute.type] || 'bg-slate-100 text-slate-600'}`}>
                    {dispute.type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor[dispute.status]}`}>
                    {dispute.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-50 rounded-xl p-3 mb-4">
                <MessageSquare size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-700 text-sm">{dispute.issue}</p>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-xs">{new Date(dispute.date).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateDispute(dispute.id, 'resolved')}
                    disabled={dispute.status === 'resolved'}
                    className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-green-100 transition-colors disabled:opacity-40">
                    <CheckCircle size={14} /> {dispute.status === 'resolved' ? 'Resolved' : 'Resolve'}
                  </button>
                  <button
                    onClick={() => updateDispute(dispute.id, 'dismissed')}
                    disabled={dispute.status === 'resolved' || dispute.status === 'dismissed'}
                    className="text-sm font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-red-100 transition-colors disabled:opacity-40">
                    <XCircle size={14} /> Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Flag size={16} className="text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{report.reportedName}</p>
                    <p className="text-slate-500 text-xs">{report.reportedRole} · Reported by {report.reportedBy}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor[report.status]}`}>
                  {report.status.toUpperCase()}
                </span>
              </div>

              <p className="text-slate-700 text-sm bg-slate-50 rounded-xl p-3 mb-4">
                {report.reason}
              </p>

              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-xs">{new Date(report.date).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateReport(report.id, 'reviewed')}
                    className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors">
                    {report.status === 'reviewed' ? 'Reviewed' : 'Mark Reviewed'}
                  </button>
                  <button
                    onClick={() => updateReport(report.id, 'actioned')}
                    className="text-sm font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-red-100 transition-colors">
                    <XCircle size={14} /> Block User
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
