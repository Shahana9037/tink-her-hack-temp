/* ══════════════════════════════════════════════
   POCKET THERAPIST — Application Logic
   Vanilla JS, zero dependencies.
   ══════════════════════════════════════════════ */

// ─── STATE ───
const STATE_KEY = 'pocketTherapist';

let state = loadState();

function defaultState() {
    return {
        growthPoints: 0,
        moods: [],          // { value: 0-4, note: '', timestamp: '' }
        savedConfessions: [],
        totalActions: 0
    };
}

function loadState() {
    try {
        const raw = localStorage.getItem(STATE_KEY);
        if (raw) return { ...defaultState(), ...JSON.parse(raw) };
    } catch (e) { /* ignore */ }
    return defaultState();
}

function saveState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

// ─── DOM REFS ───
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const screens = {};
document.querySelectorAll('.screen').forEach(el => {
    const id = el.id.replace('screen-', '');
    screens[id] = el;
});

const headerBack = $('#header-back');
const headerTitle = $('#header-title');
const growthPill = $('#growth-pill');
const growthPts = $('#growth-points');

// ─── PARTICLES (Ambient background) ───
function createParticles() {
    const container = $('#particles');
    const colors = ['#DCD6F7', '#F6C6C6', '#C1E7D4', '#BDE0FE', '#FFE0CC'];
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 8 + 4;
        p.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${Math.random() * 100}%;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            animation-duration: ${Math.random() * 15 + 10}s;
            animation-delay: ${Math.random() * 10}s;
        `;
        container.appendChild(p);
    }
}

// ─── GREETING ───
function setGreeting() {
    const hour = new Date().getHours();
    let greeting;
    if (hour < 12) greeting = 'Good morning 🌤️';
    else if (hour < 17) greeting = 'Good afternoon ☀️';
    else if (hour < 21) greeting = 'Good evening 🌙';
    else greeting = 'Hey there, night owl 🦉';

    const el = $('#greeting-text');
    if (el) el.textContent = greeting;
}

// ─── NAVIGATION ───
let currentScreen = 'home';
let breathingInterval = null;

const screenTitles = {
    home: 'Pocket Therapist',
    mood: 'Mood Check',
    calm: 'Instant Calm',
    micro: 'Micro Steps',
    confess: 'Let It Out',
    suggest: 'Feel → Act',
    burn: 'Burn It'
};

function navigateTo(name) {
    if (!screens[name]) return;

    // Clean up previous screen
    if (currentScreen === 'calm') stopBreathing();

    // Switch screens
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');

    // Header
    headerTitle.textContent = screenTitles[name] || 'Pocket Therapist';
    if (name === 'home') {
        headerBack.classList.add('hidden');
    } else {
        headerBack.classList.remove('hidden');
    }

    currentScreen = name;

    // Screen-specific init
    if (name === 'micro') loadTask();
    if (name === 'mood') renderWeeklyDots();
    if (name === 'burn') resetBurnScreen();
    if (name === 'suggest') resetSuggestScreen();
}

// ─── GROWTH SYSTEM ───
const TREE_STAGES = [
    { min: 0, label: 'Seedling — just getting started', emoji: '🌱' },
    { min: 15, label: 'Sprout — growing little by little', emoji: '🌿' },
    { min: 40, label: 'Sapling — getting stronger', emoji: '🌲' },
    { min: 75, label: 'Tree — standing tall', emoji: '🌳' },
    { min: 120, label: 'Blooming — beautiful growth', emoji: '🌸' },
];

function addGrowth(pts) {
    state.growthPoints += pts;
    state.totalActions++;
    saveState();
    renderGrowth();

    // Pill pop animation
    growthPill.classList.add('pop');
    setTimeout(() => growthPill.classList.remove('pop'), 300);
}

function renderGrowth() {
    growthPts.textContent = state.growthPoints;

    // Update tree emoji on header pill
    const stage = getTreeStage();
    $('.growth-icon').textContent = stage.emoji;

    // Update tree display
    const label = $('#tree-label');
    if (label) label.textContent = stage.label;

    // Progress bar
    const fill = $('#tree-progress-fill');
    if (fill) {
        const nextStage = TREE_STAGES.find(s => s.min > state.growthPoints);
        const prevStage = getTreeStage();
        if (nextStage) {
            const pct = ((state.growthPoints - prevStage.min) / (nextStage.min - prevStage.min)) * 100;
            fill.style.width = Math.min(pct, 100) + '%';
        } else {
            fill.style.width = '100%';
        }
    }

    // Draw tree on canvas
    drawTree();
}

function getTreeStage() {
    let current = TREE_STAGES[0];
    for (const s of TREE_STAGES) {
        if (state.growthPoints >= s.min) current = s;
    }
    return current;
}

// ─── TREE CANVAS DRAWING ───
function drawTree() {
    const canvas = $('#tree-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const stage = getTreeStage();
    const idx = TREE_STAGES.indexOf(stage);

    const cx = w / 2;
    const groundY = h * 0.85;

    // Ground
    ctx.fillStyle = '#E8F5E9';
    ctx.beginPath();
    ctx.ellipse(cx, groundY, 60, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    if (idx === 0) {
        // Seedling
        ctx.strokeStyle = '#8D6E63';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, groundY);
        ctx.lineTo(cx, groundY - 30);
        ctx.stroke();

        drawLeaf(ctx, cx, groundY - 30, 12, -0.4, '#81C784');
        drawLeaf(ctx, cx, groundY - 25, 10, 0.5, '#A5D6A7');
    } else if (idx === 1) {
        // Sprout
        ctx.strokeStyle = '#795548';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, groundY);
        ctx.lineTo(cx, groundY - 50);
        ctx.stroke();

        drawLeaf(ctx, cx, groundY - 50, 16, -0.5, '#66BB6A');
        drawLeaf(ctx, cx, groundY - 45, 14, 0.6, '#81C784');
        drawLeaf(ctx, cx, groundY - 35, 12, -0.3, '#A5D6A7');
    } else if (idx === 2) {
        // Sapling
        drawTrunk(ctx, cx, groundY, 50, 5);

        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.ellipse(cx, groundY - 60, 30, 25, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#66BB6A';
        ctx.beginPath();
        ctx.ellipse(cx - 10, groundY - 50, 22, 18, -0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#81C784';
        ctx.beginPath();
        ctx.ellipse(cx + 12, groundY - 55, 20, 16, 0.2, 0, Math.PI * 2);
        ctx.fill();
    } else if (idx === 3) {
        // Full tree
        drawTrunk(ctx, cx, groundY, 65, 7);

        // Branch left
        ctx.strokeStyle = '#6D4C41';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - 3, groundY - 45);
        ctx.quadraticCurveTo(cx - 25, groundY - 55, cx - 35, groundY - 60);
        ctx.stroke();

        // Branch right
        ctx.beginPath();
        ctx.moveTo(cx + 3, groundY - 50);
        ctx.quadraticCurveTo(cx + 20, groundY - 60, cx + 30, groundY - 65);
        ctx.stroke();

        // Canopy
        const greens = ['#388E3C', '#43A047', '#4CAF50', '#66BB6A'];
        const canopyParts = [
            { x: cx, y: groundY - 80, rx: 35, ry: 28 },
            { x: cx - 20, y: groundY - 65, rx: 25, ry: 20 },
            { x: cx + 22, y: groundY - 70, rx: 24, ry: 22 },
            { x: cx, y: groundY - 95, rx: 22, ry: 18 },
        ];
        canopyParts.forEach((p, i) => {
            ctx.fillStyle = greens[i % greens.length];
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    } else {
        // Blooming
        drawTrunk(ctx, cx, groundY, 65, 7);

        // Branches
        ctx.strokeStyle = '#6D4C41';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - 3, groundY - 45);
        ctx.quadraticCurveTo(cx - 25, groundY - 55, cx - 38, groundY - 62);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 3, groundY - 50);
        ctx.quadraticCurveTo(cx + 20, groundY - 60, cx + 35, groundY - 68);
        ctx.stroke();

        // Canopy with cherry blossoms
        const canopyParts = [
            { x: cx, y: groundY - 82, rx: 36, ry: 28 },
            { x: cx - 22, y: groundY - 66, rx: 26, ry: 20 },
            { x: cx + 24, y: groundY - 72, rx: 25, ry: 22 },
            { x: cx, y: groundY - 96, rx: 22, ry: 18 },
        ];
        const pinks = ['#F8BBD0', '#F48FB1', '#EC407A', '#F06292'];
        canopyParts.forEach((p, i) => {
            ctx.fillStyle = pinks[i % pinks.length];
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Petals
        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = pinks[Math.floor(Math.random() * pinks.length)];
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            const px = cx + (Math.random() - 0.5) * 80;
            const py = groundY - 30 - Math.random() * 70;
            ctx.ellipse(px, py, 3, 4, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}

function drawTrunk(ctx, cx, groundY, height, width) {
    ctx.fillStyle = '#795548';
    ctx.beginPath();
    ctx.moveTo(cx - width, groundY);
    ctx.lineTo(cx - width + 2, groundY - height);
    ctx.lineTo(cx + width - 2, groundY - height);
    ctx.lineTo(cx + width, groundY);
    ctx.closePath();
    ctx.fill();
}

function drawLeaf(ctx, x, y, size, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(size * 0.6, 0, size, size * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ═══════════════════════════════
// MOOD FEATURE
// ═══════════════════════════════
const MOOD_DATA = [
    { emoji: '😢', word: 'Sad', color: '#BDE0FE' },
    { emoji: '😕', word: 'Overwhelmed', color: '#DCD6F7' },
    { emoji: '😐', word: 'Okay', color: '#FFE0CC' },
    { emoji: '🙂', word: 'Calm', color: '#C1E7D4' },
    { emoji: '😄', word: 'Happy', color: '#FFDAC1' },
];

function initMoodSlider() {
    const slider = $('#mood-slider');
    if (!slider) return;

    slider.addEventListener('input', () => {
        const val = parseInt(slider.value);
        const data = MOOD_DATA[val];
        const emoji = $('#mood-emoji');
        const word = $('#mood-word');

        emoji.textContent = data.emoji;
        word.textContent = data.word;
        word.style.color = '';

        // Bounce
        emoji.style.transform = 'scale(1.3) rotate(' + (Math.random() * 16 - 8) + 'deg)';
        setTimeout(() => { emoji.style.transform = 'scale(1) rotate(0)'; }, 250);
    });
}

function submitMood() {
    const slider = $('#mood-slider');
    const note = $('#mood-note');
    const val = parseInt(slider.value);

    state.moods.push({
        value: val,
        note: note.value.trim(),
        timestamp: new Date().toISOString()
    });

    // Keep only last 30 moods
    if (state.moods.length > 30) state.moods = state.moods.slice(-30);

    addGrowth(10);
    showToast("You're not alone 🤍");

    note.value = '';
    slider.value = 2;
    $('#mood-emoji').textContent = '😐';
    $('#mood-word').textContent = 'Okay';

    renderWeeklyDots();

    setTimeout(() => navigateTo('home'), 1200);
}

function renderWeeklyDots() {
    const container = $('#weekly-dots');
    if (!container) return;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7; // Mon=0

    // Get moods from this week
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    container.innerHTML = '';
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + i);

        // Find mood for this day
        const moodForDay = [...state.moods].reverse().find(m => {
            const md = new Date(m.timestamp);
            return md.toDateString() === dayDate.toDateString();
        });

        const dot = document.createElement('div');
        dot.className = 'week-dot';

        const circle = document.createElement('div');
        circle.className = 'week-dot-circle' + (moodForDay ? ' filled' : '');
        circle.textContent = moodForDay ? MOOD_DATA[moodForDay.value].emoji : '·';

        const label = document.createElement('div');
        label.className = 'week-dot-label';
        label.textContent = days[i];

        dot.appendChild(circle);
        dot.appendChild(label);
        container.appendChild(dot);
    }
}

// ═══════════════════════════════
// INSTANT CALM (Breathing)
// ═══════════════════════════════
let breathingActive = false;

function initBreathing() {
    const ring = $('#breath-ring');
    if (!ring) return;

    ring.addEventListener('click', () => {
        if (breathingActive) return;
        startBreathing();
    });
}

function startBreathing() {
    breathingActive = true;
    const ring = $('#breath-ring');
    const label = $('#breath-label');
    const hint = $('#calm-hint');
    const doneBtn = $('#calm-done-btn');

    hint.textContent = 'Follow the circle. Breathe gently.';
    doneBtn.style.display = 'flex';

    let phase = 'in'; // in → hold → out → hold → ...
    label.textContent = 'Breathe In';
    ring.className = 'breath-ring breathing-in';

    breathingInterval = setInterval(() => {
        if (phase === 'in') {
            phase = 'out';
            label.textContent = 'Breathe Out';
            ring.className = 'breath-ring breathing-out';
        } else {
            phase = 'in';
            label.textContent = 'Breathe In';
            ring.className = 'breath-ring breathing-in';
        }
    }, 4000);

    // Auto-stop after 60s
    setTimeout(() => {
        if (breathingActive) {
            addGrowth(10);
            showToast('You did amazing 🌬️');
        }
    }, 60000);
}

function stopBreathing() {
    breathingActive = false;
    clearInterval(breathingInterval);
    breathingInterval = null;

    const ring = $('#breath-ring');
    const label = $('#breath-label');
    const hint = $('#calm-hint');
    const doneBtn = $('#calm-done-btn');

    if (ring) ring.className = 'breath-ring';
    if (label) label.textContent = 'Tap to start';
    if (hint) hint.textContent = 'Tap the circle to begin breathing';
    if (doneBtn) doneBtn.style.display = 'none';
}

// ═══════════════════════════════
// MICRO THERAPY
// ═══════════════════════════════
const TASKS = [
    { title: '🌍 Grounding', text: 'Name 3 things you can see, 2 you can touch, and 1 you can hear.' },
    { title: '🫁 Breathe', text: 'Take one slow, deep breath. Hold for 3 seconds. Release slowly.' },
    { title: '💛 Gratitude', text: 'Think of one person who made you smile recently.' },
    { title: '🧘 Body Check', text: 'Drop your shoulders. Unclench your jaw. Relax your hands.' },
    { title: '📝 One Word', text: 'Describe your current feeling in one word. Just notice it.' },
    { title: '🌊 Waves', text: 'Imagine your worries as waves. Watch them come and go.' },
    { title: '🎵 Sound', text: 'Close your eyes. What\'s the softest sound you can hear?' },
    { title: '🌸 Kindness', text: 'Say something kind to yourself, as you would to a friend.' },
    { title: '🖐️ Five Senses', text: 'Touch something near you. Notice its texture and temperature.' },
    { title: '🌅 Visualize', text: 'Picture a place where you feel safe and at peace. Stay there for 10 seconds.' },
];

let currentTaskIdx = -1;

function loadTask() {
    let nextIdx;
    do {
        nextIdx = Math.floor(Math.random() * TASKS.length);
    } while (nextIdx === currentTaskIdx && TASKS.length > 1);
    currentTaskIdx = nextIdx;

    const task = TASKS[currentTaskIdx];
    const container = $('#task-stack');
    container.innerHTML = `
        <div class="task-card">
            <h3>${task.title}</h3>
            <p>${task.text}</p>
            <button class="btn btn-primary" onclick="completeTask()">Done ✨</button>
        </div>
    `;
}

function completeTask() {
    addGrowth(15);
    showToast('Well done! +15 Growth 🌱');
    loadTask();
}

function skipTask() {
    showToast('No pressure. Maybe later 🤍');
    loadTask();
}

// ═══════════════════════════════
// ANONYMOUS CONFESSION
// ═══════════════════════════════
function confessAction(type) {
    const textarea = $('#confess-text');
    const text = textarea.value.trim();
    if (!text) {
        showToast('Write something first 💭');
        return;
    }

    if (type === 'release') {
        // Just release it
        textarea.value = '';
        addGrowth(10);
        showToast('Released. You\'re free now 🕊️');
    } else if (type === 'save') {
        // Save privately
        state.savedConfessions.push({ text, timestamp: new Date().toISOString() });
        saveState();
        textarea.value = '';
        addGrowth(5);
        showToast('Saved privately 📔');
    } else if (type === 'letgo') {
        // Dissolve animation
        textarea.classList.add('dissolving');
        setTimeout(() => {
            textarea.value = '';
            textarea.classList.remove('dissolving');
            addGrowth(10);
            showToast('Let go. It\'s okay now 🤍');
        }, 1800);
    }
}

// ═══════════════════════════════
// EMOTION → ACTION SUGGESTIONS
// ═══════════════════════════════
const SUGGESTIONS_DB = [
    {
        keywords: ['anxious', 'anxiety', 'worried', 'nervous', 'panic', 'scared'],
        suggestions: [
            { icon: '🫁', title: 'Box Breathing', desc: '4 seconds in, 4 hold, 4 out, 4 hold' },
            { icon: '🌍', title: 'Grounding (5-4-3-2-1)', desc: 'Use your senses to anchor yourself' },
            { icon: '📝', title: 'Write it out', desc: 'Put the worry on paper, out of your head' },
        ]
    },
    {
        keywords: ['sad', 'down', 'depressed', 'low', 'unhappy', 'crying', 'cry', 'tears'],
        suggestions: [
            { icon: '🤗', title: 'Self-Hug', desc: 'Cross your arms, hold yourself gently for 20 seconds' },
            { icon: '🎵', title: 'Comfort Sound', desc: 'Play a song that felt like a warm blanket' },
            { icon: '🛌', title: 'Rest', desc: 'It\'s okay to lie down. You deserve rest.' },
        ]
    },
    {
        keywords: ['angry', 'mad', 'frustrated', 'furious', 'rage', 'annoyed', 'irritated'],
        suggestions: [
            { icon: '🔥', title: 'Burn It', desc: 'Write the anger and let it go' },
            { icon: '🧊', title: 'Cool Down', desc: 'Hold something cold. Splash water on your face.' },
            { icon: '🚶', title: 'Movement', desc: 'Walk it off. Even 2 minutes helps.' },
        ]
    },
    {
        keywords: ['tired', 'exhausted', 'burnout', 'drained', 'fatigue'],
        suggestions: [
            { icon: '💤', title: 'Permission to Rest', desc: 'You\'ve done enough today.' },
            { icon: '🌬️', title: 'Slow Breathing', desc: 'Just 5 deep breaths. Nothing more.' },
            { icon: '🫖', title: 'Comfort Ritual', desc: 'Make a warm drink. Sip slowly.' },
        ]
    },
    {
        keywords: ['lonely', 'alone', 'isolated', 'abandoned'],
        suggestions: [
            { icon: '📱', title: 'Reach Out', desc: 'Send one text. Even "hey" counts.' },
            { icon: '🕊️', title: 'Let It Out', desc: 'Share your feelings anonymously here' },
            { icon: '🌱', title: 'Self-Company', desc: 'You are your own first friend.' },
        ]
    },
    {
        keywords: ['stressed', 'stress', 'pressure', 'overwhelmed', 'too much'],
        suggestions: [
            { icon: '📋', title: 'One Thing', desc: 'Pick just ONE small task. Do only that.' },
            { icon: '🌬️', title: 'Instant Calm', desc: 'Use the breathing tool for 30 seconds' },
            { icon: '✋', title: 'Pause', desc: 'Put everything down for 2 minutes. Just be.' },
        ]
    },
];

const DEFAULT_SUGGESTIONS = [
    { icon: '🌬️', title: 'Breathe', desc: 'A few slow breaths always help' },
    { icon: '📝', title: 'Write', desc: 'Put your feelings into words' },
    { icon: '🌍', title: 'Ground', desc: 'Notice the world around you' },
    { icon: '🛌', title: 'Rest', desc: 'You\'re allowed to stop' },
];

function getSuggestion() {
    const input = $('#suggest-input');
    const text = input.value.trim().toLowerCase();
    if (!text) return;

    let matched = null;
    for (const group of SUGGESTIONS_DB) {
        if (group.keywords.some(kw => text.includes(kw))) {
            matched = group.suggestions;
            break;
        }
    }

    if (!matched) matched = DEFAULT_SUGGESTIONS;

    const list = $('#suggestions-list');
    list.innerHTML = '';

    matched.forEach((s, i) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.style.animationDelay = (i * 0.1) + 's';
        item.innerHTML = `
            <span class="suggestion-icon">${s.icon}</span>
            <div class="suggestion-text">
                <strong>${s.title}</strong>
                <span>${s.desc}</span>
            </div>
        `;
        list.appendChild(item);
    });

    addGrowth(5);
}

function resetSuggestScreen() {
    const input = $('#suggest-input');
    const list = $('#suggestions-list');
    if (input) input.value = '';
    if (list) list.innerHTML = '';
}

// ═══════════════════════════════
// BURN IT
// ═══════════════════════════════
function burnIt() {
    const textarea = $('#burn-text');
    const overlay = $('#burn-overlay');
    const btn = $('#burn-btn');
    const msg = $('#burn-msg');

    if (!textarea.value.trim()) {
        showToast('Write something to burn 🔥');
        return;
    }

    textarea.readOnly = true;
    btn.disabled = true;

    // Start burn animation
    textarea.classList.add('burning');
    overlay.classList.add('active');

    setTimeout(() => {
        textarea.value = '';
        textarea.classList.remove('burning');
        textarea.readOnly = false;
        btn.disabled = false;

        msg.classList.remove('hidden');
        addGrowth(10);
        showToast("It's gone. You're free 🕊️");

        setTimeout(() => {
            overlay.classList.remove('active');
        }, 500);
    }, 2200);
}

function resetBurnScreen() {
    const textarea = $('#burn-text');
    const overlay = $('#burn-overlay');
    const msg = $('#burn-msg');
    const btn = $('#burn-btn');

    if (textarea) { textarea.value = ''; textarea.readOnly = false; textarea.classList.remove('burning'); }
    if (overlay) overlay.classList.remove('active');
    if (msg) msg.classList.add('hidden');
    if (btn) btn.disabled = false;
}

// ═══════════════════════════════
// TOAST SYSTEM
// ═══════════════════════════════
function showToast(message) {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 2500);
}

// ═══════════════════════════════
// INIT
// ═══════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    setGreeting();
    initMoodSlider();
    initBreathing();
    renderGrowth();
    renderWeeklyDots();
});
