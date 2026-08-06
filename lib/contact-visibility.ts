import { isAdmin } from './admin-auth';
import type { User } from './types';

/**
 * Contact visibility — Hard Rule 3 enforcement.
 *
 * The employer's phone number is the marketplace's biggest leakage vector:
 * a worker who can call the employer before paying can take the whole job
 * off-platform. So the number is only revealed when leaving is pointless —
 * the money is already captured in escrow ('held' / 'disputed' / 'released').
 *
 * Always visible to: the employer themselves, and admins.
 * Never visible to: anonymous visitors, workers before payment.
 */

/** Payment statuses where the customer's money has been captured. */
const CAPTURED_STATUSES = ['held', 'disputed', 'released'];

/**
 * May this viewer see the employer's phone for this job row?
 * Admins and the employer always may; workers only once a payment
 * for the job has been captured in escrow.
 */
export async function canSeeEmployerPhone(
  sb: any,
  jobRow: { id: number | string; employer_id: string },
  viewer: User | null,
  req: Request,
): Promise<boolean> {
  if (isAdmin(req)) return true;
  if (!viewer) return false;
  if (viewer.id === jobRow.employer_id) return true;

  const { count } = await sb
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', jobRow.id)
    .in('status', CAPTURED_STATUSES);
  return (count ?? 0) > 0;
}

/**
 * Cheap list-view variant: no per-row payment queries. In lists, only the
 * employer themselves (and admins) get phone numbers — workers open the
 * job detail page, where the escrow check runs.
 */
export function canSeeEmployerPhoneInList(
  jobRow: { employer_id: string },
  viewer: User | null,
  req: Request,
): boolean {
  if (isAdmin(req)) return true;
  return !!viewer && viewer.id === jobRow.employer_id;
}
