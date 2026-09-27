import type { AUTH_STATUS } from '@constants';

export type AuthStatus = (typeof AUTH_STATUS)[keyof typeof AUTH_STATUS];

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
};

export type { CreateEntry, INavAction, INavItem } from './navigation.types';
export type {
  ButtonVariant,
  DialogSize,
  IconButtonVariant,
  LogoVariant,
  NavItemVariant,
  PopoverPlacement,
  SpinnerVariant,
  TypographyElement,
  TypographyVariant,
  TypographyWeight,
  UserTheme,
} from './ui.types';
