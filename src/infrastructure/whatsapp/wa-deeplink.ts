import type { WhatsAppDeepLinkBuilder } from '@/application/ports/whatsapp-deeplink.port';

/**
 * Official WhatsApp deep link adapter. No API key, no backend: opens the
 * wa.me URL and WhatsApp does the rest with the message pre-filled.
 */
export class WaMeDeepLinkBuilder implements WhatsAppDeepLinkBuilder {
  build(to: string, message: string): string {
    const digits = to.replace(/\D/g, '');
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }
}