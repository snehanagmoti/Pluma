export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  import.meta.env.REACT_APP_GOOGLE_CLIENT_ID ||
  "";

export const HAS_GOOGLE_AUTH = Boolean(GOOGLE_CLIENT_ID);
