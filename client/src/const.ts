export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Start the GitHub OAuth login flow from a user event. */
export const startLogin = () => {
  window.location.href = "/api/auth/github";
};
