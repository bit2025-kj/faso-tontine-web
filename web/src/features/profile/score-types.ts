import {
  AlertTriangle,
  Award,
  Clock,
  Flame,
  Medal,
  Star,
  Trophy,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface UserPublicProfile {
  user_id: string;
  name: string;
  avatar_url?: string;
  role: string;
  verified: boolean;
  score: number;
  score_label: string;
  avg_rating: number;
  total_ratings: number;
  badges: string[];
  report_status: string;
  my_rating?: number;
  member_since?: string;
}

export const BADGE_LABELS: Record<string, { label: string; Icon: LucideIcon }> = {
  veteran: { label: 'Vétéran', Icon: Medal },
  reliable: { label: 'Fiable', Icon: Award },
  punctual: { label: 'Ponctuel', Icon: Clock },
  active: { label: 'Actif', Icon: Flame },
  top_contributor: { label: 'Top contributeur', Icon: Wallet },
  well_rated: { label: 'Bien noté', Icon: Star },
  excellence: { label: 'Excellence', Icon: Trophy },
  flagged: { label: 'Signalé', Icon: AlertTriangle },
};
