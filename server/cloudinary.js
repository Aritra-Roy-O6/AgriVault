import { v2 as cloudinary } from "cloudinary";

const configured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function ensureConfigured() {
  if (!configured) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }
}

function bufferToDataUri(buffer, mimetype) {
  return `data:${mimetype};base64,${buffer.toString("base64")}`;
}

export async function uploadBufferToCloudinary({ buffer, mimetype, folder = "vaultx", publicId, tags = [] }) {
  ensureConfigured();

  const result = await cloudinary.uploader.upload(bufferToDataUri(buffer, mimetype), {
    folder,
    public_id: publicId,
    resource_type: "image",
    tags,
  });

  return {
    assetId: result.asset_id,
    publicId: result.public_id,
    url: result.secure_url,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
    createdAt: result.created_at,
    folder,
  };
}

export function isCloudinaryConfigured() {
  return configured;
}
