# DV-100 — One-Of / Mutually-Exclusive Groups

Purpose: Each group below describes fields where only one choice is allowed (or a “yes/no/don’t know” triad). UI should enforce radio-style behavior and validation should flag conflicts.

## 1) Respondent Gender (zero-or-one)
- respondentGenderMale
- respondentGenderFemale
- respondentGenderNonbinary
Rule: Pick 0–1. (If unknown, leave all unchecked.)

## 2) Relationship — Lived Together (exactly-one-if-labeled)
- relationship_livedTogether_yes
- relationship_livedTogether_no
Rule: If `relationship_livedTogether` is checked, require exactly one of {yes,no}. If `relationship_livedTogether` is not checked, both must be unchecked.

## 3) Other Orders in Last 6 Months (exactly-one)
- otherOrders_none
- otherOrders_yes
Rule: Exactly one must be checked.

## 4) Other Court Cases with Respondent (exactly-one)
- otherCases_none
- otherCases_yes
Rule: Exactly one must be checked.

## 5) Page 3 — Witness Present (exactly-one)
- abuse_witness_dontknow
- abuse_witness_no
- abuse_witness_yes
Rule: Exactly one must be checked.

## 6) Page 3 — Weapon Used/Threatened (exactly-one)
- abuse_weapon_no
- abuse_weapon_yes
Rule: Exactly one must be checked. If YES, require `abuse_weapon_yes_description`.

## 7) Page 3 — Emotional/Physical Harm (exactly-one)
- abuse_emotionalPhysical_no
- abuse_emotionalPhysical_yes
Rule: Exactly one must be checked. If YES, require `abuse_emotionalPhysical_yes_description`.

## 8) Page 3 — Police Came (exactly-one)
- abuse_police_dontknow
- abuse_police_no
- abuse_police_yes
Rule: Exactly one must be checked.

## 9) Page 3 — Frequency (one-of-or-other)
- abuse_frequency_justOnce
- abuse_frequency_2to5
- abuse_frequency_weekly
- abuse_frequency_other (+ if checked → require `abuse_frequency_other_details`)
Rule: Choose exactly one of the four checkboxes.

## 10) Page 4 — Witness (exactly-one)
- abuse_additional_witness_dontknow
- abuse_additional_witness_no
- abuse_additional_witness_yes
Rule: Exactly one.

## 11) Page 4 — Weapon (exactly-one)
- abuse_additional_weapon_no
- abuse_additional_weapon_yes
Rule: Exactly one. If YES, require `abuse_additional_weapon_yes_description`.

## 12) Page 4 — Harm (exactly-one)
- abuse_additional_emotionalPhysical_no
- abuse_additional_emotionalPhysical_yes
Rule: Exactly one. If YES, require `abuse_additional_emotionalPhysical_yes_description`.

## 13) Page 4 — Police (exactly-one)
- abuse_additional_police_dontknow
- abuse_additional_police_no
- abuse_additional_police_yes
Rule: Exactly one.

## 14) Page 4 — Frequency (one-of-or-other)
- abuse_additional_frequency_justOnce
- abuse_additional_frequency_2to5
- abuse_additional_frequency_weekly
- abuse_additional_frequency_other (+ if checked → require `abuse_additional_frequency_other_details`)
Rule: Choose exactly one.

## 15) Page 5 — Witness (exactly-one)
- abuse_more_witness_dontknow
- abuse_more_witness_no
- abuse_more_witness_yes
Rule: Exactly one.

## 16) Page 5 — Weapon (exactly-one)
- abuse_more_weapon_no
- abuse_more_weapon_yes
Rule: Exactly one. If YES, require `abuse_more_weapon_yes_description`.

## 17) Page 5 — Harm (exactly-one)
- abuse_more_emotionalPhysical_no
- abuse_more_emotionalPhysical_yes
Rule: Exactly one. If YES, require `abuse_more_emotionalPhysical_yes_description`.

## 18) Page 5 — Police (exactly-one)
- abuse_more_police_dontknow
- abuse_more_police_no
- abuse_more_police_yes
Rule: Exactly one.

## 19) Page 5 — Frequency (one-of-or-other)
- abuse_more_frequency_justOnce
- abuse_more_frequency_2to5
- abuse_more_frequency_weekly
- abuse_more_frequency_other (+ if checked → require `abuse_more_frequency_other_details`)
Rule: Choose exactly one.

## 20) Page 6 — Other Protected People (exactly-one)
- protectedPeople_none
- protectedPeople_yes
Rule: Exactly one.

## 21) Page 6 — Firearms (exactly-one)
- firearms_dontknow
- firearms_no
- firearms_yes
Rule: Exactly one.
If YES, at least one firearm row should have data (description/amount/location).

## 22) Page 7 — Live Together/Close (exactly-one)
- order_living_no
- order_living_yes
Rule: Exactly one.
If YES, optionally select one or more of:
  - order_living_together
  - order_living_sameBuilding
  - order_living_sameNeighborhood
  - order_living_other (+ description if checked)

## 23) Page 7 — Same Work/School (exactly-one)
- order_sameWorkSchool_no
- order_sameWorkSchool_yes
Rule: Exactly one.
If YES, one or more of:
  - order_sameWorkSchool_work (+ name if checked)
  - order_sameWorkSchool_school (+ name if checked)
  - order_sameWorkSchool_other (+ description)

## 24) Page 7 — Stay-Away Distance (exactly-one-if-stayAway)
- order_stayAway_distance_100
- order_stayAway_distance_other (+ yards)
Rule: If `order_stayAway` is checked, choose exactly one distance option.

## 25) Page 10 — Debt Finding (exactly-one)
- debt_finding_no
- debt_finding_yes
Rule: Exactly one.

## 26) Page 10 — Know How Debt Made (exactly-one)
- debt_explainHowMade_no
- debt_explainHowMade_yes (+ if yes → require `debt_explainHowMade`)
Rule: Exactly one.

## 27) Page 11 — Child Support Path (zero-or-one within section)
- childSupport_a_noOrder_checkbox
- childSupport_b_changeOrder_checkbox
- childSupport_c_welfare_checkbox
Rule: 0–1 may be checked depending on scenario. (The section itself is controlled by `childSupport_checkbox`.)
