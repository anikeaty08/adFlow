import { apiRequest } from '@/lib/api/client';

type UploadSignature = {
  uploadUrl: string;
  fields: Record<string, string | number>;
  constraints: { allowedMimeTypes: string[]; maxBytes: number };
};

type CloudinaryUpload = { public_id: string };

export async function uploadCreative(file: File, destinationUrl: string, headline?: string, body?: string) {
  const signed = await apiRequest<UploadSignature>('/api/v1/creatives/upload-url', { method: 'POST' });
  if (!signed.constraints.allowedMimeTypes.includes(file.type) || file.size > signed.constraints.maxBytes)
    throw new Error('Creative must be a PNG, JPEG, or WebP smaller than 5 MB.');
  const formData = new FormData();
  Object.entries(signed.fields).forEach(([key, value]) => formData.append(key, String(value)));
  formData.append('file', file);
  const uploadResponse = await fetch(signed.uploadUrl, { body: formData, method: 'POST' });
  if (!uploadResponse.ok) throw new Error('Cloudinary rejected the creative upload.');
  const uploaded = (await uploadResponse.json()) as CloudinaryUpload;
  return apiRequest('/api/v1/creatives/complete', {
    body: JSON.stringify({ publicId: uploaded.public_id, destinationUrl, headline, body }),
    method: 'POST',
  });
}
