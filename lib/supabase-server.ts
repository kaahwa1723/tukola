import { createClient } from '@supabase/supabase-js';
import type { Job, User, Conversation, Message } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Server-side admin client — bypasses Row Level Security.
 * Uses SUPABASE_SERVICE_ROLE_KEY if set (recommended for production),
 * falls back to the anon key for local development.
 *
 * ⚠️  Add SUPABASE_SERVICE_ROLE_KEY to .env.local (never prefix with NEXT_PUBLIC_)
 */
export function createServerSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Type mappers ────────────────────────────────────────────────────────────

export function mapJob(r: any): Job {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    location: r.location,
    dateTime: r.date_time,
    workersNeeded: r.workers_needed ?? 1,
    pay: r.pay ?? undefined,
    urgency: r.urgency ?? 'scheduled',
    status: r.status ?? 'open',
    employerId: r.employer_id,
    employerName: r.employer_name,
    employerPhone: r.employer_phone ?? undefined,
    skills: r.skills ?? [],
    category: r.category ?? undefined,
    images: r.images ?? [],
    estimatedHours: r.estimated_hours ?? undefined,
    pricingType: r.pricing_type ?? 'standard',
    distanceKm: r.distance_km ?? undefined,
    createdAt: r.created_at,
    completedAt: r.completed_at ?? undefined,
    applicants: (r.applications ?? []).map((a: any) => ({
      workerId: a.worker_id,
      workerName: a.worker_name,
      workerAvatar: a.worker_avatar ?? undefined,
      rating: a.rating != null ? Number(a.rating) : 0,
      completedJobs: a.completed_jobs ?? 0,
      skills: a.skills ?? [],
      appliedAt: a.applied_at,
      status: a.status ?? 'pending',
    })),
  };
}

export function mapUser(r: any): User {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    role: r.role,
    location: r.location ?? undefined,
    avatar: r.avatar ?? undefined,
    // Honest trust fields: NULL stays NULL until the system measures them
    rating: r.rating != null ? Number(r.rating) : undefined,
    completedJobs: r.completed_jobs ?? 0,
    // System-computed trust field: NULL (no history) stays undefined
    reliabilityScore: r.reliability_score != null ? Number(r.reliability_score) : undefined,
    skills: r.skills ?? [],
    about: r.about ?? '',
    responseTime: r.response_time ?? undefined,
    lastActive: r.last_active ?? undefined,
    isVerified: r.is_verified ?? false,
    blocked: r.blocked ?? false,
    company: r.company ?? undefined,
    portfolioImages: r.portfolio_images ?? [],
    momoPayoutPhone: r.momo_payout_phone ?? undefined,
  };
}

export function mapConversation(r: any, currentUserId: string): Conversation {
  const isUser1 = r.user1_id === currentUserId;
  const msgs: any[] = Array.isArray(r.messages) ? r.messages : [];
  // Per-user unread: count messages addressed to the requester that are unread.
  // (unread_count is a single shared counter — using it directly shows the
  // sender's own messages as unread on their badge.)
  const unread = msgs.length
    ? msgs.filter(m => m.to_id === currentUserId && !m.read).length
    : (r.unread_count ?? 0);
  return {
    id: r.id,
    otherUserId: isUser1 ? r.user2_id : r.user1_id,
    // Counterparty name from the perspective of the requesting user,
    // falling back to the legacy other_user_name column
    otherUserName: (isUser1 ? r.user2_name : r.user1_name) ?? r.other_user_name,
    otherUserAvatar: r.other_user_avatar ?? undefined,
    lastMessage: r.last_message ?? '',
    lastMessageTime: r.last_message_time
      ? new Date(r.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '',
    unread,
    jobTitle: r.job_title ?? undefined,
    jobId: r.job_id ?? undefined,
    messages: msgs.map(mapMessage),
  };
}

export function mapMessage(m: any): Message {
  return {
    id: m.id,
    fromId: m.from_id,
    toId: m.to_id,
    fromName: m.from_name,
    text: m.text,
    timestamp: m.timestamp,
    read: m.read ?? false,
  };
}
