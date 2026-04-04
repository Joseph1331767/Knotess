/**
 * Smart URL embed utilities.
 * Detects YouTube, Vimeo, and direct media URLs and returns
 * the appropriate rendering strategy.
 */

export type EmbedType = 'youtube' | 'vimeo' | 'direct-video' | 'direct-audio' | 'iframe';

export interface EmbedInfo {
  type: EmbedType;
  embedUrl: string;
  thumbnailUrl?: string;
}

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;
const VIMEO_REGEX = /(?:vimeo\.com\/)(\d+)/;
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;
const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|flac|aac|m4a)(\?.*)?$/i;

export function getEmbedInfo(url: string): EmbedInfo {
  if (!url) return { type: 'iframe', embedUrl: '' };

  // YouTube
  const ytMatch = url.match(YOUTUBE_REGEX);
  if (ytMatch) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  // Vimeo
  const vimeoMatch = url.match(VIMEO_REGEX);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
    };
  }

  // Direct video file
  if (VIDEO_EXTENSIONS.test(url)) {
    return { type: 'direct-video', embedUrl: url };
  }

  // Direct audio file
  if (AUDIO_EXTENSIONS.test(url)) {
    return { type: 'direct-audio', embedUrl: url };
  }

  // Generic iframe embed
  return { type: 'iframe', embedUrl: url };
}

/**
 * Check if a URL is likely a media URL that should be rendered
 * with special handling rather than a plain iframe.
 */
export function isMediaUrl(url: string): boolean {
  const info = getEmbedInfo(url);
  return info.type !== 'iframe';
}

/**
 * Read a file as base64 data URL.
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
