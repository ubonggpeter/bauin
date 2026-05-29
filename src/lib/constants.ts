export const BAUIN_COLORS = {
  primary: "#1A6659",
  primaryDark: "#0E4A3D",
  primaryLight: "#2B8A72",
  bgLight: "#F5F7F6",
  gold: "#F0B429",
  textDark: "#1A1A2E",
  border: "#E0E0E0",
} as const;

export const USER_RANKS = [
  "MEMBER",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "DIAMOND",
  "BILLIONAIRE",
  "BILLIONAIRE_ELITE",
] as const;

export const RANK_THRESHOLDS: Record<string, number> = {
  MEMBER: 0,
  BRONZE: 5,
  SILVER: 20,
  GOLD: 50,
  PLATINUM: 100,
  DIAMOND: 250,
  BILLIONAIRE: 500,
  BILLIONAIRE_ELITE: 1000,
};

export const COMMISSION_RATES: Record<number, number> = {
  1: 0.1,
  2: 0.05,
  3: 0.03,
  4: 0.02,
  5: 0.01,
};

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
