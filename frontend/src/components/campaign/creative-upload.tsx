'use client';

import { IconPhotoUp } from '@tabler/icons-react';
import { useState } from 'react';
import { uploadCreative } from '@/lib/cloudinary/creative-upload';

export function CreativeUpload() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'complete' | 'error'>('idle');
  const [message, setMessage] = useState('Upload a PNG, JPEG, or WebP under 5 MB.');
  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus('uploading');
    setMessage('Uploading directly to Cloudinary...');
    try {
      await uploadCreative(file, 'https://product.dev', 'Developer API Launch');
      setStatus('complete');
      setMessage('Creative verified and ready for campaign attachment.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Creative upload failed.');
    }
  }
  return (
    <label
      style={{
        border: '1px dashed var(--line-strong)',
        borderRadius: 12,
        color: 'var(--muted)',
        display: 'grid',
        gap: 8,
        padding: '1.2rem',
      }}
    >
      <span
        style={{
          alignItems: 'center',
          color: status === 'complete' ? 'var(--accent)' : 'var(--ink)',
          display: 'flex',
          fontWeight: 700,
          gap: 8,
        }}
      >
        <IconPhotoUp size={20} /> Campaign creative
      </span>
      <span>{message}</span>
      <input
        accept="image/png,image/jpeg,image/webp"
        disabled={status === 'uploading'}
        onChange={onFileChange}
        style={{ width: 'auto' }}
        type="file"
      />
    </label>
  );
}
