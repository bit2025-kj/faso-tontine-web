import { useInfiniteQuery } from '@tanstack/react-query';
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import CreatePostModal from './CreatePostModal';
import { fetchFeedPage } from './feed-api';
import FeedFilterModal from './FeedFilterModal';
import PostCard from './PostCard';
import type { FeedFilters } from './types';
import './feed.css';

const TABS: { key: FeedFilters['type'] | 'all'; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'seeking_members', label: 'Membres' },
  { key: 'seeking_tontine', label: 'Tontines' },
];

export default function FeedPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all');
  const [advanced, setAdvanced] = useState<Pick<FeedFilters, 'tontine_type' | 'min_amount' | 'max_amount'>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filters: FeedFilters = { ...advanced, ...(tab === 'all' ? {} : { type: tab }) };
  const activeFilterCount = Object.values(advanced).filter((v) => v !== undefined).length;

  const query = useInfiniteQuery({
    queryKey: ['feed', filters],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam, filters),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const pages = query.data?.pages;
  const allPosts = useMemo(() => pages?.flatMap((p) => p.posts) ?? [], [pages]);
  // Backend has no free-text search param — filtered client-side over the
  // already-loaded pages, same approach as the mobile app's search delegate.
  const posts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPosts;
    return allPosts.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }, [allPosts, search]);

  return (
    <div className="feed-page">
      <div className="feed-page-header">
        <div>
          <h2>Découvrir</h2>
          <p className="feed-page-subtitle">Trouvez des tontines fiables et des membres sérieux</p>
        </div>
        <div className="feed-page-header-actions">
          <button
            className={`feed-icon-btn${showSearch ? ' feed-icon-btn-active' : ''}`}
            onClick={() => setShowSearch((v) => !v)}
            aria-label="Rechercher"
          >
            <Search size={19} />
          </button>
          <button
            className={`feed-icon-btn${activeFilterCount > 0 ? ' feed-icon-btn-active' : ''}`}
            onClick={() => setShowFilters(true)}
            aria-label="Filtres"
          >
            <SlidersHorizontal size={19} />
            {activeFilterCount > 0 && <span className="feed-icon-btn-badge">{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="feed-search">
          <Search size={16} />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une annonce…"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Effacer">
              <X size={15} />
            </button>
          )}
        </div>
      )}

      <div className="feed-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`feed-tab${tab === t.key ? ' feed-tab-active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {query.isLoading && <p className="feed-status">Chargement…</p>}
      {query.isError && <p className="feed-status feed-status-error">Impossible de charger le fil. Réessayez.</p>}
      {!query.isLoading && posts.length === 0 && (
        <p className="feed-status">
          {search ? `Aucune annonce ne correspond à « ${search} ».` : 'Aucune annonce pour le moment. Soyez le premier à publier !'}
        </p>
      )}

      <div className="feed-list">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={user?.id} />
        ))}
      </div>

      <div ref={sentinelRef} />
      {query.isFetchingNextPage && <p className="feed-status">Chargement…</p>}

      <button className="feed-fab" onClick={() => setShowCreate(true)}>
        <Plus size={19} /> Publier
      </button>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
      {showFilters && (
        <FeedFilterModal
          value={advanced}
          onApply={(next) => {
            setAdvanced(next);
            setShowFilters(false);
          }}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
