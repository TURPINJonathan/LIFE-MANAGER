import type { CREATE_ENTRY_STATUS } from '@constants';

export interface INavItem {
  to: string;
  label: string;
  icon: string;
  title?: string;
}

export interface INavAction {
  icon: string;
  label: string;
  onClick: () => void;
}

interface ICreateEntryBase {
  key: string;
  label: string;
  icon: string;
}

export interface ICreateRouteEntry extends ICreateEntryBase {
  status: typeof CREATE_ENTRY_STATUS.available;
  to: string;
}

export interface ICreateSoonEntry extends ICreateEntryBase {
  status: typeof CREATE_ENTRY_STATUS.soon;
}

export type CreateEntry = ICreateRouteEntry | ICreateSoonEntry;
