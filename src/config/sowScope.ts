/**
 * Features the demo has built that are NOT in the signed scope
 * (Internal SOW, NFF / iProgrammer, v1.3).
 *
 * Each one is switched off here instead of being deleted, so it can come back
 * if it is added to the SOW (or a later phase) by changing one value. While a
 * value is false the feature does not render and its routes do not exist.
 *
 * SOW references are to Part 1 unless stated.
 */
export const SOW_SCOPE = {
  /**
   * Forgot / reset password. SOW §3.2 #1–2: sign-in is email plus one-time
   * code; "No password is set or stored". (The OTP sign-in itself is not
   * built yet; the demo still signs in with a password.)
   */
  passwordReset: false,

  /**
   * Search boxes in the Practitioner library and meditations.
   * SOW §4 Out of scope: "Site-wide search … Not in this phase".
   */
  librarySearch: false,

  /**
   * Creating more campaigns beyond the one daily email.
   * SOW §3.4 #3: "One daily campaign; one-off broadcast campaigns are not
   * included".
   */
  additionalCampaigns: false,

  /**
   * Account > Preferences (default playback speed). SOW §3.2 #4 profile is
   * name, time zone and email preferences only. Speed control in the player
   * itself stays (§3.2 #7).
   */
  playbackPreferences: false,

  /**
   * Content owner and collaborators panel in the CMS editor. Not in §3.3
   * (content editor) or §3.5 (super admin).
   */
  contentOwnership: false,

  /**
   * "Assigned on" and "Due" dates on learning paths. The SOW has no
   * assignments or deadlines; every practitioner has all content (§5).
   */
  assignmentDates: false,
} as const
