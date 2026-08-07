import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useState } from 'react';
import Modal from '../../components/Modal';
import { useAuth } from '../auth/auth-context';
import { feedApi } from './feed-api';
import type { FeedComment, FeedPost } from './types';

export default function CommentsSheet({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<FeedComment | undefined>();

  const comments = useQuery({
    queryKey: ['feed', post.id, 'comments'],
    queryFn: () => feedApi.listComments(post.id),
  });

  const addComment = useMutation({
    mutationFn: (vars: { text: string; parentId?: string }) => feedApi.addComment(post.id, vars.text, vars.parentId),
    onSuccess: () => {
      setText('');
      setReplyTo(undefined);
      comments.refetch();
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const removeComment = useMutation({
    mutationFn: (commentId: string) => feedApi.deleteComment(post.id, commentId),
    onSuccess: () => {
      comments.refetch();
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  function handleDelete(commentId: string) {
    if (window.confirm('Supprimer ce commentaire ?')) {
      removeComment.mutate(commentId);
    }
  }

  const roots = (comments.data ?? []).filter((c) => !c.parent_id);
  const repliesByParent = (comments.data ?? []).reduce<Record<string, FeedComment[]>>((acc, c) => {
    if (c.parent_id) (acc[c.parent_id] ??= []).push(c);
    return acc;
  }, {});

  return (
    <Modal title="Commentaires" onClose={onClose}>
      <div className="comments-list">
        {comments.isLoading && <p>Chargement…</p>}
        {roots.length === 0 && !comments.isLoading && <p className="comments-empty">Aucun commentaire pour l'instant.</p>}
        {roots.map((c) => (
          <div key={c.id} className="comment-block">
            <CommentRow
              comment={c}
              mine={c.author_id === user?.id}
              onReply={() => setReplyTo(c)}
              onDelete={() => handleDelete(c.id)}
            />
            {(repliesByParent[c.id] ?? []).map((r) => (
              <div key={r.id} className="comment-reply">
                <CommentRow comment={r} mine={r.author_id === user?.id} onDelete={() => handleDelete(r.id)} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <form
        className="comments-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          addComment.mutate({ text: text.trim(), parentId: replyTo?.id });
        }}
      >
        {replyTo && (
          <div className="comments-reply-hint">
            Réponse à {replyTo.author_name}
            <button type="button" onClick={() => setReplyTo(undefined)} aria-label="Annuler la réponse">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="comments-input-row">
          <div className="comments-input-avatar">{user?.name.charAt(0)}</div>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ajouter un commentaire…"
            maxLength={500}
          />
          <button type="submit" disabled={!text.trim() || addComment.isPending}>
            Envoyer
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CommentRow({
  comment,
  mine,
  onReply,
  onDelete,
}: {
  comment: FeedComment;
  mine: boolean;
  onReply?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="comment-row">
      <div className="comment-avatar">
        {comment.author_avatar_url ? <img src={comment.author_avatar_url} alt="" /> : comment.author_name.charAt(0)}
      </div>
      <div className="comment-body">
        <span className="comment-author">{comment.author_name}</span>
        <p className="comment-text">{comment.text}</p>
        <div className="comment-actions">
          {onReply && (
            <button className="comment-reply-btn" onClick={onReply}>
              Répondre
            </button>
          )}
          {mine && (
            <button className="comment-reply-btn comment-delete-btn" onClick={onDelete}>
              Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
