export interface MyTontineListItem {
  tontine_id: string;
  owner_id: string;
  local_id: string;
  name: string;
  type: 'rotative' | 'epargne';
  start_date?: string;
  end_date?: string;
  archived: boolean;
  cover_url?: string;
  tontinier_name?: string;
  my_member_local_id?: string;
  my_contribution_amount?: number;
  my_status?: string;
}

export interface TontineMember {
  local_id: string;
  name: string;
  phone?: string;
  amount?: number;
  status?: string;
  position?: number;
  avatar_url?: string;
  participant_user_id?: string;
}

export interface TontineCycle {
  local_id: string;
  number: number;
  start_date?: string;
  end_date?: string;
  assigned_member_id?: string;
  status?: string;
}

export interface TontineContribution {
  local_id: string;
  cycle_local_id?: string;
  member_local_id: string;
  amount: number;
  date?: string;
  paid_at?: string;
  payment_method?: string;
  source?: string;
}

export interface TontineWithdrawal {
  local_id: string;
  member_local_id: string;
  amount: number;
  date?: string;
}

export interface TontineInfo {
  name: string;
  type: 'rotative' | 'epargne';
  amount?: number;
  frequency?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  cover_url?: string;
}

export interface TontineDetail {
  tontine: TontineInfo;
  members: TontineMember[];
  cycles: TontineCycle[];
  contributions: TontineContribution[];
  withdrawals: TontineWithdrawal[];
  my_member_local_id?: string;
}

export interface PenaltyResult {
  amount_due: number;
  penalty: number;
  total_due: number;
  days_late: number;
}
