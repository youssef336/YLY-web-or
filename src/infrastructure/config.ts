/**
 * App-wide configuration. Everything lives on-device (offline-first), so
 * there are no server secrets here — just the constant contact details used
 * when building the WhatsApp deep link.
 */
export const APP_CONFIG = {
  /** Team Leader's WhatsApp number, international format, digits only. */
  WHATSAPP_TO: '201100572740',
  /** Human-readable version shown in the link. */
  WHATSAPP_TO_DISPLAY: '+201100572740',
  /** Path (relative to the web root) of the ORMEMBER (OER) template. */
  TEMPLATE_PATH: '/exel need/ORMEMBER (1).xlsx',
  /** Filename used for the exported/downloaded workbook. */
  EXPORT_FILENAME: 'ORMEMBER (1).xlsx',
} as const;
