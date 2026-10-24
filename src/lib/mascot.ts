/**
 * The chibi mascot sticker set. Each entry is a Lottie animation in
 * `public/mascot/<file>.json`, fetched on demand — never bundled, because the
 * set is ~2.2MB in total and a page only ever needs one.
 */
export const MASCOT_EXPRESSIONS = {
  happy: 'happy',
  excited: 'excited',
  waving: 'waving',
  surprised: 'surprised',
  thinking: 'thinking',
  confused: 'confused',
  focused: 'focused',
  writing: 'happy_writing',
  monitoring: 'monitoring',
  meditating: 'meditating',
  recharging: 'recharging',
  locked: 'locked',
  goal: 'goal_achievement',
  lowEnergy: 'low_energy',
  drained: 'drained',
  burnedOut: 'burned_out',
  sleeping: 'sleeping',
  content: 'happy_content',
  celebrating: 'celebrating',
} as const;

export type MascotExpression = keyof typeof MASCOT_EXPRESSIONS;

export function mascotSrc(expression: MascotExpression): string {
  return `/mascot/${MASCOT_EXPRESSIONS[expression]}.json`;
}

/** Short alt text so the mascot is not a silent gap for screen readers. */
export const MASCOT_ALT: Record<MascotExpression, string> = {
  happy: 'Illustration of Tio looking happy',
  excited: 'Illustration of Tio cheering',
  waving: 'Illustration of Tio waving hello',
  surprised: 'Illustration of Tio looking surprised',
  thinking: 'Illustration of Tio thinking',
  confused: 'Illustration of Tio looking confused',
  focused: 'Illustration of Tio working at a laptop',
  writing: 'Illustration of Tio writing in a notebook',
  monitoring: 'Illustration of Tio watching a dashboard',
  meditating: 'Illustration of Tio meditating',
  recharging: 'Illustration of Tio charging a phone',
  locked: 'Illustration of Tio beside a padlock',
  goal: 'Illustration of Tio hitting a target',
  lowEnergy: 'Illustration of Tio running low on energy',
  drained: 'Illustration of Tio looking drained',
  burnedOut: 'Illustration of Tio looking overwhelmed',
  sleeping: 'Illustration of Tio asleep',
  content: 'Illustration of Tio looking content',
  celebrating: 'Illustration of Tio celebrating',
};
