import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useState } from 'react';
import Modal from '../../components/Modal';
import { ApiError } from '../../lib/api';
import { feedApi } from './feed-api';
import type { FeedPost } from './types';

// Valeurs alignées sur FeedPostCreate.valid_frequency côté backend
// (backend/app/schemas/feed.py) : seules ces 5 clés anglaises sont acceptées.
const FREQUENCIES = [
  { value: 'daily', label: 'Journalière' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'biweekly', label: 'Bimensuelle' },
  { value: 'monthly', label: 'Mensuelle' },
  { value: 'quarterly', label: 'Trimestrielle' },
];

const MAX_MEDIA = 4;

export default function CreatePostModal({ post, onClose }: { post?: FeedPost; onClose: () => void }) {
  const isEdit = Boolean(post);
  const queryClient = useQueryClient();
  const [type, setType] = useState<'seeking_members' | 'seeking_tontine'>(post?.type ?? 'seeking_tontine');
  const [title, setTitle] = useState(post?.title ?? '');
  const [description, setDescription] = useState(post?.description ?? '');
  const [tontineType, setTontineType] = useState<'rotative' | 'epargne'>(post?.tontine_type ?? 'rotative');
  const [amount, setAmount] = useState(post?.amount?.toString() ?? '');
  const [frequency, setFrequency] = useState(post?.frequency ?? 'monthly');
  const [slotsTotal, setSlotsTotal] = useState(post?.slots_total?.toString() ?? '');
  // Existing media (edit mode) and newly-picked files are tracked separately
  // so we can show/remove each existing photo individually instead of
  // blindly replacing the whole set — that used to silently drop existing
  // photos whenever a new one was added.
  const [existingMedia, setExistingMedia] = useState<string[]>(post?.media_urls ?? []);
  const [newMedia, setNewMedia] = useState<File[]>([]);
  const totalMedia = existingMedia.length + newMedia.length;

  function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_MEDIA - totalMedia;
    if (room <= 0) return;
    setNewMedia((prev) => [...prev, ...Array.from(files).slice(0, room)]);
  }

  function removeExisting(url: string) {
    setExistingMedia((prev) => prev.filter((u) => u !== url));
  }

  function removeNew(index: number) {
    setNewMedia((prev) => prev.filter((_, i) => i !== index));
  }

  const save = useMutation({
    mutationFn: async () => {
      let media_urls: string[] = existingMedia;
      let media_type: string | undefined = post?.media_type;
      if (newMedia.length > 0) {
        const uploaded = await Promise.all(newMedia.map((file) => feedApi.uploadMedia(file)));
        media_urls = [...existingMedia, ...uploaded.map((u) => u.url)];
        media_type = uploaded[0]?.media_type ?? media_type;
      }
      const body = {
        type,
        title,
        description,
        tontine_type: tontineType,
        amount: amount ? Number(amount) : undefined,
        frequency,
        slots_total: slotsTotal ? Number(slotsTotal) : undefined,
        media_urls,
        media_type,
      };
      return isEdit ? feedApi.update(post!.id, body) : feedApi.create(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      onClose();
    },
  });

  return (
    <Modal title={isEdit ? "Modifier l'annonce" : 'Publier une annonce'} onClose={onClose}>
      <form
        className="create-post-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="create-post-type-toggle">
          <button
            type="button"
            className={type === 'seeking_tontine' ? 'active' : ''}
            onClick={() => setType('seeking_tontine')}
          >
            Je cherche une tontine
          </button>
          <button
            type="button"
            className={type === 'seeking_members' ? 'active' : ''}
            onClick={() => setType('seeking_members')}
          >
            Je cherche des membres
          </button>
        </div>

        <label className="create-post-field">
          <span>Titre</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} minLength={5} maxLength={120} required />
        </label>

        <label className="create-post-field">
          <span>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minLength={10}
            maxLength={1000}
            rows={4}
            required
          />
        </label>

        <div className="create-post-row">
          <label className="create-post-field">
            <span>Type de tontine</span>
            <select value={tontineType} onChange={(e) => setTontineType(e.target.value as 'rotative' | 'epargne')}>
              <option value="rotative">Rotative</option>
              <option value="epargne">Épargne</option>
            </select>
          </label>
          <label className="create-post-field">
            <span>Fréquence</span>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="create-post-row">
          <label className="create-post-field">
            <span>Montant (FCFA)</span>
            <input type="number" min={100} max={10_000_000} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          {type === 'seeking_members' && (
            <label className="create-post-field">
              <span>Places disponibles</span>
              <input type="number" min={2} max={500} value={slotsTotal} onChange={(e) => setSlotsTotal(e.target.value)} />
            </label>
          )}
        </div>

        <label className="create-post-field">
          <span>Photos/vidéos ({totalMedia}/{MAX_MEDIA})</span>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            disabled={totalMedia >= MAX_MEDIA}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        {(existingMedia.length > 0 || newMedia.length > 0) && (
          <div className="create-post-media-preview">
            {existingMedia.map((url) => (
              <div key={url} className="create-post-media-thumb">
                <img src={url} alt="" />
                <button type="button" onClick={() => removeExisting(url)} aria-label="Retirer cette photo">
                  <X size={14} />
                </button>
              </div>
            ))}
            {newMedia.map((file, i) => (
              <div key={`${file.name}-${i}`} className="create-post-media-thumb">
                <img src={URL.createObjectURL(file)} alt="" />
                <button type="button" onClick={() => removeNew(i)} aria-label="Retirer cette photo">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {save.isError && (
          <p className="create-post-error">
            {save.error instanceof ApiError ? save.error.message : 'Publication impossible.'}
          </p>
        )}

        <button className="create-post-submit" type="submit" disabled={save.isPending}>
          {save.isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Publier'}
        </button>
      </form>
    </Modal>
  );
}
