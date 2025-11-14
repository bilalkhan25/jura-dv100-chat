import { getAtPath } from './objectPath';
import { evaluateAllOneOf } from './oneOf';
import type { Dv100Data } from './dv100State';

type RequiredField = {
  path: string;
  label: string;
};

type MissingField = {
  path: string;
  label: string;
};

const REQUIRED_FIELDS: RequiredField[] = [
  { path: 'protectedPerson.petitionerName', label: 'Petitioner name' },
  { path: 'restrainedPerson.respondentName', label: 'Respondent name' },
  { path: 'abuse.abuse_details_description', label: 'Abuse details' },
];

const REQUIRED_ORDER_OPTIONS = [
  'ordersRequested.order_noAbuse_checkbox',
  'ordersRequested.order_noContact_checkbox',
  'ordersRequested.order_stayAway',
];

export type RequiredValidationResult = {
  ok: boolean;
  missing: MissingField[];
  ordersSelected: boolean;
};

export function validateRequired(data: Dv100Data): RequiredValidationResult {
  const missing: MissingField[] = REQUIRED_FIELDS.filter(({ path }) => {
    const value = getAtPath(data, path);
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    return value === null || value === undefined;
  }).map((field) => ({ path: field.path, label: field.label }));

  const ordersSelected = REQUIRED_ORDER_OPTIONS.some((path) => Boolean(getAtPath(data, path)));

  if (!ordersSelected) {
    missing.push({
      path: REQUIRED_ORDER_OPTIONS[0],
      label: 'At least one protection order (Section 12)',
    });
  }

  return {
    ok: missing.length === 0,
    missing,
    ordersSelected,
  };
}

export function validateOneOf(data: Dv100Data) {
  return evaluateAllOneOf(data);
}

export function validateAll(data: Dv100Data) {
  const required = validateRequired(data);
  const oneOf = validateOneOf(data);
  return {
    ok: required.ok && oneOf.ok,
    required,
    oneOf,
  };
}
