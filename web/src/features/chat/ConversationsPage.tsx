import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, FileText, Image as ImageIcon, Mic, Video } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { chatApi } from './chat-api';
import { useChatSocket } from './chat-socket';
import './chat.css';

export default function ConversationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { subscribe } = useChatSocket();

  const conversations = useQuery({ queryKey: ['chat', 'conversations'], queryFn: () => chatApi.listConversations() });

  useEffect(() => {
    return subscribe((frame) => {
      if (['new_message', 'message_deleted', 'reaction_updated'].includes(frame.event)) {
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      }
    });
  }, [subscribe, queryClient]);

  return (
    <div>
      <h2>Messages</h2>

      {conversations.isLoading && <p className="feed-status">Chargement…</p>}
      {conversations.data?.length === 0 && <p className="feed-status">Aucune conversation pour l'instant.</p>}

      <ul className="conv-list">
        {conversations.data?.map((c) => {
          const otherName = conversationTitle(c, user?.id);
          const otherAvatar = conversationAvatar(c, user?.id);
          return (
            <li key={c.id}>
              <button className="conv-row" onClick={() => navigate(`/messages/${c.id}`)}>
                <span className="conv-avatar">
                  {otherAvatar ? <img src={otherAvatar} alt="" /> : otherName.charAt(0)}
                </span>
                <span className="conv-body">
                  <span className="conv-name">{otherName}</span>
                  {c.last_message && (
                    <span className="conv-preview">
                      {c.last_message.sender_name}: <MessagePreview last={c.last_message} />
                    </span>
                  )}
                </span>
                {c.unread_count > 0 && <span className="conv-unread">{c.unread_count}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function conversationTitle(c: { type: string; name?: string; members: string[]; member_names: Record<string, string> }, myId?: string): string {
  if (c.type === 'group') return c.name ?? 'Groupe';
  const otherId = c.members.find((m) => m !== myId);
  return (otherId && c.member_names[otherId]) || c.name || 'Conversation';
}

function conversationAvatar(c: { cover_url?: string; type: string; members: string[]; member_avatars: Record<string, string> }, myId?: string): string | undefined {
  if (c.type === 'group') return c.cover_url;
  const otherId = c.members.find((m) => m !== myId);
  return otherId ? c.member_avatars[otherId] : undefined;
}

function MessagePreview({ last }: { last: { type: string; text?: string } }) {
  const icon: Record<string, React.ReactNode> = {
    image: <ImageIcon size={13} />,
    audio: <Mic size={13} />,
    video: <Video size={13} />,
    document: <FileText size={13} />,
    poll: <BarChart3 size={13} />,
  };
  const label: Record<string, string> = {
    image: 'Photo',
    audio: 'Message vocal',
    video: 'Vidéo',
    document: 'Document',
    poll: 'Sondage',
  };
  if (last.type === 'text') return <>{last.text}</>;
  return (
    <span className="conv-preview-media">
      {icon[last.type]} {label[last.type] ?? '…'}
    </span>
  );
}
