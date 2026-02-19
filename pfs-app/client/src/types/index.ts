export interface User {
  id: string;
  email: string;
  name: string;
}

export type AssetCategory =
  | 'CASH_AND_EQUIVALENTS'
  | 'INVESTMENTS'
  | 'RETIREMENT_ACCOUNTS'
  | 'REAL_ESTATE'
  | 'VEHICLES'
  | 'BUSINESS_INTERESTS'
  | 'PERSONAL_PROPERTY'
  | 'LIFE_INSURANCE_CSV'
  | 'OTHER';

export type LiabilityCategory =
  | 'MORTGAGE'
  | 'HOME_EQUITY_LOAN'
  | 'AUTO_LOAN'
  | 'STUDENT_LOAN'
  | 'CREDIT_CARD'
  | 'BUSINESS_LOAN'
  | 'PERSONAL_LOAN'
  | 'TAX_LIABILITY'
  | 'OTHER';

export interface Asset {
  id: string;
  statementId: string;
  category: AssetCategory;
  description: string;
  value: number;
  sortOrder: number;
  notes?: string;
}

export interface Liability {
  id: string;
  statementId: string;
  category: LiabilityCategory;
  description: string;
  balance: number;
  monthlyPayment?: number;
  interestRate?: number;
  creditor?: string;
  maturityDate?: string;
  sortOrder: number;
  notes?: string;
}

export interface Statement {
  id: string;
  userId: string;
  name: string;
  asOfDate: string;
  notes?: string;
  fullName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  employer?: string;
  jobTitle?: string;
  annualSalary?: number;
  otherIncome?: number;
  otherIncomeDesc?: string;
  assets: Asset[];
  liabilities: Liability[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  _count?: { assets: number; liabilities: number };
}

export interface NetWorthHistoryPoint {
  date: string;
  statementId: string;
  statementName: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

export interface DashboardData {
  netWorthHistory: NetWorthHistoryPoint[];
  assetBreakdown: Record<string, number>;
  liabilityBreakdown: Record<string, number>;
  statementCount: number;
}

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  CASH_AND_EQUIVALENTS: 'Cash & Equivalents',
  INVESTMENTS: 'Investments',
  RETIREMENT_ACCOUNTS: 'Retirement Accounts',
  REAL_ESTATE: 'Real Estate',
  VEHICLES: 'Vehicles',
  BUSINESS_INTERESTS: 'Business Interests',
  PERSONAL_PROPERTY: 'Personal Property',
  LIFE_INSURANCE_CSV: 'Life Insurance (CSV)',
  OTHER: 'Other Assets',
};

export const LIABILITY_CATEGORY_LABELS: Record<LiabilityCategory, string> = {
  MORTGAGE: 'Mortgage',
  HOME_EQUITY_LOAN: 'Home Equity Loan',
  AUTO_LOAN: 'Auto Loan',
  STUDENT_LOAN: 'Student Loan',
  CREDIT_CARD: 'Credit Card',
  BUSINESS_LOAN: 'Business Loan',
  PERSONAL_LOAN: 'Personal Loan',
  TAX_LIABILITY: 'Tax Liability',
  OTHER: 'Other Liabilities',
};

export const ASSET_CATEGORIES: AssetCategory[] = [
  'CASH_AND_EQUIVALENTS',
  'INVESTMENTS',
  'RETIREMENT_ACCOUNTS',
  'REAL_ESTATE',
  'VEHICLES',
  'BUSINESS_INTERESTS',
  'PERSONAL_PROPERTY',
  'LIFE_INSURANCE_CSV',
  'OTHER',
];

export const LIABILITY_CATEGORIES: LiabilityCategory[] = [
  'MORTGAGE',
  'HOME_EQUITY_LOAN',
  'AUTO_LOAN',
  'STUDENT_LOAN',
  'CREDIT_CARD',
  'BUSINESS_LOAN',
  'PERSONAL_LOAN',
  'TAX_LIABILITY',
  'OTHER',
];
