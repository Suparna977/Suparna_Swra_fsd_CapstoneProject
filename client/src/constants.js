export const LEVELS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Beginner' },
  { value: 2, label: 'Intermediate' },
  { value: 3, label: 'Advanced' },
];

export const levelLabel = (n) => LEVELS.find((l) => l.value === n)?.label ?? 'None';

export const STATUS_TEXT = {
  strong: 'Strong',
  weak: 'Needs work',
  missing: 'Missing',
};
