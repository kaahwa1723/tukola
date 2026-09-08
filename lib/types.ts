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
}

export type JobUrgency = 'immediate' | 'scheduled';
export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'invited';

export interface Applicant {
  workerId: string;
  workerName: string;
  workerAvatar?: string;
  rating: number;
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
