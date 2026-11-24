// The access token lives only in memory: it disappears on refresh and is restored from the
// httpOnly refresh cookie, so it is never readable from localStorage by injected scripts.
let accessToken = null;

export const tokenStore = {
  get: () => accessToken,
  set: (token) => {
    accessToken = token || null;
  },
  clear: () => {
    accessToken = null;
  },
};
