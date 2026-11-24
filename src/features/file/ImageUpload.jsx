import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { IMAGE_ACCEPT, IMAGE_MAX_BYTES, uploadImage, useFileUrl } from './files.js';

/** Picks an image, uploads it at once and reports the new file id (or null when removed). */
export default function ImageUpload({ value, onChange, folder, onError, label = 'image' }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const url = useFileUrl(value);

  async function pick(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!IMAGE_ACCEPT.split(',').includes(file.type)) {
      onError?.('Use a PNG, JPG, WEBP or GIF image');
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      onError?.('Use an image up to 2 MB');
      return;
    }
    setBusy(true);
    try {
      const saved = await uploadImage(file, folder);
      onError?.(null);
      onChange(saved.id);
    } catch (error) {
      onError?.(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="image-upload">
      <div className="image-upload-preview" aria-hidden={!url}>
        {url ? <img src={url} alt="" /> : <ImagePlus />}
      </div>
      <div className="image-upload-actions">
        <Button variant="ghost" loading={busy} onClick={() => input.current?.click()}>
          {value ? 'Change' : 'Upload'} {label}
        </Button>
        {value && !busy && (
          <Button variant="ghost" onClick={() => onChange(null)} aria-label={`Remove ${label}`}>
            <Trash2 />
          </Button>
        )}
        <span className="field-help">PNG, JPG, WEBP or GIF, up to 2 MB.</span>
      </div>
      <input ref={input} type="file" accept={IMAGE_ACCEPT} hidden onChange={pick} />
    </div>
  );
}

/** A small thumbnail for lists. */
export function FileThumb({ fileId }) {
  const url = useFileUrl(fileId);
  return <span className="file-thumb">{url ? <img src={url} alt="" /> : null}</span>;
}
