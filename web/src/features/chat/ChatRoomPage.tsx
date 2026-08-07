import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCheck,
  ChevronLeft,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Pin,
  PinOff,
  Search,
  Sparkles,
  Vote,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useAuth } from '../auth/auth-context';
import { chatApi, type MessageSearchResult } from './chat-api';
import { useChatSocket } from './chat-socket';
import CreatePollModal from './CreatePollModal';
import type { ChatMessage, Conversation, Poll } from './types';
import ProposalsModal from './ProposalsModal';
import StoriesModal from './StoriesModal';
import VoiceRecorderButton from './VoiceRecorderButton';
import './chat.css';

const TYPING_THROTTLE_MS = 2000;
const TYPING_EXPIRE_MS = 3000;

export default function ChatRoomPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { send, subscribe } = useChatSocket();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState<string | undefined>();
  const [actionError, setActionError] = useState<string | undefined>();
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showStories, setShowStories] = useState(false);
  const [showProposals, setShowProposals] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | undefined>();
  const lastTypingSentRef = useRef(0);
  const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const textInputRef = useRef<HTMLInputElement>(null);

  const [conversation, setConversation] = useState<Conversation | undefined>(() =>
    queryClient.getQueryData<Conversation[]>(['chat', 'conversations'])?.find((c) => c.id === conversationId),
  );
  const title = conversation ? conversationTitle(conversation, user?.id) : 'Conversation';
  const otherMemberIds = conversation?.members.filter((m) => m !== user?.id) ?? [];
  const mentionCandidates =
    conversation?.type === 'group' && mentionQuery !== null
      ? otherMemberIds
          .map((id) => ({ id, name: conversation.member_names[id] ?? '' }))
          .filter((m) => m.name.toLowerCase().includes(mentionQuery.toLowerCase()))
          .slice(0, 6)
      : [];

  const initial = useQuery({
    queryKey: ['chat', conversationId, 'messages'],
    queryFn: () => chatApi.listMessages(conversationId!),
    enabled: Boolean(conversationId),
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (initial.data) {
      // Backend paginates with a `before` cursor on sent_at for loading older
      // pages, consistent with newest-first ordering — reverse for display.
      setMessages([...initial.data].reverse());
    }
  }, [initial.data]);

  useEffect(() => {
    if (conversationId) chatApi.markRead(conversationId).catch(() => {});
  }, [conversationId]);

  const refreshConversation = useCallback(() => {
    chatApi
      .listConversations()
      .then((list) => {
        queryClient.setQueryData(['chat', 'conversations'], list);
        setConversation(list.find((c) => c.id === conversationId));
      })
      .catch(() => {});
  }, [conversationId, queryClient]);

  useEffect(() => {
    return subscribe((frame) => {
      if (frame.event === 'new_message' && frame.message?.conversation_id === conversationId) {
        setMessages((prev) => (prev.some((m) => m.id === frame.message.id) ? prev : [...prev, frame.message]));
        if (conversationId) chatApi.markRead(conversationId).catch(() => {});
      }
      if (frame.event === 'message_deleted' && frame.conversation_id === conversationId) {
        setMessages((prev) => prev.filter((m) => m.id !== frame.message_id));
      }
      // reaction_updated/poll_updated portent le message complet sous
      // frame.message (comme new_message), pas des champs à plat — la
      // comparaison `frame.conversation_id` échouait toujours (toujours
      // undefined) et ces deux mises à jour n'atteignaient jamais l'écran
      // des AUTRES membres (voir audit chat).
      if (frame.event === 'reaction_updated' && frame.message?.conversation_id === conversationId) {
        const updated = frame.message;
        setMessages((prev) => (prev.some((m) => m.id === updated.id) ? prev.map((m) => (m.id === updated.id ? updated : m)) : prev));
      }
      if (frame.event === 'poll_updated' && frame.message?.conversation_id === conversationId) {
        const updated = frame.message;
        setMessages((prev) => (prev.some((m) => m.id === updated.id) ? prev.map((m) => (m.id === updated.id ? updated : m)) : prev));
      }
      if (
        (frame.event === 'message_pinned' ||
          frame.event === 'message_unpinned' ||
          frame.event === 'dispute_activated' ||
          frame.event === 'dispute_closed' ||
          frame.event === 'member_joined') &&
        frame.conversation_id === conversationId
      ) {
        refreshConversation();
      }
      if (frame.event === 'new_story' && frame.conversation_id === conversationId) {
        queryClient.invalidateQueries({ queryKey: ['chat', conversationId, 'stories'] });
      }
      if (frame.event === 'typing' && frame.conversation_id === conversationId && frame.user_id !== user?.id) {
        setTypingLabel(frame.user_name ?? 'Quelqu’un');
        if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
        typingClearTimerRef.current = setTimeout(() => setTypingLabel(undefined), TYPING_EXPIRE_MS);
      }
      // Rejet serveur d'un envoi WS (limite de débit, type invalide, message
      // vide, media_url invalide, sondage sans données…) — sans ce handler,
      // rien ne prévenait l'utilisateur : le message disparaissait, point
      // (voir audit chat, motif récurrent cette session).
      if (frame.event === 'error') {
        setSendError(typeof frame.detail === 'string' ? frame.detail : 'Le serveur a rejeté ce message.');
      }
    });
  }, [subscribe, conversationId, user?.id, refreshConversation, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
    };
  }, []);

  // The WS is the primary send path, but it can be mid-reconnect (backoff
  // window) when the user hits send — in that case fall back to the REST
  // endpoint, same resilience pattern as the mobile app. Since a
  // REST-sent message won't also arrive back over a WS we're not connected
  // to, it's appended locally from the response instead of waiting for the
  // 'new_message' broadcast.
  async function dispatchMessage(body: { type: string; text?: string; media_url?: string; poll?: Poll; mentions?: string[] }) {
    if (!conversationId) return;
    setSendError(undefined);
    const sentOverWs = send({ action: 'send', conversation_id: conversationId, ...body });
    if (sentOverWs) return;
    try {
      const message = await chatApi.sendMessage(conversationId, body);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    } catch {
      setSendError('Message non envoyé — vérifiez votre connexion et réessayez.');
    }
  }

  const uploadAndSend = useMutation({
    mutationFn: async ({ file, mediaType }: { file: File; mediaType: string }) => {
      const { url } = await chatApi.uploadMedia(file, mediaType);
      await dispatchMessage({ type: mediaType, media_url: url });
    },
    onError: (err) =>
      setSendError(err instanceof ApiError ? err.message : "Envoi du fichier impossible — réessayez."),
  });

  function handleTextChange(value: string, caret: number) {
    setText(value);
    if (conversationId && value.trim()) {
      const now = Date.now();
      if (now - lastTypingSentRef.current > TYPING_THROTTLE_MS) {
        lastTypingSentRef.current = now;
        send({ action: 'typing', conversation_id: conversationId });
      }
    }

    // Détecte un "@" en cours de frappe juste avant le curseur (mentions —
    // le composeur web ne les gérait pas du tout, voir audit) : cherche le
    // dernier "@" sur la portion avant le curseur, tant qu'il n'y a pas
    // d'espace entre lui et le curseur.
    const before = value.slice(0, caret);
    const at = before.lastIndexOf('@');
    if (at === -1 || /\s/.test(before.slice(at + 1))) {
      setMentionQuery(null);
    } else {
      setMentionQuery(before.slice(at + 1));
    }
  }

  function pickMention(memberId: string, memberName: string) {
    const el = textInputRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret);
    const at = before.lastIndexOf('@');
    if (at === -1) return;
    const next = `${text.slice(0, at)}@${memberName} ${text.slice(caret)}`;
    setText(next);
    setMentionedIds((prev) => (prev.includes(memberId) ? prev : [...prev, memberId]));
    setMentionQuery(null);
    requestAnimationFrame(() => el?.focus());
  }

  function sendText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !conversationId) return;
    const pending = text.trim();
    const mentions = mentionedIds.filter((id) => text.includes(`@${conversation?.member_names[id] ?? ''}`));
    setText('');
    setMentionedIds([]);
    setMentionQuery(null);
    dispatchMessage({ type: 'text', text: pending, mentions: mentions.length > 0 ? mentions : undefined });
  }

  function reportActionError(err: unknown, fallback: string) {
    setActionError(err instanceof ApiError ? err.message : fallback);
  }

  function react(messageId: string, emoji: string) {
    if (!conversationId) return;
    setActionError(undefined);
    chatApi
      .react(conversationId, messageId, emoji)
      .then((updated) => {
        // Patch immédiat depuis la réponse REST — la trame WS
        // reaction_updated ne concerne de toute façon que les autres
        // membres (voir souscription ci-dessus).
        setMessages((prev) => (prev.some((m) => m.id === updated.id) ? prev.map((m) => (m.id === updated.id ? updated : m)) : prev));
      })
      .catch((err) => reportActionError(err, 'Réaction impossible — réessayez.'));
  }

  function deleteMessage(messageId: string) {
    if (!conversationId) return;
    if (!window.confirm('Supprimer ce message ?')) return;
    setActionError(undefined);
    chatApi
      .deleteMessage(conversationId, messageId)
      .then(() => setMessages((prev) => prev.filter((m) => m.id !== messageId)))
      .catch((err) => reportActionError(err, 'Suppression impossible — réessayez.'));
  }

  function togglePin(messageId: string) {
    if (!conversationId) return;
    setActionError(undefined);
    const isPinned = conversation?.pinned_message_id === messageId;
    const action = isPinned ? chatApi.unpin(conversationId) : chatApi.pin(conversationId, messageId);
    action
      .then((updated) => {
        setConversation(updated);
        queryClient.setQueryData<Conversation[]>(['chat', 'conversations'], (list) =>
          list?.map((c) => (c.id === updated.id ? updated : c)),
        );
      })
      .catch((err) => reportActionError(err, "Impossible d'épingler ce message."));
  }

  function closeDispute() {
    if (!conversationId) return;
    setActionError(undefined);
    chatApi
      .closeDispute(conversationId)
      .then(refreshConversation)
      .catch((err) => reportActionError(err, 'Impossible de clore le litige.'));
  }

  const voteMutation = useMutation({
    mutationFn: (vars: { messageId: string; optionIndex: number }) =>
      chatApi.voteMessage(conversationId!, vars.messageId, vars.optionIndex),
    onMutate: () => setActionError(undefined),
    onSuccess: (updated) => {
      setMessages((prev) => (prev.some((m) => m.id === updated.id) ? prev.map((m) => (m.id === updated.id ? updated : m)) : prev));
    },
    onError: (err) => reportActionError(err, 'Vote impossible — réessayez.'),
  });

  return (
    <div className="chat-room">
      <div className="chat-room-header">
        <button className="tontine-back" onClick={() => navigate('/messages')}>
          <ChevronLeft size={18} /> {title}
        </button>
        <div className="chat-room-header-actions">
          <button aria-label="Rechercher" onClick={() => setShowSearch((v) => !v)}>
            <Search size={18} />
          </button>
          <button aria-label="Stories" onClick={() => setShowStories(true)}>
            <Sparkles size={18} />
          </button>
          <button aria-label="Propositions du groupe" onClick={() => setShowProposals(true)}>
            <Vote size={18} />
          </button>
        </div>
      </div>

      {showSearch && conversationId && <MessageSearch conversationId={conversationId} onClose={() => setShowSearch(false)} />}

      {actionError && <p className="chat-send-error">{actionError}</p>}

      {conversation?.dispute?.active && (
        <div className="chat-dispute-banner">
          <AlertTriangle size={16} />
          <span>Un litige est ouvert dans cette conversation.</span>
          <button onClick={closeDispute}>Clore</button>
        </div>
      )}

      {conversation?.pinned_message_id && (
        <div className="chat-pinned-banner">
          <Pin size={14} />
          <span>{conversation.pinned_message_preview ?? 'Message épinglé'}</span>
          <button onClick={() => togglePin(conversation.pinned_message_id!)} aria-label="Désépingler">
            <PinOff size={14} />
          </button>
        </div>
      )}

      <div className="chat-messages">
        {initial.isLoading && <p className="feed-status">Chargement…</p>}
        {initial.isError && <p className="feed-status feed-status-error">Impossible de charger cette conversation.</p>}
        {!initial.isLoading && !initial.isError && messages.length === 0 && (
          <p className="feed-status">Aucun message pour l'instant — dites bonjour !</p>
        )}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            mine={m.sender_id === user?.id}
            pinned={conversation?.pinned_message_id === m.id}
            readByOthers={otherMemberIds.length > 0 && otherMemberIds.some((id) => m.read_by?.includes(id))}
            memberNames={conversation?.member_names ?? {}}
            onReact={(emoji) => react(m.id, emoji)}
            onDelete={() => deleteMessage(m.id)}
            onTogglePin={() => togglePin(m.id)}
            onVote={(optionIndex) => voteMutation.mutate({ messageId: m.id, optionIndex })}
          />
        ))}
        {typingLabel && <p className="chat-typing">{typingLabel} est en train d'écrire…</p>}
        <div ref={bottomRef} />
      </div>

      {sendError && <p className="chat-send-error">{sendError}</p>}

      <form className="chat-composer" onSubmit={sendText}>
        <div className="chat-attach-wrap">
          <button
            type="button"
            className="chat-attach"
            onClick={() => setShowAttachMenu((v) => !v)}
            aria-label="Joindre un fichier"
          >
            <Paperclip size={19} />
          </button>
          {showAttachMenu && (
            <div className="chat-attach-menu" onMouseLeave={() => setShowAttachMenu(false)}>
              <label>
                <ImageIcon size={16} /> Photo / vidéo
                <input
                  type="file"
                  accept="image/*,video/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setShowAttachMenu(false);
                    if (file) uploadAndSend.mutate({ file, mediaType: file.type.startsWith('video/') ? 'video' : 'image' });
                    e.target.value = '';
                  }}
                />
              </label>
              <label>
                <FileText size={16} /> Document
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setShowAttachMenu(false);
                    if (file) uploadAndSend.mutate({ file, mediaType: 'document' });
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  setShowCreatePoll(true);
                }}
              >
                <BarChart3 size={16} /> Sondage
              </button>
            </div>
          )}
        </div>
        <VoiceRecorderButton onRecorded={(file) => uploadAndSend.mutate({ file, mediaType: 'audio' })} />
        <div className="chat-text-input-wrap">
          {mentionCandidates.length > 0 && (
            <div className="chat-mention-menu">
              {mentionCandidates.map((m) => (
                <button type="button" key={m.id} onClick={() => pickMention(m.id, m.name)}>
                  {m.name}
                </button>
              ))}
            </div>
          )}
          <input
            ref={textInputRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
            placeholder="Message…"
          />
        </div>
        <button type="submit" className="chat-send-btn" disabled={!text.trim()}>
          Envoyer
        </button>
      </form>

      {showStories && conversationId && <StoriesModal conversationId={conversationId} onClose={() => setShowStories(false)} />}
      {showProposals && conversationId && (
        <ProposalsModal conversationId={conversationId} onClose={() => setShowProposals(false)} />
      )}
      {showCreatePoll && (
        <CreatePollModal
          onClose={() => setShowCreatePoll(false)}
          onCreate={(poll) => {
            setShowCreatePoll(false);
            dispatchMessage({ type: 'poll', poll });
          }}
        />
      )}
    </div>
  );
}

