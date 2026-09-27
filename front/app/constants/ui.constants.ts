export const BUTTON_VARIANT = {
  primary: 'primary',
  secondary: 'secondary',
  neutral: 'neutral',
  ghost: 'ghost',
  danger: 'danger',
  backdrop: 'backdrop',
} as const;

const BUTTON_BASE_CLASSES =
  'flex h-12 cursor-pointer items-center justify-center gap-2 rounded-control text-body font-semibold transition-[background,transform] duration-(--duration-fast) active:not-disabled:scale-[0.98] disabled:cursor-not-allowed';

export const BUTTON_VARIANT_CLASSES: Record<(typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT], string> = {
  primary: `${BUTTON_BASE_CLASSES} bg-accent text-white hover:not-disabled:bg-accent-hover active:not-disabled:bg-accent-press disabled:bg-disabled`,
  secondary: `${BUTTON_BASE_CLASSES} border border-accent text-accent-press bg-transparent hover:not-disabled:bg-accent-tint active:not-disabled:bg-accent-tint disabled:border-disabled-border disabled:text-disabled-fg dark:text-accent dark:hover:not-disabled:bg-accent-ghost`,
  neutral: `${BUTTON_BASE_CLASSES} border border-border bg-transparent text-fg-primary hover:not-disabled:bg-subtle dark:hover:not-disabled:bg-elevated active:not-disabled:bg-border-subtle disabled:border-disabled-border disabled:text-disabled-fg`,
  ghost: `${BUTTON_BASE_CLASSES} bg-transparent text-fg-secondary hover:not-disabled:bg-subtle dark:hover:not-disabled:bg-elevated active:not-disabled:bg-border-subtle disabled:text-fg-muted`,
  danger: `${BUTTON_BASE_CLASSES} bg-error text-white hover:not-disabled:bg-error/90 active:not-disabled:bg-error/80 disabled:bg-disabled`,
  backdrop: 'absolute inset-0 animate-fade-in cursor-default bg-deep/50',
};

export const ICON_BUTTON_VARIANT = {
  accent: 'accent',
  ghost: 'ghost',
} as const;

export const ICON_BUTTON_VARIANT_CLASSES: Record<
  (typeof ICON_BUTTON_VARIANT)[keyof typeof ICON_BUTTON_VARIANT],
  string
> = {
  accent:
    'border border-accent-outline bg-accent-subtle text-accent shadow-sm hover:not-disabled:border-accent hover:not-disabled:bg-accent hover:not-disabled:text-white',
  ghost:
    'bg-transparent text-fg-secondary hover:not-disabled:bg-subtle dark:hover:not-disabled:bg-elevated hover:not-disabled:text-fg-primary disabled:text-fg-muted',
};

export const LOGO_VARIANT = {
  wordmark: 'wordmark',
  mark: 'mark',
} as const;

export const DIALOG_SIZE = {
  default: 'default',
  large: 'large',
} as const;

const DIALOG_PANEL_BASE_CLASSES =
  'relative flex max-h-[92dvh] w-full animate-art-in flex-col rounded-t-panel bg-card p-6 shadow-lg md:max-h-[85dvh] md:rounded-panel';

export const DIALOG_SIZE_CLASSES: Record<(typeof DIALOG_SIZE)[keyof typeof DIALOG_SIZE], string> = {
  default: `${DIALOG_PANEL_BASE_CLASSES} md:max-w-md`,
  large: `${DIALOG_PANEL_BASE_CLASSES} md:max-w-3xl`,
};

export const SPINNER_VARIANT = {
  page: 'page',
  inline: 'inline',
} as const;

export const SPINNER_VARIANT_CLASSES: Record<(typeof SPINNER_VARIANT)[keyof typeof SPINNER_VARIANT], string> = {
  page: 'size-10 border-[3px] border-border border-t-accent',
  inline: 'size-4.5 border-2 border-current/30 border-t-current',
};

export const TYPOGRAPHY_VARIANT = {
  display: 'display',
  headline: 'headline',
  title: 'title',
  body: 'body',
} as const;

export const TYPOGRAPHY_VARIANT_CLASSES: Record<(typeof TYPOGRAPHY_VARIANT)[keyof typeof TYPOGRAPHY_VARIANT], string> =
  {
    display: 'text-display',
    headline: 'text-headline',
    title: 'text-title',
    body: 'text-body',
  };

export const TYPOGRAPHY_WEIGHT = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const;

export const TYPOGRAPHY_VARIANT_DEFAULT_WEIGHT: Record<
  (typeof TYPOGRAPHY_VARIANT)[keyof typeof TYPOGRAPHY_VARIANT],
  keyof typeof TYPOGRAPHY_WEIGHT
> = {
  display: 'bold',
  headline: 'bold',
  title: 'semibold',
  body: 'normal',
};

export const TYPOGRAPHY_VARIANT_ELEMENT: Record<
  (typeof TYPOGRAPHY_VARIANT)[keyof typeof TYPOGRAPHY_VARIANT],
  'h1' | 'h2' | 'p'
