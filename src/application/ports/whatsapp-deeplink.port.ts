/**
 * WhatsApp deep-link port (output boundary).
 *
 * The offline-first app has no server, so it cannot attach files or send
 * messages programmatically. Instead it opens the official wa.me link, which
 * launches WhatsApp with a pre-filled text message. Swap for the Meta Cloud
 * API / Twilio adapter if a backend is ever introduced.
 */
export interface WhatsAppDeepLinkBuilder {
  /** Builds a wa.me URL for `to` (international phone number) with `message` pre-filled. */
  build(to: string, message: string): string;
}