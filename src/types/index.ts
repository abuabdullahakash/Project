export type Priority = 'High' | 'Medium' | 'Low';
export type Stage = 'First Stage' | 'Middle Stage' | 'Final Stage' | 'Delivered';
export type Status = 'Active' | 'Revision' | 'Delivered';
export type NoteTag = 
  | 'Clarification' 
  | 'Update Message' 
  | 'Follow Up' 
  | 'Delivery' 
  | 'Meeting Summary' 
  | 'Fixing Update' 
  | 'Extend Message' 
  | 'Ask For Additional Charge' 
  | 'Hyper Client Convenience';

export type UserRole = 'admin' | 'manager' | 'leader' | 'co-leader' | 'member' | 'user';
export type AssignmentStatus = 'unassigned' | 'pending' | 'accepted' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  teamId?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface Team {
  id: string;
  name: string;
  managerIds: string[];
  leaderId: string;
  coLeaderId?: string;
  memberIds: string[];
  allMembers: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Note {
  id: string;
  content: string;
  timestamp: string;
  tags: NoteTag[];
  isPinned?: boolean;
}

export interface ProjectLink {
  id: string;
  title: string;
  url: string;
}

export interface ProjectCredential {
  id: string;
  title: string;
  url: string;
  username: string;
  password: string;
}

export interface GlobalNote {
  id: string;
  title: string;
  content: string;
  url?: string;
  isPinned?: boolean;
  color?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string;
  teamId?: string;
}

export interface ChatMessage {
  id: string;
  teamId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  timestamp: any;
  deletedFor?: string[];
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Todo {
  id: string;
  userId: string;
  title: string;
  notes?: string;
  category?: string;
  tags?: string[];
  completed: boolean;
  isFlagged?: boolean;
  priority: 'High' | 'Medium' | 'Low';
  dueDate?: string;
  dueTime?: string;
  estimatedTime?: number; // in minutes
  actualTime?: number; // in minutes
  createdAt: string;
  updatedAt: string;
  subtasks?: Subtask[];
  order?: number;
}

export interface ProjectTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface ElementorTemplate {
  id: string;
  userId: string;
  title: string;
  category: string;
  jsonContent: string;
  isCompressed?: boolean;
  screenshotUrl?: string;
  liveUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  title: string;
  projectType?: 'client' | 'personal';
  clientName?: string;
  clientEmail?: string;
  description?: string;
  price?: number;
  priority: Priority;
  startDate?: string;
  endDate?: string;
  stage: Stage;
  status: Status;
  createdAt: string;
  deliveredAt?: string;
  lastUpdatedAt: string;
  websiteLink?: string;
  notes: Note[];
  tasks?: ProjectTask[];
  clientRating?: number;
  reviewScreenshotUrl?: string;
  projectGalleryUrls?: string[];
  liveDemoUrl?: string;
  additionalLinks?: ProjectLink[];
  credentials?: ProjectCredential[];
  
  // New fields for team management
  userId?: string;
  assignedTo?: string;
  assignedBy?: string;
  teamId?: string;
  assignmentStatus?: AssignmentStatus;
  telegramChatId?: string;
}
