// Types of the AppBar (components/appBar).

/** Who is signed in, as the user menu shows it: the name (or the email) and the email. */
export interface AppIdentity {
  id: number;
  fullName: string;
  email: string;
}

export interface IdentityProps {
  identity: AppIdentity;
}

export interface InitialsAvatarProps {
  /** Whose initials to show; without it the tile is an empty placeholder. */
  name?: string;
  size?: number;
}

export interface FixedDigitsProps {
  text: string;
}

export interface ClockProps {
  /** Which edge the two lines hug: the controls in the AppBar, the menu's edge in the user menu. */
  align?: 'left' | 'right';
}
