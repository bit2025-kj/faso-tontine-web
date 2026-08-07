import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '../auth/auth-context';
import { useNotifications } from '../notifications/notifications-context';

function parseData(event: MessageEvent): any {
  try {
    return JSON.parse(event.data);
  } catch {
    return {};
  }
}

/**
 * Mirrors the Flutter app's TontineEventBus: one SSE connection to the BFF
 * (which itself proxies the backend's /events stream), translated into
 * React Query cache invalidations. No UI of its own — mount once near the
 * root, behind auth. Also feeds the in-app notification inbox (see
 * notifications-context.tsx) for events the user might not be looking at
 * the right screen to notice live.
 */
export default function EventsBridge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { push } = useNotifications();

  useEffect(() => {
    if (!user) return;

    const source = new EventSource('/api/events');
    const invalidate = (...keys: string[][]) => keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));

    const onFeed = () => invalidate(['feed']);
    const onRequestReviewed = (e: MessageEvent) => {
      invalidate(['feed', 'my-requests'], ['participant', 'tontines']);
      const d = parseData(e);
      push({
        title: d.accepted ? 'Demande acceptée' : 'Demande refusée',
        body: `Votre demande pour « ${d.post_title ?? 'une annonce'} » a été ${d.accepted ? 'acceptée' : 'refusée'}.`,
        link: '/requests',
      });
    };
    const onJoinRequest = (e: MessageEvent) => {
      invalidate(['feed', 'post-requests']);
      const d = parseData(e);
      push({
        title: "Nouvelle demande d'adhésion",
        body: `${d.participant_name ?? 'Quelqu’un'} veut rejoindre « ${d.post_title ?? 'votre annonce'} ».`,
        link: d.post_id ? `/feed/${d.post_id}/requests` : '/',
      });
    };
    const onFeedLike = (e: MessageEvent) => {
      onFeed();
      const d = parseData(e);
      push({
        title: 'Nouveau j’aime',
        body: `${d.liker_name ?? 'Quelqu’un'} a aimé « ${d.post_title ?? 'votre annonce'} ».`,
        link: '/',
      });
    };
    const onFeedComment = (e: MessageEvent) => {
      onFeed();
      const d = parseData(e);
      push({
        title: 'Nouveau commentaire',
        body: `${d.author_name ?? 'Quelqu’un'} : ${d.text ?? ''}`,
        link: '/',
      });
    };
    const onTontineUpdated = () => invalidate(['participant', 'tontines']);
    const onRelation = () => invalidate(['relations']);
    const onRelationRequest = (e: MessageEvent) => {
      onRelation();
      const d = parseData(e);
      push({
        title: 'Nouvelle demande de connexion',
        body: `${d.from_user_name ?? 'Quelqu’un'} souhaite se connecter avec vous.`,
        link: '/relations',
      });
    };
    const onRelationAccepted = (e: MessageEvent) => {
      onRelation();
      const d = parseData(e);
      push({
        title: 'Connexion acceptée',
        body: `${d.to_user_name ?? 'Quelqu’un'} a accepté votre demande de connexion.`,
        link: '/relations',
      });
    };

    source.addEventListener('feed_new_post', onFeed);
    source.addEventListener('feed_comment', onFeedComment);
    source.addEventListener('feed_comment_reply', onFeedComment);
    source.addEventListener('feed_like', onFeedLike);
    source.addEventListener('request_reviewed', onRequestReviewed);
    source.addEventListener('join_request', onJoinRequest);
    source.addEventListener('member_added', onTontineUpdated);
    source.addEventListener('sync_required', onTontineUpdated);
    source.addEventListener('tontine_updated', onTontineUpdated);
    source.addEventListener('relation_request', onRelationRequest);
    source.addEventListener('relation_accepted', onRelationAccepted);

    // A dropped-then-reconnecting stream sets readyState back to CONNECTING
    // on its own (the browser retries automatically) — nothing to do there.
    // But a non-2xx response at connect time (e.g. the session was evicted
    // by a BFF restart — the session store is in-memory, see session.service.ts)
    // "fails the connection" per spec: readyState goes CLOSED for good, no
    // further retry. Only that case needs our own recovery: re-check auth
    // so RequireAuth notices the session is gone and redirects to /login
    // instead of this tab silently never receiving another live update.
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      }
    };

    return () => source.close();
  }, [user, queryClient, push]);

  return null;
}
