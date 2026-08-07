import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Heart, MessageCircle, MoreVertical, Repeat2, Share2, Users, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReportModal from '../../components/ReportModal';
import { BADGE_LABELS } from '../profile/score-types';
import { feedApi } from './feed-api';
import type { FeedPage } from './feed-api';
import type { FeedPost } from './types';
import CommentsSheet from './CommentsSheet';
import CreatePostModal from './CreatePostModal';
import JoinFlowModal from './JoinFlowModal';

// Clés alignées sur FeedPostCreate.valid_frequency côté backend (feed.py)
const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Journalière',
  weekly: 'Hebdomadaire',
  biweekly: 'Bimensuelle',
  monthly: 'Mensuelle',
  quarterly: 'Trimestrielle',
};

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Contenu inapproprié' },
  { value: 'fake', label: 'Annonce fictive' },
  { value: 'other', label: 'Autre' },
];

export default function PostCard({ post, currentUserId }: { post: FeedPost; currentUserId?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const like = useMutation({
    mutationFn: () => feedApi.toggleLike(post.id),
    onSuccess: (updated) => {
      queryClient.setQueriesData<FeedListInfiniteData>({ queryKey: ['feed'] }, (old) => patchPost(old, updated));
    },
  });

  const remove = useMutation({
    mutationFn: () => feedApi.delete(post.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });

  const isOwn = post.author_id === currentUserId;
  const slotsLeft =
    post.slots_total != null ? Math.max(post.slots_total - post.slots_filled, 0) : undefined;

  function confirmDelete() {
    setShowMenu(false);
    if (window.confirm('Supprimer cette annonce définitivement ?')) {
      remove.mutate();
    }
  }

  async function sharePost() {
    setShowMenu(false);
    const url = `${window.location.origin}/feed/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text: post.description, url });
      } catch {
        // user cancelled the native share sheet
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <article className="post-card">
      <header className="post-card-head">
        <div
          className="post-card-head-clickable post-card-head-identity"
          onClick={() => navigate(`/profile/${post.author_id}/score`)}
        >
          <div className="post-card-avatar">
            {post.author_avatar_url ? <img src={post.author_avatar_url} alt="" /> : post.author_name.charAt(0)}
          </div>
          <div className="post-card-author">
            <span className="post-card-author-name">
              {post.author_name}
              {post.author_verified && <BadgeCheck className="post-card-verified" size={16} aria-label="Vérifié" />}
              {post.author_badges.map((b) => {
                const meta = BADGE_LABELS[b];
                if (!meta) return null;
                const Icon = meta.Icon;
                return <Icon key={b} size={13} className="post-card-badge" aria-label={meta.label} />;
              })}
            </span>
            <span className="post-card-meta">
              {post.type === 'seeking_members' ? 'Cherche des membres' : 'Cherche une tontine'}
              {post.tontine_type && ` · ${post.tontine_type === 'rotative' ? 'Rotative' : 'Épargne'}`}
            </span>
          </div>
        </div>

        <div className="post-card-menu-wrap">
          <button className="post-card-menu-btn" onClick={() => setShowMenu((v) => !v)} aria-label="Options">
            <MoreVertical size={18} />
          </button>
          {showMenu && (
            <div className="post-card-menu" onMouseLeave={() => setShowMenu(false)}>
              <button onClick={sharePost}>
                <Share2 size={14} /> Partager
              </button>
              {isOwn ? (
                <>
                  {post.type === 'seeking_members' && (
                    <button onClick={() => navigate(`/feed/${post.id}/requests`)}>
                      Voir les demandes
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowEdit(true);
                    }}
                  >
                    Modifier
                  </button>
                  <button className="post-card-menu-danger" onClick={confirmDelete}>
                    Supprimer
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowReport(true);
                  }}
                >
                  Signaler
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <h3 className="post-card-title">{post.title}</h3>
      <p className="post-card-desc">{post.description}</p>

      {post.media_urls.length > 0 && (
        <div className={`post-card-media${post.media_urls.length > 1 ? ' post-card-media-gallery' : ''}`}>
          {post.media_urls.map((url, i) =>
            post.media_type === 'video' ? (
              <video key={url} src={url} controls />
            ) : (
              <img key={url} src={url} alt={`Photo ${i + 1}`} />
            ),
          )}
        </div>
      )}

      <div className="post-card-stats">
        {/* != (pas !==) exclut délibérément null ET undefined : une annonce
            "je cherche une tontine" n'a pas de montant, le backend envoie
            `null` en JSON, pas `undefined`. */}
        {post.amount != null && (
          <span>
            <Wallet size={15} /> {post.amount.toLocaleString('fr-FR')} FCFA
          </span>
        )}
        {post.frequency && (
          <span>
            <Repeat2 size={15} /> {FREQUENCY_LABELS[post.frequency] ?? post.frequency}
          </span>
        )}
        {slotsLeft !== undefined && (
          <span>
            <Users size={15} /> {slotsLeft} place{slotsLeft > 1 ? 's' : ''} restante{slotsLeft > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="post-card-actions">
        <button className={`post-card-action${post.liked_by_me ? ' post-card-action-active' : ''}`} onClick={() => like.mutate()}>
          <Heart size={17} fill={post.liked_by_me ? 'currentColor' : 'none'} /> {post.likes_count}
        </button>
        <button className="post-card-action" onClick={() => setShowComments(true)}>
          <MessageCircle size={17} /> {post.comments_count}
        </button>
        {!isOwn && post.type === 'seeking_members' && post.status === 'open' && (
          <button
            className="post-card-join"
            disabled={post.has_pending_request}
            onClick={() => setShowJoin(true)}
          >
            {post.has_pending_request ? 'Demande envoyée' : 'Rejoindre'}
          </button>
        )}
      </div>

      {showComments && <CommentsSheet post={post} onClose={() => setShowComments(false)} />}
      {showJoin && <JoinFlowModal post={post} onClose={() => setShowJoin(false)} />}
      {showReport && (
        <ReportModal
          title="Signaler cette annonce"
          reasons={REPORT_REASONS}
          onSubmit={(reason, details) => feedApi.report(post.id, reason, details || undefined)}
          onClose={() => setShowReport(false)}
        />
      )}
      {showEdit && <CreatePostModal post={post} onClose={() => setShowEdit(false)} />}
    </article>
  );
}

type FeedListInfiniteData = { pages: FeedPage[]; pageParams: unknown[] };

function patchPost(old: FeedListInfiniteData | undefined, updated: FeedPost): FeedListInfiniteData | undefined {
  if (!old?.pages) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      posts: page.posts.map((p) => (p.id === updated.id ? updated : p)),
    })),
  };
}
