export type Role = 'worker' | 'employer';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  location?: string;
  avatar?: string;
  rating?: number;
  completedJobs?: number;
  reliabilityScore?: number;
  skills?: string[];
  about?: string;
  responseTime?: string;
  lastActive?: string;
  isVerified?: boolean;
  blocked?: boolean;
  company?: string;
  portfolioImages?: string[];
  /** Worker's Mobile Money payout number — where released money is sent. */
  momoPayoutPhone?: string;
  /** Where released pay goes: 'momo' = instant Mobile Money, 'wallet' = keep in wallet. */
  payoutPreference?: 'momo' | 'wallet';
  /** Basic KYC — self-declared, optional. */
  sex?: 'male' | 'female';
  /** ISO date (YYYY-MM-DD); server enforces 18+. */
  dateOfBirth?: string;
  /** National ID number (NIN). REQUIRED for fundis to apply for jobs. Never shown to non-owners. */
  nationalIdNumber?: string;
  /** Photo of the national ID. Never shown to non-owners. */
  nationalIdPhotoUrl?: string;
  /** Emergency contact. REQUIRED for fundis to apply for jobs. Never shown to non-owners. */
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  /** Trade qualification (e.g. DIT/UVTAB/UBTEB). Optional — raises profile strength. */
  qualification?: string;
  /** Photo of the trade certificate. Optional — raises profile strength. */
  certificatePhotoUrl?: string;
  /** Photo of the LC1 / area letter. Optional — raises profile strength. */
  lcLetterPhotoUrl?: string;
}

export type JobUrgency = 'immediate' | 'scheduled';
export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'invited';

export interface Applicant {
  workerId: string;
  workerName: string;
  workerAvatar?: string;
  rating?: number; // optional — undefined = no ratings yet (show "New", never a fake number)
  completedJobs?: number;
  skills?: string[];
  appliedAt: string;
  status: ApplicationStatus;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  dateTime: string;
  workersNeeded: number;
  pay?: number;
  urgency: JobUrgency;
  status: JobStatus;
  employerId: string;
  employerName: string;
  employerAvatar?: string;
  employerPhone?: string;
  applicants: Applicant[];
  skills?: string[];
  category?: string;
  estimatedHours?: number;
  imageUrl?: string;
  images?: string[];
  pricingType?: 'standard' | 'milestone';
  createdAt: string;
  completedAt?: string;
  distanceKm?: number;
}

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  fromName: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  jobTitle?: string;
  jobId?: string;
  messages?: Message[];
}

export interface Rating {
  jobId: string;
  fromId: string;
  toId: string;
  score: 'great' | 'issues';
  comment?: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalWorkers: number;
  totalEmployers: number;
  activeJobs: number;
  completedJobs: number;
  newUsersThisWeek: number;
  jobsPostedThisWeek: number;
}
