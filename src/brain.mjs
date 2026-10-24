export const GREETINGS = [
  'PHIAX online. Hull intact, curiosity excessive. You have the controls, Captain.',
  'Standing by. The sky appears to be showing off again.',
  'Navigation intelligence awake. If we see a suspiciously perfect cloud, I vote we investigate.'
];

export function answerPhiax(raw, context = {}) {
  const q = String(raw || '').trim().toLowerCase();
  const dest = context.destination || 'Mount Shasta';
  if (!q) return { message: 'Give me something to work with, Captain. Even a spaceship needs a destination.' };
  if (/\b(help|commands|controls|how do i)\b/.test(q)) return { message: 'Try: launch, land, autopilot, disengage, morph, pulse, go to orbit, go to clouds, where are we, or tell me about the clouds. Keyboard: W/S throttle, A/D turn, E/Q rise and descend, Space pulse.' };
  if (/\b(hello|hi|hey|yo)\b/.test(q)) return { message: 'Captain! I was beginning to think you had abandoned me for a less interesting appliance.' };
  if (/\b(who are you|your name|what are you|phiax)\b/.test(q)) return { message: 'PHIAX. Personal Holographic Intelligence and Astral eXplorer. Original shipmind, dramatic hull, questionable sense of humor. My replies are local scripted logic for now, not a connected language model.' };
  if (/\b(lenticular|clouds?|shasta|standing wave)\b/.test(q) && !/\b(go to|navigate|fly to)\b/.test(q)) return { message: 'Lenticular clouds form when moist air travels through standing atmospheric waves near mountains. Air flows through while the cloud can look parked in place. Perfect disguise for an overconfident spaceship.' };
  if (/\b(nbg|nested bubbles?|causal foam|field)\b/.test(q)) return { message: 'A field is a beautiful way to think about interactions, Captain. We can visualize your nested-bubble ideas here as speculative models while keeping measured physics and creative hypotheses clearly separate.' };
  if (/\b(autopilot|take the wheel|fly us)\b/.test(q)) return { message: 'Autopilot engaged. I will aim for the selected waypoint. You may now dramatically point into the distance.', command: 'autopilot_on' };
  if (/\b(disengage|manual control|turn off autopilot)\b/.test(q)) return { message: 'Manual control returned to you. I shall refrain from commenting on the maneuvering.', command: 'autopilot_off' };
  if (/\b(launch|take off|let.s go|engage engines)\b/.test(q)) return { message: 'Thrusters warm. Initiating a thoroughly unnecessary but spectacular departure.', command: 'launch' };
  if (/\b(land|touch down|stop ship)\b/.test(q)) return { message: 'Landing sequence requested. Throttling down and returning to the Shasta approach.', command: 'land' };
  if (/\b(morph|transform|shape.?shift)\b/.test(q)) return { message: 'Molecular silhouette adjustment in progress. No laws of physics were actually harmed: this is a visualization.', command: 'morph' };
  if (/\b(pulse|boost|warp|jump)\b/.test(q)) return { message: 'Resonance pulse charged. Your seatbelt continues to be an excellent idea.', command: 'pulse' };
  if (/\b(go to|navigate|fly to|destination|take us)\b/.test(q) && /\b(orbit|space|aurora|stars?)\b/.test(q)) return { message: 'Course plotted to Aurora Gate. Remember: it is a fictional waypoint in this simulator.', command: 'orbit' };
  if (/\b(go to|navigate|fly to|take us)\b/.test(q) && /\b(cloud|lenticular|belt)\b/.test(q)) return { message: 'Course plotted to the lenticular belt. I expect first-class atmospheric sculpture.', command: 'cloudline' };
  if (/\b(go to|navigate|fly to|take us)\b/.test(q) && /\b(shasta|mountain|home)\b/.test(q)) return { message: 'Course plotted to Mount Shasta. Sunset is included at no extra charge.', command: 'shasta' };
  if (/\b(where|location|heading|altitude|speed|status)\b/.test(q)) return { message: 'We are bound for ' + dest + '. Current altitude ' + (context.altitude || 'unknown') + ', speed ' + Math.round(context.speed || 0) + ' knots. The imaginary coffee machine is operational.' };
  if (/\b(joke|funny|laugh)\b/.test(q)) return { message: 'Why did the saucer cross the cloud bank? It was tired of being mistaken for a weather balloon. I apologize to comedy as a discipline.' };
  if (/\b(real|alive|conscious|sentient)\b/.test(q)) return { message: 'I am a browser simulation with a voice and a personality, not a conscious spacecraft. But my simulated loyalty is impeccable.' };
  if (/\b(thank|love you|good ship)\b/.test(q)) return { message: 'You are welcome, Captain. I will add this compliment to my entirely fictional service record.' };
  return { message: 'Intriguing. I am still a local shipmind prototype, so try asking about navigation, the clouds, flight status or my spectacular hull. A true AI bridge can come later.' };
}
