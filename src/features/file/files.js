import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../services/api.js';

export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** Uploads one image into a server folder; returns { id, name, mimeType, sizeBytes }. */
export function uploadImage(file, folder) {
  const body = new FormData();
  body.append('file', file);
  // The API client defaults to JSON; multipart lets the browser add the boundary.
  return unwrap(
    api.post('/uploads', body, {
      params: { folder },
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
}

/**
 * A browser URL for a stored file. Files need the sign-in token, so the image is fetched with it
 * and shown through an object URL.
 */
export function useFileUrl(fileId) {
  const blob = useQuery({
    queryKey: ['uploads', fileId],
    queryFn: async () => (await api.get(`/uploads/${fileId}`, { responseType: 'blob' })).data,
    enabled: Boolean(fileId),
    staleTime: Infinity,
  });
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob.data) {
      setUrl(null);
      return undefined;
    }
    const next = URL.createObjectURL(blob.data);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob.data]);
  return fileId ? url : null;
}
