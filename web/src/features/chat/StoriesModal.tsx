import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Modal from '../../components/Modal';
import { ApiError } from '../../lib/api';
import { chatApi } from './chat-api';

export default function StoriesModal({ conversationId, onClose }: { conversationId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stories = useQuery({
    queryKey: ['chat', conversationId, 'stories'],
    queryFn: () => chatApi.listStories(conversationId),
  });

  const create = useMutation({
    mutationFn: async () => {
      let media_url: string | undefined;
      if (file) {
        const uploaded = await chatApi.uploadMedia(file, 'image');
        media_url = uploaded.url;
      }
      return chatApi.createStory(conversationId, { media_url, text: text.trim() || undefined });
    },
    onMutate: () => setError(null),
    onSuccess: () => {
      setText('');
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ['chat', conversationId, 'stories'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Publication impossible — réessayez.'),
  });

  return (
    <Modal title="Stories du groupe" onClose={onClose}>
      <form
        className="stories-create"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim() || file) create.mutate();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Un mot pour la story (optionnel)…"
          maxLength={200}
        />
        <label className="stories-file-btn">
          {file ? file.name : 'Ajouter une photo'}
          <input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <button type="submit" disabled={create.isPending || (!text.trim() && !file)}>
          {create.isPending ? 'Publication…' : 'Publier une story (24h)'}
        </button>
      </form>

      {error && <p className="proposals-error">{error}</p>}

      <div className="stories-list">
        {stories.isLoading && <p className="feed-status">Chargement…</p>}
        {stories.data?.length === 0 && <p className="feed-status">Aucune story active dans ce groupe.</p>}
        {stories.data?.map((s) => (
          <div key={s.id} className="story-row">
            {s.media_url && <img src={s.media_url} alt="" />}
            <div>
              <strong>{s.author_name}</strong>
              {s.text && <p>{s.text}</p>}
              <span className="story-expiry">Expire le {new Date(s.expires_at).toLocaleString('fr-FR')}</span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
