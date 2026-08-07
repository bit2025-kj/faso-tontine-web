import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import Modal from '../../components/Modal';
import type { Poll } from './types';

const MAX_OPTIONS = 8;

export default function CreatePollModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (poll: Poll) => void;
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit = question.trim().length > 0 && trimmedOptions.length >= 2;

  function setOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  function addOption() {
    setOptions((prev) => (prev.length < MAX_OPTIONS ? [...prev, ''] : prev));
  }

  function removeOption(i: number) {
    setOptions((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onCreate({
      question: question.trim(),
      options: trimmedOptions.map((text) => ({ text, voter_ids: [] })),
      closed: false,
    });
  }

  return (
    <Modal title="Créer un sondage" onClose={onClose}>
      <form className="create-post-form" onSubmit={submit}>
        <label className="create-post-field">
          <span>Question</span>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={200} required autoFocus />
        </label>

        <label className="create-post-field">
          <span>Options ({options.length}/{MAX_OPTIONS})</span>
        </label>
        {options.map((opt, i) => (
          <div key={i} className="poll-option-row">
            <input
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              maxLength={100}
            />
            {options.length > 2 && (
              <button type="button" onClick={() => removeOption(i)} aria-label="Retirer cette option">
                <X size={15} />
              </button>
            )}
          </div>
        ))}
        {options.length < MAX_OPTIONS && (
          <button type="button" className="poll-add-option" onClick={addOption}>
            <Plus size={15} /> Ajouter une option
          </button>
        )}

        <button className="create-post-submit" type="submit" disabled={!canSubmit}>
          Publier le sondage
        </button>
      </form>
    </Modal>
  );
}
