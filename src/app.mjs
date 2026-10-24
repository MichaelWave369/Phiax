import { WAYPOINTS, clamp, createFlight, stepFlight, formatAltitude } from './flight.mjs';
import { answerPhiax, GREETINGS } from './brain.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const canvas = $('#scene');
const ctx = canvas.getContext('2d', { alpha: false });
const transcript = $('#transcript');
const throttle = $('#throttle-slider');
const ship = $('#ship-stage');
const overlay = $('#pulse-overlay');
const orb = $('.ai-orb');

let flight = createFlight();
let landing = false;
let soundOn = false;
let voiceOn = false;
let listening = false;
let messageCount = 0;
let previousTime = 0;
let nextTelemetry = 0;
let pulseEnds = 0;
let speakingTimer = 0;
const keys = new Set();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const stars = makeStars(180, 369);
let viewWidth = 900;
let viewHeight = 525;
let audioContext;

function makeStars(count, seed) {
  let n = seed;
  const random = () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
  return Array.from({ length: count }, () => ({ x: random(), y: random(), radius: random() * 1.35 + 0.24, opacity: random() * 0.7 + 0.2, twinkle: random() * 6.28 }));
}

function loadPreference(key) {
  try { return window.localStorage.getItem('phiax:' + key) === 'true'; } catch { return false; }
}
function savePreference(key, value) {
  try { window.localStorage.setItem('phiax:' + key, String(value)); } catch { /* private browsing can block storage */ }
}

function appendMessage(speaker, message) {
  messageCount++;
  const entry = document.createElement('div');
  entry.className = 'message ' + (speaker === 'CAPTAIN' ? 'user' : 'ship');
  const title = document.createElement('span');
  title.className = 'speaker';
  title.textContent = speaker === 'CAPTAIN' ? '▸ CAPTAIN' : '◈ PHIAX';
  const body = document.createElement('p');
  body.textContent = String(message);
  const time = document.createElement('span');
  time.className = 'timestamp';
  time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  entry.append(title, body, time);
  transcript.append(entry);
  while (transcript.childElementCount > 42) transcript.firstElementChild.remove();
  transcript.scrollTop = transcript.scrollHeight;
  $('#message-count').textContent = String(messageCount).padStart(3, '0') + (messageCount === 1 ? ' TRANSMISSION' : ' TRANSMISSIONS');
}

function say(message) {
  if (!voiceOn || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'en-US';
    utterance.rate = 1.04;
    utterance.pitch = 0.79;
    utterance.volume = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const english = voices.filter(v => /^en[-_]/i.test(v.lang));
    const chosen = english.find(v => /male|daniel|david|alex/i.test(v.name)) || english[0];
    if (chosen) utterance.voice = chosen;
    utterance.onstart = () => { orb.classList.add('speaking'); $('#ai-mode').textContent = 'SPEAKING'; };
    utterance.onend = utterance.onerror = () => { orb.classList.remove('speaking'); $('#ai-mode').textContent = 'PLAYFULLY ATTENTIVE'; };
    window.speechSynthesis.speak(utterance);
  } catch { /* speech may be unavailable */ }
}

function respond(message) { appendMessage('PHIAX', message); say(message); }

function beep(frequency = 330, duration = 0.13) {
  if (!soundOn) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    if (!audioContext) audioContext = new AC();
    if (audioContext.state === 'suspended') audioContext.resume();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(50, frequency * 0.55), now + duration);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.025);
  } catch { /* user may not have granted audio playback */ }
}

function routeTo(id) {
  if (!WAYPOINTS[id]) return;
  flight.waypoint = id;
  flight.scene = WAYPOINTS[id].scene;
  flight.autopilot = true;
  landing = false;
  syncControls();
  beep(440);
}

function pulse() {
  overlay.classList.remove('active');
  void overlay.offsetWidth;
  overlay.classList.add('active');
  pulseEnds = performance.now() + 1200;
  flight.throttle = clamp(flight.throttle + 12, 0, 100);
  beep(650, 0.32);
}

