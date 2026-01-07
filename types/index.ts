// ============================================
// types/index.ts - TypeScript type definitions
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  partnerId: string | null;
  isPremium: boolean;
  createdAt: Date;
  currentWeekScore: number;
  premiumPurchaseDate?: Date;
  customTriggers?: TriggerItem[];
  customDeeds?: DeedItem[];
  selectedTriggerIds?: number[];
  selectedDeedIds?: number[];
}

export interface TriggerItem {
  id: number;
  name: string;
  points: number;
  emoji: string;
  isCustom?: boolean;
  createdBy?: string;
}

export interface DeedItem {
  id: number;
  name: string;
  points: number;
  emoji: string;
  isCustom?: boolean;
  createdBy?: string;
}

export interface Report {
  id?: string;
  userId: string;
  partnerId: string;
  type: 'trigger' | 'deed';
  itemId: number;
  itemName: string;
  points: number;
  photoUrl: string | null;
  notes: string;
  timestamp: Date;
  weekNumber: number;
  year: number;
}

export interface WeeklyData {
  week: number;
  year: number;
  userScore: number;
  partnerScore: number;
  winner?: 'You' | 'Partner' | 'Tie';
}

export interface WeeklyStats {
  userWins: number;
  partnerWins: number;
}

// Navigation types for Expo Router
declare global {
  namespace ReactNavigation {
    interface RootParamList {
      '(auth)': undefined;
      '(app)': undefined;
      'report': { type: 'trigger' | 'deed' };
      'leaderboard': undefined;
      'premium': undefined;
      'settings': undefined;
      'link-partner': undefined;
      'custom-items': undefined;
    }
  }
}
