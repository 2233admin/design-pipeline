export type SpringConfig = {
  stiffness: number;
  damping: number;
  mass?: number;
  clamp?: boolean;
};

/** Closed-form step response of a damped spring let go at t = 0, moving from 0 toward 1. */
export function step(t: number, { stiffness, damping, mass = 1, clamp = false }: SpringConfig) {
  if (t <= 0) return 0;
  const natural = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  let value: number;
  if (zeta < 1) {
    const damped = natural * Math.sqrt(1 - zeta * zeta);
    value =
      1 -
      Math.exp(-zeta * natural * t) *
        (Math.cos(damped * t) + ((zeta * natural) / damped) * Math.sin(damped * t));
  } else if (zeta === 1) {
    value = 1 - Math.exp(-natural * t) * (1 + natural * t);
  } else {
    const damped = natural * Math.sqrt(zeta * zeta - 1);
    value =
      1 -
      Math.exp(-zeta * natural * t) *
        (Math.cosh(damped * t) + ((zeta * natural) / damped) * Math.sinh(damped * t));
  }
  return clamp ? Math.min(value, 1) : value;
}

export type Key = readonly [time: number, value: number];

/**
 * A value that changes target at each key: the first value plus one spring per
 * change. It stays a pure function of time however often it retargets.
 */
export function track(t: number, keys: readonly Key[], config: SpringConfig) {
  let value = keys[0][1];
  for (let index = 1; index < keys.length; index++) {
    value += (keys[index][1] - keys[index - 1][1]) * step(t - keys[index][0], config);
  }
  return value;
}

/** A critically damped spring with the given response (rad/s). */
export const critical = (response: number): SpringConfig => ({
  stiffness: response * response,
  damping: 2 * response,
});