function act(command) {
  switch (command) {
    case 'launch': landing = false; flight.autopilot = false; flight.throttle = Math.max(62, flight.throttle); beep(220, 0.3); break;
    case 'land': landing = true; flight.autopilot = false; flight.throttle = 0; beep(250); break;
    case 'autopilot_on': landing = false; flight.autopilot = true; beep(460); break;
    case 'autopilot_off': flight.autopilot = false; beep(290); break;
    case 'morph': flight.morph = !flight.morph; ship.classList.toggle('is-morphed', flight.morph); beep(520, 0.27); break;
    case 'pulse': pulse(); break;
    case 'shasta': case 'cloudline': case 'orbit': routeTo(command); break;
  }
  syncControls();
}

function receive(raw) {
  const text = String(raw || '').trim().slice(0, 280);
  if (!text) return;
  appendMessage('CAPTAIN', text);
  const answer = answerPhiax(text, { destination: WAYPOINTS[flight.waypoint].name, altitude: formatAltitude(flight.altitude), speed: flight.speed });
  if (answer.command) act(answer.command);
  respond(answer.message);
}

function syncControls() {
  $$('.destination').forEach(button => {
    const active = button.dataset.destination === flight.waypoint;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const autopilot = $('#autopilot');
  autopilot.setAttribute('aria-pressed', String(flight.autopilot));
  autopilot.textContent = flight.autopilot ? '◎ AUTO ACTIVE' : '◎ AUTOPILOT';
  $('#nav-signal').textContent = landing ? 'LANDING IN PROGRESS' : flight.autopilot ? 'AUTOPILOT ENGAGED' : 'MANUAL CONTROL';
  throttle.value = String(Math.round(flight.throttle));
  $('#throttle-label').textContent = Math.round(flight.throttle) + '%';
  throttle.style.background = 'linear-gradient(to right, #78ffdc ' + flight.throttle + '%, #254551 ' + flight.throttle + '%)';
  $('#morph').classList.toggle('active', flight.morph);
}

function updateTelemetry(timestamp) {
  if (timestamp < nextTelemetry) return;
  nextTelemetry = timestamp + 100;
  $('#speed').textContent = String(Math.round(flight.speed));
  $('#altitude').textContent = formatAltitude(flight.altitude);
  $('#heading').textContent = String(Math.round(flight.heading)).padStart(3, '0');
  $('#flux-status').textContent = pulseEnds > timestamp ? 'PULSING' : flight.throttle > 78 ? 'HIGH FLUX' : 'STABLE';
  const scenes = {
    dusk: ['SHASTA TWILIGHT', 'SH-001', 'DUSK APPROACH'],
    clouds: ['STANDING WAVE FIELD', 'LC-002', 'LENTICULAR BELT'],
    orbit: ['UPPER ORBIT', 'AG-003', 'AURORA GATE']
  };
  const labels = scenes[flight.scene];
  $('#environment-text').textContent = labels[0];
  $('#sector').textContent = labels[1];
  $('#scene-label').textContent = labels[2];
  ship.style.setProperty('--bank', flight.bank.toFixed(2) + 'deg');
  ship.style.setProperty('--lift', (-clamp(flight.speed / 42, 0, 12)).toFixed(1) + 'px');
  syncControls();
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  viewWidth = Math.max(1, rect.width);
  viewHeight = Math.max(1, rect.height);
  canvas.width = Math.round(viewWidth * dpr);
  canvas.height = Math.round(viewHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize, { passive: true });
if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
resize();

function ellipse(x, y, rx, ry, color, opacity = 1, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function paintSky(stops) {
  const gradient = ctx.createLinearGradient(0, 0, 0, viewHeight);
  stops.forEach(([position, color]) => gradient.addColorStop(position, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewWidth, viewHeight);
}

function drawStars(time, strength = 1) {
  for (const s of stars) {
    const flicker = reduceMotion ? 1 : 0.8 + 0.2 * Math.sin(time * 0.9 + s.twinkle);
    ctx.globalAlpha = s.opacity * strength * flicker;
    ctx.fillStyle = '#d6faff';
    ctx.beginPath();
    ctx.arc(s.x * viewWidth, s.y * viewHeight * .91, s.radius, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function lenticular(x, y, width, height, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width, height);
  ctx.globalAlpha = alpha;
  const haze = ctx.createRadialGradient(0, .35, .1, 0, .35, 1.5);
  haze.addColorStop(0, '#ffb99d50');
  haze.addColorStop(.7, '#e98eb740');
  haze.addColorStop(1, '#e98eb700');
  ctx.fillStyle = haze;
  ctx.beginPath();ctx.ellipse(0,0,1.4,1.5,0,0,Math.PI*2);ctx.fill();
  const layers = [
    { y: -.25, rx: .84, ry: .32, color: '#bd91c9' },
    { y: 0, rx: 1, ry: .28, color: '#372f5b' },
    { y: .19, rx: .91, ry: .20, color: '#e38aa5' },
    { y: .29, rx: .65, ry: .11, color: '#efb7a7' }
  ];
  for (const l of layers) {
    ctx.beginPath();
    ctx.ellipse(0, l.y, l.rx, l.ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = l.color;
    ctx.fill();
  }
  ctx.restore();
}

function mountains() {
  const w = viewWidth, h = viewHeight;
  ctx.fillStyle = '#1c293e';
  ctx.beginPath();
  ctx.moveTo(0, h * .80);
  ctx.lineTo(w * .48, h * .75);
  ctx.lineTo(w * .61, h * .75);
  ctx.lineTo(w * .75, h * .48);
  ctx.lineTo(w * .80, h * .57);
  ctx.lineTo(w * .85, h * .59);
  ctx.lineTo(w, h * .82);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e0c8df99';
  ctx.beginPath();
  ctx.moveTo(w * .75, h * .48);
  ctx.lineTo(w * .731, h * .55);
  ctx.lineTo(w * .754, h * .532);
  ctx.lineTo(w * .766, h * .55);
  ctx.lineTo(w * .782, h * .54);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#071322';
  ctx.beginPath();
  ctx.moveTo(0, h * .84);
  for (let i = 0; i <= 28; i++) {
    const x = w * i / 28;
    const rise = (Math.sin(i * 2.37) + Math.sin(i * 5.5)) * h * .018;
    ctx.lineTo(x, h * (.85 + .03 * Math.sin(i * .48)) + rise);
  }
  ctx.lineTo(w, h);ctx.lineTo(0, h);ctx.closePath();ctx.fill();
}

function drawDusk(time) {
  const w = viewWidth,h = viewHeight;
  paintSky([[0,'#171a3b'],[.25,'#43416d'],[.55,'#7489ad'],[.79,'#ee9aab'],[1,'#191d37']]);
  const glow = ctx.createRadialGradient(w*.69,h*.76,10,w*.69,h*.76,w*.7);
  glow.addColorStop(0,'#ffd7ad75');glow.addColorStop(1,'#ff79ba00');
  ctx.fillStyle = glow;ctx.fillRect(0,0,w,h);
  drawStars(time,.2);
  lenticular(w*.22,h*.30,w*.14,h*.095,.78);
  lenticular(w*.73,h*.32,w*.20,h*.13,.93);
  lenticular(w*.28,h*.69,w*.19,h*.088,.58);
  lenticular(w*.82,h*.67,w*.115,h*.065,.62);
  mountains();
}

function drawCloudField(time) {
  const w = viewWidth,h = viewHeight;
  paintSky([[0,'#09162f'],[.43,'#385b84'],[.76,'#8e83aa'],[1,'#eba6aa']]);
  drawStars(time,.32);
  ctx.fillStyle='#eab4c318';
  for(let i=0;i<9;i++){
    const offset = reduceMotion ? 0 : Math.sin(time*.08+i)*w*.016;
    lenticular(w*(.15+.115*i)+offset,h*(.20+(i%4)*.17),w*(.12+(i%3)*.035),h*(.055+(i%2)*.025),.35+(i%3)*.16);
  }
  const fog = ctx.createLinearGradient(0,h*.75,0,h);
  fog.addColorStop(0,'#7690bf00');fog.addColorStop(1,'#f4acb982');
  ctx.fillStyle=fog;ctx.fillRect(0,h*.75,w,h*.25);
}

function drawOrbit(time) {
  const w=viewWidth,h=viewHeight;
  paintSky([[0,'#010512'],[.65,'#081833'],[1,'#234c75']]);
  drawStars(time,1);
  const nebula = ctx.createRadialGradient(w*.53,h*.27,5,w*.53,h*.27,w*.62);
  nebula.addColorStop(0,'#5d4aa252');nebula.addColorStop(.45,'#144e7669');nebula.addColorStop(1,'#04162e00');
  ctx.fillStyle=nebula;ctx.fillRect(0,0,w,h);
  const planet=ctx.createRadialGradient(w*.53,h*1.33,w*.16,w*.48,h*1.4,w*.82);
  planet.addColorStop(0,'#1d658a');planet.addColorStop(.65,'#17476c');planet.addColorStop(.90,'#42afc4');planet.addColorStop(1,'#9affeb');
  ctx.fillStyle=planet;
  ctx.beginPath();ctx.ellipse(w*.5,h*1.48,w*.93,h*.79,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#b5ffed77';ctx.lineWidth=3;
  ctx.beginPath();ctx.ellipse(w*.5,h*1.48,w*.93,h*.79,0,Math.PI*1.17,Math.PI*1.83);ctx.stroke();
}

function drawHUDGrid(time) {
  const w=viewWidth,h=viewHeight;
  ctx.save();
  ctx.globalAlpha=.11;
  ctx.strokeStyle='#6ffce2';ctx.lineWidth=.7;
  for(let i=0;i<=12;i++){
    const x=w*i/12;
    ctx.beginPath();ctx.moveTo(w*.5,h*.62);ctx.lineTo(x,h);ctx.stroke();
  }
  for(let i=0;i<7;i++){
    const p=i/7;
    const y=h*(.64+p*p*.48);
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
  }
  ctx.globalAlpha=.18;
  ctx.beginPath();
  ctx.moveTo(0,h*.64);ctx.lineTo(w,h*.64);ctx.stroke();
  ctx.restore();
}

function render(time) {
  ctx.save();
  switch(flight.scene){
    case 'clouds': drawCloudField(time);break;
    case 'orbit': drawOrbit(time);break;
    default: drawDusk(time);
  }
  drawHUDGrid(time);
  ctx.restore();
}

function frame(timestamp) {
  const delta = previousTime ? Math.min((timestamp-previousTime)/1000,.1) : 0;
  previousTime=timestamp;
  const activeManual = keys.size>0;
  const control = {
    throttle: Number(keys.has('w'))-Number(keys.has('s')),
    turn: Number(keys.has('d'))-Number(keys.has('a')),
    lift: Number(keys.has('e'))-Number(keys.has('q'))
  };
  if (activeManual && (control.turn || control.lift || control.throttle)) {
    flight.autopilot = false;
    landing = false;
  }
  flight=stepFlight(flight,delta,control);
  if(landing) {
    flight.throttle=0;
    flight.altitude=Math.max(0,flight.altitude-1300*delta);
    if(flight.altitude===0){landing=false;flight.speed=0;}
  }
  render(timestamp*.001);
  updateTelemetry(timestamp);
  window.requestAnimationFrame(frame);
}

$('#chat-form').addEventListener('submit',event=>{
  event.preventDefault();
  const input=$('#chat-input');
  receive(input.value);
  input.value='';
  input.focus();
});
$$('[data-prompt]').forEach(button=>button.addEventListener('click',()=>receive(button.dataset.prompt)));
$$('[data-destination]').forEach(button=>button.addEventListener('click',()=>{
  const destination=button.dataset.destination;
  routeTo(destination);
  respond('Course set for '+WAYPOINTS[destination].name+'. '+WAYPOINTS[destination].subtitle+'. Autopilot engaged.');
}));
$('#launch').addEventListener('click',()=>{act('launch');respond('Thrusters online. Captain, try not to scrape the mountain.');});
$('#autopilot').addEventListener('click',()=>{const activate=!flight.autopilot;act(activate?'autopilot_on':'autopilot_off');respond(activate?'Autopilot engaged. I have the helm.':'Autopilot disengaged. The helm is yours.');});
$('#land').addEventListener('click',()=>{act('land');respond('Landing sequence engaged. Descending to simulated ground level.');});
$('#morph').addEventListener('click',()=>{act('morph');respond(flight.morph?'Adaptive hull: glide profile online. Extremely aerodynamic, for a drawing.':'Adaptive hull: standard saucer profile restored.');});
$('#pulse').addEventListener('click',()=>{act('pulse');respond('Resonance pulse discharged. That was mostly for dramatic effect.');});
throttle.addEventListener('input',()=>{
  flight.throttle=Number(throttle.value);
  flight.autopilot=false;landing=false;syncControls();
});
$('#sound-toggle').addEventListener('click',()=>{
  soundOn=!soundOn;savePreference('sound',soundOn);
  $('#sound-toggle').setAttribute('aria-pressed',String(soundOn));
  $('#sound-toggle .btn-text').textContent=soundOn?'SOUND ON':'SOUND OFF';
  if(soundOn)beep(460);
});
$('#voice-toggle').addEventListener('click',()=>{
  if(!('speechSynthesis' in window)){respond('Speech playback is unavailable in this browser. Text comms remain active.');return;}
  voiceOn=!voiceOn;savePreference('voice',voiceOn);
  $('#voice-toggle').setAttribute('aria-pressed',String(voiceOn));
  $('#voice-toggle .btn-text').textContent=voiceOn?'VOICE ON':'VOICE OFF';
  if(voiceOn) say('Audio channel connected. PHIAX at your service.');
  else {window.speechSynthesis.cancel();orb.classList.remove('speaking');}
});

const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
const mic=$('#mic-toggle');
if(!SpeechRecognition){mic.disabled=true;mic.title='Speech recognition is unsupported in this browser';}
else{
  const recognition=new SpeechRecognition();
  recognition.lang='en-US';recognition.interimResults=false;recognition.maxAlternatives=1;
  recognition.onresult=event=>{
    const result=event.results?.[0]?.[0]?.transcript;
    if(result)receive(result);
  };
  recognition.onerror=event=>{respond('Microphone unavailable ('+event.error+'). You can still type to me.');};
  recognition.onend=()=>{listening=false;mic.classList.remove('listening');mic.setAttribute('aria-pressed','false');};
  mic.addEventListener('click',()=>{
    if(listening){recognition.stop();return;}
    try{recognition.start();listening=true;mic.classList.add('listening');mic.setAttribute('aria-pressed','true');}
    catch {respond('The microphone could not be started. Try typing instead.');}
  });
}
window.addEventListener('keydown',event=>{
  if(event.target.closest('input,textarea,button,[contenteditable]'))return;
  const key=event.key.toLowerCase();
  if(key===' '){
    if(!event.repeat){pulse();}
    event.preventDefault();
    return;
  }
  if(['w','s','a','d','q','e'].includes(key)){keys.add(key);event.preventDefault();}
});
window.addEventListener('keyup',event=>{keys.delete(event.key.toLowerCase());});
window.addEventListener('blur',()=>keys.clear());
window.addEventListener('pagehide',()=>{if('speechSynthesis' in window)window.speechSynthesis.cancel();});

soundOn=loadPreference('sound');
voiceOn=loadPreference('voice')&&('speechSynthesis' in window);
$('#sound-toggle').setAttribute('aria-pressed',String(soundOn));
$('#sound-toggle .btn-text').textContent=soundOn?'SOUND ON':'SOUND OFF';
$('#voice-toggle').setAttribute('aria-pressed',String(voiceOn));
$('#voice-toggle .btn-text').textContent=voiceOn?'VOICE ON':'VOICE OFF';
respond(GREETINGS[0]);
syncControls();
window.requestAnimationFrame(frame);