function MessageSearch({ conversationId, onClose }: { conversationId: string; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    chatApi
      .searchMessages(conversationId, q.trim())
      .then(setResults)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Recherche impossible — réessayez.'))
      .finally(() => setBusy(false));
  }

  return (
    <div className="chat-search-panel">
      <form onSubmit={runSearch}>
        <Search size={16} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans la conversation…" />
        <button type="button" onClick={onClose} aria-label="Fermer la recherche">
          <X size={16} />
        </button>
      </form>
      {busy && <p className="feed-status">Recherche…</p>}
      {error && <p className="feed-status feed-status-error">{error}</p>}
      {!busy && results.length > 0 && (
        <ul className="chat-search-results">
          {results.map((r) => (
            <li key={r.id}>
              <span className="chat-search-sender">{r.sender_name}</span>
              <span>{r.text}</span>
              <span className="chat-search-time">{new Date(r.sent_at).toLocaleDateString('fr-FR')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

function MessageBubble({
  message,
  mine,
  pinned,
  readByOthers,
  memberNames,
  onReact,
  onDelete,
  onTogglePin,
  onVote,
}: {
  message: ChatMessage;
  mine: boolean;
  pinned: boolean;
  readByOthers: boolean;
  memberNames: Record<string, string>;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onVote: (optionIndex: number) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  if (message.type === 'system') {
    return <div className="chat-system-message">{message.text ?? 'Événement de conversation'}</div>;
  }

  return (
    <div className={`chat-bubble-row${mine ? ' chat-bubble-row-mine' : ''}`}>
      {!mine && (
        <div className="chat-bubble-avatar">
          {message.sender_avatar_url ? <img src={message.sender_avatar_url} alt="" /> : message.sender_name.charAt(0)}
        </div>
      )}
      <div className="chat-bubble" onDoubleClick={() => setShowActions((v) => !v)}>
        {!mine && <span className="chat-bubble-sender">{message.sender_name}</span>}
        {pinned && <Pin size={11} className="chat-bubble-pin-flag" aria-label="Épinglé" />}
        {message.type === 'text' && <p>{renderMessageText(message.text ?? '', message.mentions, memberNames)}</p>}
        {message.type === 'image' && <img className="chat-bubble-image" src={message.media_url} alt="" />}
        {message.type === 'audio' && <audio controls src={message.media_url} />}
        {message.type === 'video' && <video controls src={message.media_url} className="chat-bubble-image" />}
        {message.type === 'document' && (
          <a className="chat-bubble-document" href={message.media_url} target="_blank" rel="noreferrer">
            <FileIcon size={16} /> Document
          </a>
        )}
        {message.type === 'poll' && message.poll && <PollBlock poll={message.poll} onVote={onVote} />}

        <span className="chat-bubble-time">
          {new Date(message.sent_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          {mine && (readByOthers ? <CheckCheck size={13} className="chat-read-icon-read" /> : <Check size={13} />)}
        </span>

        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="chat-bubble-reactions">
            {Object.entries(message.reactions).map(([emoji, users]) =>
              users.length > 0 ? (
                <span key={emoji}>
                  {emoji} {users.length}
                </span>
              ) : null,
            )}
          </div>
        )}

        {showActions && (
          <div className="chat-reaction-picker">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  setShowActions(false);
                }}
              >
                {emoji}
              </button>
            ))}
            <button
              className="chat-reaction-pin"
              onClick={() => {
                onTogglePin();
                setShowActions(false);
              }}
              aria-label={pinned ? 'Désépingler' : 'Épingler'}
            >
              {pinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
            {mine && (
              <button
                className="chat-reaction-delete"
                onClick={() => {
                  onDelete();
                  setShowActions(false);
                }}
                aria-label="Supprimer"
              >
                🗑
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PollBlock({ poll, onVote }: { poll: NonNullable<ChatMessage['poll']>; onVote: (optionIndex: number) => void }) {
  return (
    <div className="chat-poll">
      <p className="chat-poll-question">{poll.question}</p>
      {poll.options.map((option, i) => {
        const total = poll.options.reduce((sum, o) => sum + o.voter_ids.length, 0);
        const pct = total > 0 ? Math.round((option.voter_ids.length / total) * 100) : 0;
        return (
          <button key={i} type="button" className="chat-poll-option" disabled={poll.closed} onClick={() => onVote(i)}>
            <span className="chat-poll-option-fill" style={{ width: `${pct}%` }} />
            <span className="chat-poll-option-label">{option.text}</span>
            <span className="chat-poll-option-count">{option.voter_ids.length}</span>
          </button>
        );
      })}
      {poll.closed && <span className="chat-poll-closed">Sondage clos</span>}
    </div>
  );
}

// Le composeur insère "@Nom " en texte brut (voir pickMention) — la saisie
// fonctionnait déjà, mais rien ne mettait ces mentions en évidence à
// l'affichage (voir audit chat). On repère les occurrences de "@Nom" pour
// chaque nom présent dans message.mentions et on les entoure d'un span.
function renderMessageText(text: string, mentions: string[] | undefined, memberNames: Record<string, string>) {
  const names = (mentions ?? [])
    .map((id) => memberNames[id])
    .filter((n): n is string => Boolean(n))
    .sort((a, b) => b.length - a.length);
  if (names.length === 0) return text;
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(@(?:${escaped.join('|')}))`, 'g');
  return text.split(pattern).map((part, i) =>
    part.startsWith('@') && names.includes(part.slice(1)) ? (
      <span key={i} className="chat-mention">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function conversationTitle(c: Conversation, myId?: string): string {
  if (c.type === 'group') return c.name ?? 'Groupe';
  const otherId = c.members.find((m) => m !== myId);
  return (otherId && c.member_names[otherId]) || c.name || 'Conversation';
}
