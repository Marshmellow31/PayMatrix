import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';
import { saveLogCatalogItem } from '../../services/logCatalogService.js';
export default function LogCatalogModal({ isOpen, onClose, catalog }) {
  const [kind, setKind] = useState('account');
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const items = kind === 'account' ? catalog.accounts : catalog.categories;
  const save = async (item, changes) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await saveLogCatalogItem(kind, item, changes);
      setEditing(null);
      setName('');
    } catch (err) {
      setError(err.message || 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Accounts and categories"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 p-1">
          {['account', 'category'].map((value) => (
            <button
              key={value}
              disabled={busy}
              type="button"
              aria-pressed={kind === value}
              onClick={() => {
                setKind(value);
                setEditing(null);
                setName('');
                setError('');
              }}
              className={`min-h-11 rounded-lg text-sm font-medium ${kind === value ? 'bg-white text-black' : 'text-white/70'}`}
            >
              {value === 'account' ? 'Accounts' : 'Categories'}
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-white/60">
          Personal to your account. Renaming keeps the same ID. Archive unused items to hide them
          from new transactions; existing records keep their saved labels.
        </p>
        {catalog.error && (
          <p role="alert" className="text-sm text-error">
            {catalog.error}
          </p>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            save(editing, { name });
          }}
        >
          <div className="min-w-0 flex-1">
            <Input
              label={editing ? 'Rename' : `New ${kind}`}
              value={name}
              maxLength={50}
              required
              disabled={busy || catalog.loading || !!catalog.error}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy || catalog.loading || !!catalog.error}>
            {editing ? 'Save' : 'Create'}
          </Button>
          {editing && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setName('');
              }}
              className="min-h-11 px-2 text-xs text-white/70"
            >
              Cancel
            </button>
          )}
        </form>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <div className="divide-y divide-white/10">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm text-white">{item.name}</p>
                {item.archived && <p className="text-xs text-white/60">Archived</p>}
              </div>
              <button
                type="button"
                disabled={busy || catalog.loading || !!catalog.error}
                onClick={() => {
                  setEditing(item);
                  setName(item.name);
                }}
                className="min-h-11 px-2 text-xs text-white/70 disabled:opacity-50"
              >
                Rename
              </button>
              <button
                type="button"
                disabled={busy || catalog.loading || !!catalog.error}
                onClick={() => save(item, { archived: !item.archived })}
                className="min-h-11 px-2 text-xs text-white/70 disabled:opacity-50"
              >
                {item.archived ? 'Restore' : 'Archive'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
