import { v2 as cloudinary } from 'cloudinary';
import { DomainError } from '@adflow/shared';
import type { Config } from '../../config.js';

export class CloudinaryCreativeStorage {
  constructor(private readonly config: Config) {
    if (config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET)
      cloudinary.config({
        cloud_name: config.CLOUDINARY_CLOUD_NAME,
        api_key: config.CLOUDINARY_API_KEY,
        api_secret: config.CLOUDINARY_API_SECRET,
        secure: true,
      });
  }

  createDirectUploadSignature() {
    if (
      !this.config.CLOUDINARY_API_SECRET ||
      !this.config.CLOUDINARY_API_KEY ||
      !this.config.CLOUDINARY_CLOUD_NAME
    )
      throw new DomainError('CLOUDINARY_UNCONFIGURED', 'Cloudinary creative storage is not configured.');
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { folder: this.config.CLOUDINARY_FOLDER, timestamp },
      this.config.CLOUDINARY_API_SECRET,
    );
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.config.CLOUDINARY_CLOUD_NAME}/image/upload`,
      fields: {
        api_key: this.config.CLOUDINARY_API_KEY,
        timestamp,
        folder: this.config.CLOUDINARY_FOLDER,
        signature,
      },
    };
  }

  async verifyUploadedImage(publicId: string) {
    if (!this.config.CLOUDINARY_API_SECRET)
      throw new DomainError('CLOUDINARY_UNCONFIGURED', 'Cloudinary creative storage is not configured.');
    try {
      const asset = await cloudinary.api.resource(publicId, { resource_type: 'image' });
      if (!asset.public_id.startsWith(`${this.config.CLOUDINARY_FOLDER}/`))
        throw new DomainError(
          'INVALID_CREATIVE',
          'Creative does not belong to the AdFlow Cloudinary folder.',
        );
      if (
        !['image/png', 'image/jpeg', 'image/webp'].includes(
          asset.format === 'jpg' ? 'image/jpeg' : `image/${asset.format}`,
        )
      )
        throw new DomainError('INVALID_CREATIVE', 'Creative format is not allowed.');
      if (asset.bytes > 5_000_000 || !asset.width || !asset.height)
        throw new DomainError('INVALID_CREATIVE', 'Creative dimensions or file size are invalid.');
      return {
        publicId: asset.public_id,
        assetUrl: asset.secure_url,
        mimeType: asset.format === 'jpg' ? 'image/jpeg' : `image/${asset.format}`,
        bytes: asset.bytes,
        width: asset.width,
        height: asset.height,
      };
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw new DomainError('INVALID_CREATIVE', 'Cloudinary could not verify the uploaded creative.');
    }
  }

  async destroy(publicId: string) {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  }
}
