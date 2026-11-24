/**
 * Stages and statuses of a service request, by parameter value (same numbers as the API's
 * utils/requestStatus.js). Compare these values, never ids or codes.
 */
export const REQUEST_STAGE = Object.freeze({ ENQUIRY: 1, SURVEY: 2, QUOTE: 3 });

export const REQUEST_STATUS = Object.freeze({
  ENQUIRY_NEW: 1,
  ASSIGNED: 2,
  CONTACTED: 3,
  DROPPED: 4,
  ENQUIRY_SCHEDULED: 5,
  SURVEY_NEW: 6,
  SURVEY_COMPLETED: 7,
  QUOTE_NEW: 8,
  QUOTE_REVIEW_REQUIRED: 9,
  QUOTE_REVIEW_COMPLETED: 10,
  QUOTE_SENT: 11,
  QUOTE_CUSTOMER_APPROVED: 12,
  QUOTE_REVIEW_REJECTED: 13,
  QUOTE_REVISED: 14,
  QUOTE_FOLLOW_UP: 15,
  SURVEY_DROPPED: 16,
});

/** Statuses after which nothing can change. */
export const CLOSED_STATUSES = Object.freeze([
  REQUEST_STATUS.DROPPED,
  REQUEST_STATUS.SURVEY_DROPPED,
]);

/** Volumes are stored in CFT and shown in the organization's unit (1 CBM = 35.315 CFT). */
export const CFT_PER_CBM = 35.315;
export const toUnit = (cft, unit) =>
  cft == null ? null : Math.round((unit === 'CBM' ? cft / CFT_PER_CBM : cft) * 1000) / 1000;
export const toCft = (value, unit) =>
  value === '' || value == null
    ? null
    : Math.round((unit === 'CBM' ? Number(value) * CFT_PER_CBM : Number(value)) * 1000) / 1000;
