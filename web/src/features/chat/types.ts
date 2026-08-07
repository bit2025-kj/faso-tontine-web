export interface DisputeInfo {
  active: boolean;
  parties: string[];
  opened_at?: string;
}

export interface Conversation {
  id: string;
  type: 'group' | 'direct';
  name?: string;
  tontine_id?: string;
  tontine_local_id?: string;
  cover_url?: string;
  members: string[];
  member_names: Record<string, string>;
  member_avatars: Record<string, string>;
  last_message?: { type: string; text?: string; sender_name: string; sent_at: string };
  unread_count: number;
  created_at: string;
  dispute?: DisputeInfo;
  pinned_message_id?: string;
  pinned_message_preview?: string;
}

export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'poll' | 'system';

export interface PollOption {
  text: string;
  voter_ids: string[];
}

export interface Poll {
  question: string;
  options: PollOption[];
  expires_at?: string;
  closed: boolean;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar_url?: string;
  type: MessageType;
  text?: string;
  media_url?: string;
  duration_ms?: number;
  reactions?: Record<string, string[]>;
  mentions?: string[];
  poll?: Poll;
  sent_at: string;
  read_by?: string[];
}
