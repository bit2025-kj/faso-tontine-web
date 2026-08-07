export interface UserOut {
  id: string;
  phone: string;
  prenom: string;
  nom: string;
  name: string;
  ville: string;
  sexe?: string;
  email?: string;
  role: string;
  machine: boolean;
  verified: boolean;
  profile_complete: boolean;
  avatar_url?: string;
  plan: string;
  plan_expires_at?: string;
  referral_code?: string;
  referral_rewards: number;
  has_password: boolean;
}
