import { z } from 'zod';
import { toCft, toUnit } from '../../lib/requestStatus.js';

const issue = (ctx, path, message) => ctx.addIssue({ code: 'custom', path: [path], message });
const text = (max) => z.string().max(max, `Use at most ${max} characters`);
const whole = z
  .string()
  .trim()
  .regex(/^\d{0,4}$/, 'Use a whole number up to 9999');
const decimal = (places, message) =>
  z
    .string()
    .trim()
    .regex(new RegExp(`^(\\d{1,10}(\\.\\d{1,${places}})?)?$`), message);
const money = decimal(2, 'Use an amount with up to 2 decimals');

export const surveySchema = z
  .object({
    executiveId: z.string().min(1, 'Select the executive'),
    surveyedById: z.string().min(1, 'Select who did the survey'),
    surveyedDate: z.string(),
    surveyedTime: z.string(),
    scanFileId: z.number().nullable(),
    timeToCompleteHours: decimal(2, 'Use hours with up to 2 decimals'),
    storageDays: whole,
    noOfDays: whole,
    peopleRequired: whole,
    peopleDescription: text(500),
    packingMaterialRemarks: text(2000),
    insuranceRequired: z.boolean(),
    insuranceValue: money,
    estimatedVolume: decimal(3, 'Use a volume with up to 3 decimals'),
    // Ticked special requisites, each with an optional note.
    requisites: z.array(z.object({ id: z.string(), remark: text(500) })),
    remarks: text(2000),
    amountQuoted: money,
    quoteInstruction: text(2000),
  })
  .superRefine((values, ctx) => {
    // Date and time go together, and the survey cannot be in the future.
    if (Boolean(values.surveyedDate) !== Boolean(values.surveyedTime))
      issue(ctx, 'surveyedDate', 'Enter both the date and the time');
    else if (
      values.surveyedDate &&
      new Date(`${values.surveyedDate}T${values.surveyedTime}`) > new Date()
    )
      issue(ctx, 'surveyedDate', 'The survey cannot be in the future');
    if (values.insuranceRequired && !values.insuranceValue)
      issue(ctx, 'insuranceValue', 'Enter the insurance value');
  });

const pad = (value) => String(value).padStart(2, '0');
const text0 = (value) => (value == null ? '' : String(value));

/** Form values from the API data; the estimated volume is shown in the organization's unit. */
export function fromSurvey(data) {
  const { request, survey } = data;
  const at = survey.surveyedAt ? new Date(survey.surveyedAt) : null;
  return {
    executiveId: request.executiveId ?? '',
    surveyedById: survey.surveyedById ?? '',
    surveyedDate: at ? `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}` : '',
    surveyedTime: at ? `${pad(at.getHours())}:${pad(at.getMinutes())}` : '',
    scanFileId: survey.scanFileId,
    timeToCompleteHours: text0(survey.timeToCompleteHours),
    storageDays: text0(survey.storageDays),
    noOfDays: text0(survey.noOfDays),
    peopleRequired: text0(survey.peopleRequired),
    peopleDescription: survey.peopleDescription ?? '',
    packingMaterialRemarks: survey.packingMaterialRemarks ?? '',
    insuranceRequired: survey.insuranceRequired,
    insuranceValue: text0(survey.insuranceValue),
    estimatedVolume: text0(toUnit(survey.estimatedVolumeCft, data.volumeUnit)),
    requisites: survey.requisites.map((item) => ({
      id: String(item.requisiteId),
      remark: item.remark ?? '',
    })),
    remarks: survey.remarks ?? '',
    amountQuoted: text0(survey.amountQuoted),
    quoteInstruction: survey.quoteInstruction ?? '',
  };
}

const number = (value) => (value === '' ? undefined : Number(value));
const textOrNothing = (value) => value.trim() || undefined;

/** The body the API expects (volumes in CFT). */
export function toSurveyPayload(values, volumeUnit) {
  return {
    executiveId: values.executiveId,
    surveyedById: values.surveyedById,
    surveyedAt: values.surveyedDate
      ? new Date(`${values.surveyedDate}T${values.surveyedTime}`).toISOString()
      : undefined,
    scanFileId: values.scanFileId ?? undefined,
    timeToCompleteHours: number(values.timeToCompleteHours),
    storageDays: number(values.storageDays),
    noOfDays: number(values.noOfDays),
    peopleRequired: number(values.peopleRequired),
    peopleDescription: textOrNothing(values.peopleDescription),
    packingMaterialRemarks: textOrNothing(values.packingMaterialRemarks),
    insuranceRequired: values.insuranceRequired,
    insuranceValue: values.insuranceRequired ? number(values.insuranceValue) : undefined,
    estimatedVolumeCft: toCft(values.estimatedVolume, volumeUnit) ?? undefined,
    requisites: values.requisites.map((item) => ({
      requisiteId: Number(item.id),
      remark: textOrNothing(item.remark),
    })),
    remarks: textOrNothing(values.remarks),
    amountQuoted: number(values.amountQuoted),
    quoteInstruction: textOrNothing(values.quoteInstruction),
  };
}
