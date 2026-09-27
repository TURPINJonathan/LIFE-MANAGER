import {
  BUTTON_VARIANT,
  DIALOG_SIZE,
  ICON_BUTTON_VARIANT,
  LOGO_VARIANT,
  NAV_ITEM_VARIANT,
  POPOVER_PLACEMENT,
  SPINNER_VARIANT,
  TYPOGRAPHY_VARIANT,
  TYPOGRAPHY_WEIGHT,
  USER_THEME,
} from '@constants';

export type ButtonVariant = (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];
export type DialogSize = (typeof DIALOG_SIZE)[keyof typeof DIALOG_SIZE];
export type IconButtonVariant = (typeof ICON_BUTTON_VARIANT)[keyof typeof ICON_BUTTON_VARIANT];
export type LogoVariant = (typeof LOGO_VARIANT)[keyof typeof LOGO_VARIANT];
export type NavItemVariant = (typeof NAV_ITEM_VARIANT)[keyof typeof NAV_ITEM_VARIANT];
export type PopoverPlacement = (typeof POPOVER_PLACEMENT)[keyof typeof POPOVER_PLACEMENT];
export type SpinnerVariant = (typeof SPINNER_VARIANT)[keyof typeof SPINNER_VARIANT];
export type TypographyVariant = (typeof TYPOGRAPHY_VARIANT)[keyof typeof TYPOGRAPHY_VARIANT];
export type TypographyWeight = keyof typeof TYPOGRAPHY_WEIGHT;
export type TypographyElement = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
export type UserTheme = (typeof USER_THEME)[keyof typeof USER_THEME];
