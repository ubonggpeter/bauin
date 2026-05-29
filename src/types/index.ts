export interface User {
  id: string;
  name: string;
  email: string;
  rank: UserRank;
  referralCode: string;
  referredById?: string;
  createdAt: string;
}

export type UserRank =
  | "MEMBER"
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "DIAMOND"
  | "BILLIONAIRE"
  | "BILLIONAIRE_ELITE";

export interface WalletTransaction {
  id: string;
  userId: string;
  type: "CREDIT" | "DEBIT" | "WITHDRAWAL" | "BONUS";
  amount: number;
  description: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
}

export interface NetworkMember {
  id: string;
  name: string;
  email: string;
  rank: UserRank;
  level: number;
  joinedAt: string;
  isActive: boolean;
}

export interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  walletBalance: number;
  networkSize: number;
  activeMembers: number;
  thisMonthEarnings: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
