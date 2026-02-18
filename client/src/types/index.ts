// ============================================================
// AUTH
// ============================================================

export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ============================================================
// EMAIL
// ============================================================

export interface EmailAccount {
  id: string;
  label: string;
  emailAddress: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  username: string;
  isActive: boolean;
}

export interface EmailMessage {
  id: string;
  messageId?: string;
  folder: string;
  fromAddress: string;
  fromName?: string;
  toAddresses: Array<{ address: string; name?: string }>;
  ccAddresses?: Array<{ address: string; name?: string }>;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  bodyPreview?: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  date: string;
}

export interface EmailFolder {
  name: string;
  total: number;
  unread: number;
}

// ============================================================
// CALENDAR
// ============================================================

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  recurrenceRule?: string;
  color?: string;
  googleEventId?: string;
}

// ============================================================
// ACCOUNTING
// ============================================================

export interface Entity {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface Account {
  id: string;
  entityId: string;
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  description?: string;
  children?: Account[];
}

export interface JournalLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  account?: { code: string; name: string; type: AccountType };
}

export interface JournalEntry {
  id: string;
  entityId: string;
  date: string;
  reference?: string;
  description: string;
  isPosted: boolean;
  lines: JournalLine[];
  user?: { firstName: string; lastName: string };
}

// ============================================================
// TASKS
// ============================================================

export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isArchived: boolean;
  taskCounts?: {
    total: number;
    done: number;
    inProgress: number;
  };
}

export interface Task {
  id: string;
  projectId?: string;
  parentId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  sortOrder: number;
  project?: { id: string; name: string; color?: string };
  assignments?: Array<{ user: { id: string; firstName: string; lastName: string } }>;
  children?: Array<{ id: string; title: string; status: TaskStatus; priority: TaskPriority }>;
  dependencies?: Array<{ dependsOn: { id: string; title: string; status: TaskStatus } }>;
  timeEntries?: TimeEntry[];
}

export interface TimeEntry {
  id: string;
  taskId: string;
  startTime: string;
  endTime?: string;
  description?: string;
  user?: { id: string; firstName: string; lastName: string };
  task?: { id: string; title: string };
}

// ============================================================
// RENTVINE
// ============================================================

export interface RentvineProperty {
  id: string;
  rentvineId: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  type?: string;
  status?: string;
  ownerName?: string;
  units?: RentvineUnit[];
  _count?: { tenants: number; maintenanceRequests: number };
}

export interface RentvineUnit {
  id: string;
  name: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  rent?: number;
  status?: string;
}

export interface RentvineTenant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  leaseStart?: string;
  leaseEnd?: string;
  rentAmount?: number;
  status?: string;
  property?: { id: string; name: string; address?: string };
  unit?: { id: string; name: string };
}

export interface RentvineMaintenanceRequest {
  id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  requestedBy?: string;
  assignedTo?: string;
  property?: { id: string; name: string; address?: string };
  createdAt: string;
}

// ============================================================
// DASHBOARD
// ============================================================

export interface DashboardData {
  tasks: {
    summary: Record<string, number>;
    myTasks: Task[];
  };
  calendar: {
    upcomingEvents: CalendarEvent[];
  };
  email: {
    unreadCount: number;
  };
  properties: {
    total: number;
    activeTenants: number;
    recentMaintenanceRequests: RentvineMaintenanceRequest[];
  };
  timeTracking: {
    activeTimer: TimeEntry | null;
  };
}

// ============================================================
// CRM
// ============================================================

export type CrmColumnType = 'TEXT' | 'NUMBER' | 'STATUS' | 'DATE' | 'PERSON' | 'EMAIL' | 'PHONE' | 'LINK' | 'DROPDOWN' | 'CHECKBOX' | 'RATING';

export interface CrmBoard {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  position: number;
  columns: CrmColumn[];
  groups: CrmGroup[];
  _count?: { groups: number; columns: number };
}

export interface CrmColumn {
  id: string;
  boardId: string;
  name: string;
  type: CrmColumnType;
  config?: any;
  width: number;
  position: number;
}

export interface CrmGroup {
  id: string;
  boardId: string;
  name: string;
  color: string;
  position: number;
  collapsed: boolean;
  items: CrmItem[];
}

export interface CrmItem {
  id: string;
  groupId: string;
  name: string;
  position: number;
  cellValues: CrmCellValue[];
  createdAt?: string;
}

export interface CrmCellValue {
  id: string;
  itemId: string;
  columnId: string;
  value: any;
}

export interface CrmActivity {
  id: string;
  itemId: string;
  userId: string;
  type: string;
  content: string;
  metadata?: any;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string };
}

// ============================================================
// COMMON
// ============================================================

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  [key: string]: T[] | number;
}