> = {
  display: 'h1',
  headline: 'h2',
  title: 'h2',
  body: 'p',
};

export const INPUT_STATE_CLASSES = {
  default:
    'border-border hover:border-border-strong focus-within:border-accent focus-within:shadow-[var(--focus-ring)]',
  error: 'border-error focus-within:shadow-[var(--focus-ring)]',
} as const;

const MENU_ROW_GEOMETRY_CLASSES = 'flex items-center gap-3 rounded-control-sm px-3 py-2.5 text-body';
const MENU_ROW_INTERACTIVE_CLASSES = 'text-fg-secondary hover:bg-page hover:text-fg-primary dark:hover:bg-elevated';

export const MENU_ROW_CLASSES = `${MENU_ROW_GEOMETRY_CLASSES} ${MENU_ROW_INTERACTIVE_CLASSES}`;

export const NAV_ITEM_VARIANT = {
  rail: 'rail',
  tab: 'tab',
} as const;

export const NAV_ITEM_VARIANT_CLASSES: Record<
  (typeof NAV_ITEM_VARIANT)[keyof typeof NAV_ITEM_VARIANT],
  { base: string; iconBox: string }
> = {
  rail: {
    base: 'group flex flex-col items-center gap-1 rounded-control px-0.5 py-1.5 text-center text-control font-medium transition-colors duration-(--duration-fast) md:gap-1.5 md:px-1',
    iconBox: '',
  },
  tab: {
    base: 'group flex min-w-0 flex-col items-center justify-center rounded-control py-0.5 text-control font-medium transition-colors duration-(--duration-fast)',
    iconBox: 'my-0',
  },
};

export const NAV_CONTAINER_CLASSES: Record<(typeof NAV_ITEM_VARIANT)[keyof typeof NAV_ITEM_VARIANT], string> = {
  rail: 'hidden shrink-0 flex-col gap-1 overflow-y-auto px-2 py-5 md:flex md:w-24',
  tab: 'fixed inset-x-0 bottom-0 z-30 grid h-[var(--app-tab-nav-block-size)] grid-cols-5 items-end bg-page px-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] md:hidden',
};

export const NAV_ITEM_ACTIVE = 'text-accent-press dark:text-accent';
export const NAV_ITEM_INACTIVE = 'text-fg-secondary hover:text-fg-primary';

export const NAV_ICON_BOX_BASE =
  'flex h-9 w-12 items-center justify-center rounded-control transition-colors duration-(--duration-fast) md:w-14';
export const NAV_ICON_BOX_ACTIVE = 'bg-accent-tint dark:bg-accent-ghost';
export const NAV_ICON_BOX_INACTIVE = 'group-hover:bg-subtle';

export const NAV_CREATE_ICON_BOX =
  'flex size-8 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-[background-color,transform] duration-(--duration-fast) group-hover:bg-accent-hover group-active:scale-95 md:size-9';

export const POPOVER_PLACEMENT = {
  rightStart: 'right-start',
  bottomEnd: 'bottom-end',
  bottomStart: 'bottom-start',
} as const;

export const POPOVER_OFFSET = 8;

export const POPOVER_PANEL_CLASSES =
  'fixed z-50 flex min-w-56 animate-art-in flex-col overflow-y-auto rounded-panel border border-border bg-card p-2 shadow-lg';

export const CREATE_ENTRY_STATUS = {
  available: 'available',
  soon: 'soon',
} as const;

export const CREATE_MENU_TITLE = 'Créer';
export const CREATE_SOON_BADGE_LABEL = 'Bientôt';

export const CREATE_MENU_ROW_CLASSES = `${MENU_ROW_GEOMETRY_CLASSES} min-h-12 w-full justify-between no-underline`;

export const CREATE_MENU_ROW_STATE_CLASSES: Record<
  (typeof CREATE_ENTRY_STATUS)[keyof typeof CREATE_ENTRY_STATUS],
  string
> = {
  available: MENU_ROW_INTERACTIVE_CLASSES,
  soon: 'cursor-default text-fg-muted',
};

export const CREATE_MENU_BADGE_CLASSES =
  'shrink-0 rounded-full bg-page px-2 py-0.5 text-control text-fg-muted dark:bg-elevated';

export const APP_PAGE_GUTTER_CLASSES = 'px-3 py-3 md:p-6';

export const APP_MAIN_SURFACE_CLASSES =
  'flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-page pb-[var(--app-tab-nav-block-size)] md:m-2 md:mt-0 md:mr-3 md:mb-3 md:ml-0 md:rounded-panel md:bg-card md:pb-0 md:shadow-lg';

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const TABLET_MEDIA_QUERY = '(min-width: 48rem)';

export const COMING_SOON_MESSAGE = 'Bientôt disponible';

export const USER_THEME = {
  light: 'light',
  dark: 'dark',
} as const;

export const THEME_STORAGE_KEY = 'lm.theme';
