export const WAYPOINTS = Object.freeze({
  shasta: { name: 'MOUNT SHASTA', subtitle: 'Twilight approach', altitude: 4200, speed: 48, heading: 18, scene: 'dusk' },
  cloudline: { name: 'LENTICULAR BELT', subtitle: 'Standing-wave cloud layer', altitude: 24000, speed: 145, heading: 75, scene: 'clouds' },
  orbit: { name: 'AURORA GATE', subtitle: 'Fictional orbital waypoint', altitude: 120000, speed: 480, heading: 238, scene: 'orbit' }
});

export const clamp = (n, min, max) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
export const wrapDegrees = n => ((n % 360) + 360) % 360;
const approach = (current, target, amount) => current + (target - current) * clamp(amount, 0, 1);
const angularDelta = (from, to) => ((to - from + 540) % 360) - 180;

export function createFlight() {
  return {
    speed: 18, throttle: 18, altitude: 3500, heading: 294, bank: 0,
    waypoint: 'shasta', autopilot: false, scene: 'dusk', morph: false, distance: 0
  };
}

export function stepFlight(flight, seconds, controls = {}) {
  const dt = clamp(seconds, 0, 0.1);
  const f = { ...flight };
  const goal = WAYPOINTS[f.waypoint] || WAYPOINTS.shasta;
  if (f.autopilot) {
    f.throttle = approach(f.throttle, goal.speed / 6, dt * 0.9);
    f.altitude = approach(f.altitude, goal.altitude, dt * 0.55);
    f.heading = wrapDegrees(f.heading + clamp(angularDelta(f.heading, goal.heading), -62 * dt, 62 * dt));
    f.bank = approach(f.bank, clamp(angularDelta(f.heading, goal.heading) * 0.35, -18, 18), dt * 2);
  } else {
    const turn = clamp(controls.turn || 0, -1, 1);
    const lift = clamp(controls.lift || 0, -1, 1);
    f.heading = wrapDegrees(f.heading + turn * 38 * dt);
    f.altitude = clamp(f.altitude + lift * (600 + f.speed * 1.8) * dt, 0, 200000);
    f.bank = approach(f.bank, turn * 27, dt * 3.5);
    if (controls.throttle) f.throttle = clamp(f.throttle + controls.throttle * 28 * dt, 0, 100);
  }
  f.throttle = clamp(f.throttle, 0, 100);
  f.speed = approach(f.speed, f.throttle * 6, dt * 0.7);
  f.altitude = clamp(f.altitude, 0, 200000);
  f.distance += f.speed * dt / 3600;
  return f;
}

export function formatAltitude(meters) {
  return meters >= 10000 ? (meters / 1000).toFixed(1) + ' km' : Math.round(meters).toLocaleString('en-US') + ' m';
}
