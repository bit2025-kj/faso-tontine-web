export interface RelationUser {
  id: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  role?: string;
}

export interface Relation {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted';
  type: string;
  created_at: string;
  other_user?: RelationUser;
  from_user?: RelationUser;
  to_user?: RelationUser;
}

export interface Suggestion {
  id: string;
  name: string;
  role: string;
  avatar_url?: string;
  verified: boolean;
  mutual_friends_count: number;
  reason: 'ami_de_ami' | 'contact' | 'contact_et_ami';
}
