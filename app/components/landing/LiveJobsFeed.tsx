'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface LiveJob {
  id: string;
  title: string;
  location: string;
  urgency: string;
  pay?: number;
}

/**
 * Real open jobs from the database. When there are none, the section
 * renders nothing — a fake feed is worse than no feed (Hard Rule 1).
 */
export default function LiveJobsFeed() {
  const [jobs, setJobs] = useState<LiveJob[] | null>(null);

  useEffect(() => {
    fetch('/api/jobs?status=open&limit=4')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setJobs(d?.jobs ?? []))
      .catch(() => setJobs([]));
  }, []);

  if (!jobs || jobs.length === 0) return null;

  return (
    <section className="py-24 bg-navy text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[100px] pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-sm font-semibold tracking-wider uppercase text-green-400">Live now</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold font-heading text-white">Open Jobs Right Now</h2>
          </div>
          <Link href="/login" className="flex items-center gap-2 text-accent hover:text-white transition-colors font-medium">
            View All Jobs <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {jobs.map((job, idx) => (
            <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="backdrop-blur-[16px] bg-white/[0.06] border border-white/[0.12] rounded-2xl p-6 transition-all duration-300 group hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(0,200,255,0.12),0_0_0_1px_rgba(0,200,255,0.2)] relative overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-heading font-bold text-xl text-white group-hover:text-accent transition-colors">{job.title}</h3>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-gray-400 text-sm"><MapPin className="w-4 h-4 mr-2 text-gray-500" />{job.location}</div>
                <div className="flex items-center text-gray-400 text-sm"><Clock className="w-4 h-4 mr-2 text-gray-500" />
                  <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${job.urgency === 'immediate' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    {job.urgency === 'immediate' ? 'Urgent' : 'Scheduled'}
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="font-bold text-white group-hover:text-accent transition-colors">
                  {job.pay ? `UGX ${job.pay.toLocaleString()}` : 'Negotiable'}
                </span>
                <Link href={`/job/${job.id}`} className="text-primary font-medium text-sm hover:underline">Apply</Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
