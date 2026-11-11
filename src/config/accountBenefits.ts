/**
 * What an account gives, limited to what the app implements:
 * - full reading and listening for practitioners (visitors get excerpts and
 *   one-minute previews);
 * - progress saved against the account (completions and listening position);
 * - the daily practice email, on by default, with an on/off switch and a
 *   delivery time in Account > Email.
 * Do not add benefits here that the product does not deliver.
 */
export const ACCOUNT_BENEFITS = [
  'Every exploration and meditation, in full',
  'Progress saved to your account, so you pick up where you left off',
  'An optional daily practice email, at a time you choose',
] as const
