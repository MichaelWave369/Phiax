import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlight, stepFlight, WAYPOINTS, clamp, wrapDegrees, formatAltitude } from '../src/flight.mjs';
import { answerPhiax } from '../src/brain.mjs';

test('fresh flight starts in Shasta manual mode', () => {
  const f=createFlight();
  assert.equal(f.scene,'dusk');
  assert.equal(f.autopilot,false);
  assert.equal(f.waypoint,'shasta');
});
test('safe numeric clamps and compass wrapping', () => {
  assert.equal(clamp(-3,0,100),0);
  assert.equal(clamp(233,0,100),100);
  assert.equal(wrapDegrees(-30),330);
  assert.equal(wrapDegrees(390),30);
});
test('manual flight steers, climbs and accelerates without mutating previous state', () => {
  const before=createFlight();
  const after=stepFlight(before,.1,{turn:1,lift:1,throttle:1});
  assert.ok(after.heading>before.heading);
  assert.ok(after.altitude>before.altitude);
  assert.ok(after.throttle>before.throttle);
  assert.equal(before.heading,294);
});
test('autopilot converges toward a real destination in simulation coordinates', () => {
  let f={...createFlight(),waypoint:'orbit',autopilot:true};
  for(let i=0;i<600;i++)f=stepFlight(f,.05);
  assert.ok(Math.abs(f.altitude-WAYPOINTS.orbit.altitude)<1,'orbit altitude converged');
  assert.ok(Math.abs(f.speed-WAYPOINTS.orbit.speed)<1,'speed converged');
  assert.ok(Math.abs(f.heading-WAYPOINTS.orbit.heading)<1,'heading converged');
});
test('throttle and altitude cannot exceed bounds', () => {
  let f={...createFlight(),throttle:99,altitude:199990};
  for(let i=0;i<50;i++) f=stepFlight(f,.1,{throttle:1,lift:1});
  assert.equal(f.throttle,100);
  assert.equal(f.altitude,200000);
});
test('altitude formatting switches units', () => {
  assert.equal(formatAltitude(1000),'1,000 m');
  assert.equal(formatAltitude(12000),'12.0 km');
});
test('shipmind is transparent about being scripted', () => {
  assert.match(answerPhiax('Who are you?').message,/local scripted logic/);
  assert.match(answerPhiax('Are you conscious?').message,/browser simulation/);
});
test('navigation dialogue yields deterministic, distinguishable commands', () => {
  assert.equal(answerPhiax('Take us to orbit').command,'orbit');
  assert.equal(answerPhiax('Go to clouds').command,'cloudline');
  assert.equal(answerPhiax('Engage autopilot').command,'autopilot_on');
  assert.equal(answerPhiax('Disengage autopilot').command,'autopilot_off');
  assert.equal(answerPhiax('Morph the ship').command,'morph');
});
test('zero-length prompt does not throw or trigger commands', () => {
  assert.equal(answerPhiax('  ').command,undefined);
});
