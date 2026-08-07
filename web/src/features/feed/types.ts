export interface FeedPost {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  author_verified: boolean;
  author_avatar_url?: string;
  author_badges: string[];
  type: 'seeking_members' | 'seeking_tontine';
  title: string;
  description: string;
  tontine_type?: 'rotative' | 'epargne';
  amount?: number;
  frequency?: string;
  slots_total?: number;
  slots_filled: number;
  status: string;
  tontine_id?: string;
  tontine_local_id?: string;
  media_urls: string[];
  media_type?: string;
  likes_count: number;
  liked_by_me: boolean;
  has_pending_request: boolean;
  comments_count: number;
  created_at: string;
}

export interface FeedComment {
  id: string;
  post_id: string;
  parent_id?: string;
  author_id: string;
  author_name: string;
  author_avatar_url?: string;
  text: string;
  likes_count: number;
  replies_count?: number;
  created_at: string;
}

export interface JoinRequest {
  id: string;
  post_id: string;
  participant_id: string;
  participant_name?: string;
  participant_phone?: string;
  participant_avatar_url?: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  created_at: string;
  post_title?: string;
  tontinier_name?: string;
  participant_kyc_status?: string;
  contract_pdf_url?: string;
}

export interface KycStatus {
  status: 'pending' | 'approved' | 'rejected';
  review_note?: string;
  submitted_at: string;
  reviewed_at?: string;
}

export interface FeedFilters {
  type?: 'seeking_members' | 'seeking_tontine';
  tontine_type?: 'rotative' | 'epargne';
  min_amount?: number;
  max_amount?: number;
}
