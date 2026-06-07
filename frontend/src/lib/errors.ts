import { ApiError } from '@/lib/api';
import { showAppAlert } from '@/lib/app-alert';

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

export function showErrorAlert(err: unknown, fallback: string, title = 'Error'): void {
  showAppAlert(title, getErrorMessage(err, fallback));
}
