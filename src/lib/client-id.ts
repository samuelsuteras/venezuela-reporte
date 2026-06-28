const KEY = "reporteve_client_id";

/**
 * Stable per-browser id, persisted in localStorage. Used to dedupe public flags
 * (one flag per report per browser). Not an account — just a soft identifier.
 * Call only in the browser (event handlers).
 */
export function getClientId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
