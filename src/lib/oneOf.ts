import { getAtPath } from './objectPath';

export type OneOfRule = 'exactly-one' | 'zero-or-one' | 'one-of-or-other';

export type OneOfGroup = {
  name: string;
  rule: OneOfRule;
  fields: string[];
};

export type OneOfEvaluation = {
  group: OneOfGroup;
  ok: boolean;
  conflicts?: {
    filled: string[];
    missing: string[];
    rule: OneOfRule;
  };
};

const ONE_OF_GROUPS: OneOfGroup[] = [
  {
    name: 'respondentGender',
    rule: 'zero-or-one',
    fields: [
      'respondentGenderMale',
      'respondentGenderFemale',
      'respondentGenderNonbinary',
    ],
  },
  {
    name: 'relationshipStatus',
    rule: 'one-of-or-other',
    fields: [
      'relationship_married',
      'relationship_usedToBeMarried',
      'relationship_dating',
      'relationship_engaged',
      'relationship_related',
      'relationship_parent',
      'relationship_child',
      'relationship_spouseOfChild',
      'relationship_sibling',
      'relationship_grandparent',
      'relationship_grandchild',
      'relationship_otherRelated',
      'relationship_cohabiting',
      'relationship_roommate',
      'relationship_other',
    ],
  },
  {
    name: 'abuseWeapons',
    rule: 'zero-or-one',
    fields: ['abuse_weapons_yes', 'abuse_weapons_no'],
  },
  {
    name: 'abuseGunUse',
    rule: 'zero-or-one',
    fields: ['abuse_gun_used_yes', 'abuse_gun_used_no'],
  },
  {
    name: 'abuseThreatenedWithGun',
    rule: 'zero-or-one',
    fields: ['abuse_threatened_with_gun_yes', 'abuse_threatened_with_gun_no'],
  },
  {
    name: 'abuseGunOwner',
    rule: 'zero-or-one',
    fields: ['abuse_gun_owner_yes', 'abuse_gun_owner_no'],
  },
  {
    name: 'abuseImmediateDanger',
    rule: 'zero-or-one',
    fields: ['abuse_immediate_danger_yes', 'abuse_immediate_danger_no'],
  },
  {
    name: 'abusePoliceReport',
    rule: 'zero-or-one',
    fields: ['abuse_police_report_yes', 'abuse_police_report_no'],
  },
  {
    name: 'abuseOngoingCase',
    rule: 'zero-or-one',
    fields: ['abuse_ongoing_case_yes', 'abuse_ongoing_case_no'],
  },
  {
    name: 'abuseChildrenHarmed',
    rule: 'zero-or-one',
    fields: ['abuse_children_harmed_yes', 'abuse_children_harmed_no'],
  },
  {
    name: 'abuseAnimalsHarmed',
    rule: 'zero-or-one',
    fields: ['abuse_animals_harmed_yes', 'abuse_animals_harmed_no'],
  },
  {
    name: 'gunsRemove',
    rule: 'zero-or-one',
    fields: ['guns_remove_yes', 'guns_remove_no'],
  },
  {
    name: 'gunsReturn',
    rule: 'zero-or-one',
    fields: ['guns_return_yes', 'guns_return_no'],
  },
  {
    name: 'gunsSurrender',
    rule: 'zero-or-one',
    fields: ['guns_surrender_yes', 'guns_surrender_no'],
  },
  {
    name: 'gunsRestrict',
    rule: 'zero-or-one',
    fields: ['guns_restrict_yes', 'guns_restrict_no'],
  },
];

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === 'on' || value === 'yes';
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return Boolean(value);
}

export function evaluateOneOfGroup(data: unknown, group: OneOfGroup): OneOfEvaluation {
  const filled = group.fields.filter((path) => normalizeBoolean(getAtPath(data, path)));
  let ok = true;

  switch (group.rule) {
    case 'exactly-one':
      ok = filled.length === 1;
      break;
    case 'zero-or-one':
      ok = filled.length <= 1;
      break;
    case 'one-of-or-other':
      ok = filled.length >= 1;
      break;
    default:
      ok = true;
  }

  return ok
    ? { group, ok: true }
    : {
        group,
        ok: false,
        conflicts: {
          filled,
          missing: group.fields.filter((field) => !filled.includes(field)),
          rule: group.rule,
        },
      };
}

export function evaluateAllOneOf(data: unknown): { ok: boolean; results: OneOfEvaluation[] } {
  const results = ONE_OF_GROUPS.map((group) => evaluateOneOfGroup(data, group));
  const ok = results.every((result) => result.ok);
  return { ok, results };
}
