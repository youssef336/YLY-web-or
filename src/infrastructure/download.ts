import { APP_CONFIG } from '@/infrastructure/config';

/** Triggers a browser download of the exported workbook. */
export function downloadWorkbook(bytes: Uint8Array): void {
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = APP_CONFIG.EXPORT_FILENAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
