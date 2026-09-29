import { ApiError } from '@services';
import { useUiStore, type ToastTone } from '@store';

export function toastSuccess(message: string): void {
  useUiStore.getState().pushToast(message, 'success');
}

export function toastInfo(message: string): void {
  useUiStore.getState().pushToast(message, 'info');
}

export function toastError(message: string): void {
  useUiStore.getState().pushToast(message, 'error');
}

export function toastFromError(error: unknown, fallback = 'Une erreur est survenue.'): void {
  const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : fallback;
  toastError(message);
}

export function toastToneForStatus(ok: boolean): ToastTone {
  return ok ? 'success' : 'error';
}
