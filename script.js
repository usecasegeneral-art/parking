/**
 * SmartPark Pro - Client-Side Intelligent Parking System
 * Pure HTML / CSS / JS Static Architecture
 * 
 * Exports:
 *   updateParking(data)
 *   updateParkingSlots(data)
 * 
 * Usage:
 *   import { updateParking } from "./script.js";
 *   updateParking({ slot_1: 0, slot_2: 1, slot_3: 0 }); // 0 = Free, 1 = Occupied
 * 
 * Or via global window:
 *   window.updateParking(data);
 */

// --- Internal State ---
const state = {
  slots: new Map(),     // slotKey -> { status: 0|1, since: number, el: HTMLElement }
  filter: 'all',        // 'all' | 'free' | 'occupied'
  searchTerm: '',       // filter slot by name
  isCompact: false,     // compact density mode
  audioEnabled: false,  // sound effects
  firstLoad: true       // prevent toast barrage on initial render
};

// Sports car color palette for visual variety when slots are occupied
const CAR_COLORS = [
  { body: '#2563eb', roof: '#1d4ed8', glass: '#93c5fd' }, // Cobalt Blue
  { body: '#dc2626', roof: '#b91c1c', glass: '#fca5a5' }, // Crimson Red
  { body: '#475569', roof: '#334155', glass: '#cbd5e1' }, // Graphite Slate
  { body: '#059669', roof: '#047857', glass: '#6ee7b7' }, // Emerald Pearl
  { body: '#d97706', roof: '#b45309', glass: '#fde68a' }, // Amber Metallic
  { body: '#7c3aed', roof: '#6d28d9', glass: '#c4b5fd' }, // Royal Violet
  { body: '#0891b2', roof: '#0e7490', glass: '#67e8f9' }, // Cyan Blue
  { body: '#e11d48', roof: '#be123c', glass: '#fda4af' }  // Ruby
];

// Hash helper to assign a consistent car color per slot identifier
function getCarColorForSlot(slotKey) {
  let hash = 0;
  for (let i = 0; i < slotKey.length; i++) {
    hash = slotKey.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CAR_COLORS.length;
  return CAR_COLORS[index];
}

// Top-Down Vector Car SVG Generator
function getCarSvg(slotKey) {
  const col = getCarColorForSlot(slotKey);
  return `
    <svg class="topdown-car-svg" viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Wheels / Tires -->
      <rect x="10" y="24" width="8" height="24" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      <rect x="82" y="24" width="8" height="24" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      <rect x="10" y="112" width="8" height="24" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      <rect x="82" y="112" width="8" height="24" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>

      <!-- Aerodynamic Chassis -->
      <path d="M 22 28 
               C 22 14, 34 8, 50 8 
               C 66 8, 78 14, 78 28 
               C 80 48, 83 100, 80 134 
               C 78 152, 68 154, 50 154 
               C 32 154, 22 152, 20 134 
               C 17 100, 20 48, 22 28 Z" 
            fill="${col.body}" 
            stroke="rgba(255,255,255,0.25)" 
            stroke-width="2"/>

      <!-- Headlights -->
      <polygon points="26,12 34,10 32,16 26,18" fill="#fef08a" opacity="0.9"/>
      <polygon points="74,12 66,10 68,16 74,18" fill="#fef08a" opacity="0.9"/>

      <!-- Mirrors -->
      <rect x="12" y="44" width="7" height="12" rx="2" fill="${col.roof}"/>
      <rect x="81" y="44" width="7" height="12" rx="2" fill="${col.roof}"/>

      <!-- Windshield -->
      <path d="M 27 48 C 34 44, 66 44, 73 48 C 71 62, 29 62, 27 48 Z" 
            fill="${col.glass}" stroke="#0f172a" stroke-width="1.5" opacity="0.85"/>

      <!-- Roof & Sunroof -->
      <rect x="29" y="60" width="42" height="42" rx="6" fill="${col.roof}"/>
      <rect x="34" y="66" width="32" height="22" rx="4" fill="#0f172a" opacity="0.45"/>

      <!-- Rear Window -->
      <path d="M 29 108 C 38 104, 62 104, 71 108 C 69 118, 31 118, 29 108 Z" 
            fill="${col.glass}" stroke="#0f172a" stroke-width="1.5" opacity="0.8"/>

      <!-- Tail Lights -->
      <rect x="24" y="146" width="10" height="4" rx="1.5" fill="#ef4444"/>
      <rect x="66" y="146" width="10" height="4" rx="1.5" fill="#ef4444"/>
    </svg>
  `;
}

// Helpers
const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const formatLabel = (key) => key.replace(/_/g, ' ').toUpperCase();
const normalizeStatus = (val) => (val === 1 || val === '1' || val === true ? 1 : 0);

// Web Audio API Synthesizer (No external audio files needed)
const audioCtx = (window.AudioContext || window.webkitAudioContext) 
  ? new (window.AudioContext || window.webkitAudioContext)() 
  : null;

function playAudioChime(type) {
  if (!state.audioEnabled || !audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'entry') {
      osc.frequency.setValueAtTime(560, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } else {
      osc.frequency.setValueAtTime(360, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(680, audioCtx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    }
  } catch (err) {
    console.warn('[SmartPark] Audio error:', err);
  }
}

// Live Status Change Toast Alert
function showToast(message, isOccupied) {
  const container = document.getElementById('toastsContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${isOccupied ? 'toast-occupied' : 'toast-free'}`;
  toast.innerHTML = `
    <span>${isOccupied ? '🚗' : '🟢'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// DOM Cache Elements
const dom = {
  parkingGrid: document.getElementById('parkingGrid'),
  emptyState: document.getElementById('emptyState'),
  totalSlotsCount: document.getElementById('totalSlotsCount'),
  freeSlotsCount: document.getElementById('freeSlotsCount'),
  occupiedSlotsCount: document.getElementById('occupiedSlotsCount'),
  freePercentage: document.getElementById('freePercentage'),
  occupiedPercentage: document.getElementById('occupiedPercentage'),
  occupancyRate: document.getElementById('occupancyRate'),
  occupancyGaugePath: document.getElementById('occupancyGaugePath'),
  occupancyBadge: document.getElementById('occupancyBadge'),
  lastUpdatedTime: document.getElementById('lastUpdatedTime'),
  filterCountAll: document.getElementById('filterCountAll'),
  filterCountFree: document.getElementById('filterCountFree'),
  filterCountOccupied: document.getElementById('filterCountOccupied'),
  slotSearchInput: document.getElementById('slotSearchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  toggleDensityBtn: document.getElementById('toggleDensityBtn'),
  toggleAudioBtn: document.getElementById('toggleAudioBtn'),
  audioIconOn: document.getElementById('audioIconOn'),
  audioIconOff: document.getElementById('audioIconOff'),
  filterButtons: document.querySelectorAll('.filter-btn')
};

/**
 * Creates a display-only slot DOM element
 */
function createSlotElement(slotKey) {
  const el = document.createElement('div');
  el.className = 'parking-slot-card';
  el.dataset.slotKey = slotKey;
  return el;
}

/**
 * Updates a single slot card's appearance based on status and filter
 */
function applySlotState(slotRecord, slotKey) {
  const isOccupied = slotRecord.status === 1;
  const cardEl = slotRecord.el;
  const displayTitle = formatLabel(slotKey);
  const statusLabel = isOccupied ? 'OCCUPIED' : 'AVAILABLE';

  // Toggle classes
  cardEl.className = `parking-slot-card ${isOccupied ? 'status-occupied' : 'status-free'}`;
  cardEl.setAttribute('aria-label', `${displayTitle}: ${statusLabel}`);

  // Inner DOM
  cardEl.innerHTML = `
    <div class="curb-bumper"></div>
    <div class="slot-header">
      <span class="slot-name-badge">${displayTitle}</span>
      <div class="bay-sensor-led" title="Sensor LED">
        <span class="led-indicator"></span>
      </div>
    </div>

    <div class="slot-stage">
      ${isOccupied 
        ? `<div class="car-container">${getCarSvg(slotKey)}</div>` 
        : `<div class="vacant-graphics">
            <div class="park-guide-lines">
              <span class="park-icon-p">P</span>
            </div>
           </div>`
      }
    </div>

    <div class="slot-footer">
      <span class="status-badge">${statusLabel}</span>
    </div>
  `;

  // Search & Filter visibility
  applySlotVisibility(slotRecord, slotKey);
}

/**
 * Controls card visibility based on active filter and search term
 */
function applySlotVisibility(slotRecord, slotKey) {
  const isOccupied = slotRecord.status === 1;
  const matchesFilter = (
    state.filter === 'all' ||
    (state.filter === 'free' && !isOccupied) ||
    (state.filter === 'occupied' && isOccupied)
  );

  const search = state.searchTerm.toLowerCase().trim();
  const matchesSearch = !search || 
    slotKey.toLowerCase().includes(search) || 
    formatLabel(slotKey).toLowerCase().includes(search);

  slotRecord.el.style.display = (matchesFilter && matchesSearch) ? 'flex' : 'none';
}

/**
 * Updates aggregate statistics, counters, and the circular gauge
 */
function updateAggregateStats() {
  const total = state.slots.size;
  let occupied = 0;

  state.slots.forEach(record => {
    if (record.status === 1) occupied++;
  });

  const free = total - occupied;
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const freeRate = total > 0 ? Math.round((free / total) * 100) : 0;

  // Counts
  dom.totalSlotsCount.textContent = total;
  dom.freeSlotsCount.textContent = free;
  dom.occupiedSlotsCount.textContent = occupied;

  // Percentages
  dom.freePercentage.textContent = `${freeRate}% bays open`;
  dom.occupiedPercentage.textContent = `${occupancyRate}% bays active`;
  dom.occupancyRate.textContent = `${occupancyRate}%`;

  // Filter tabs count
  dom.filterCountAll.textContent = total;
  dom.filterCountFree.textContent = free;
  dom.filterCountOccupied.textContent = occupied;

  // Circular gauge SVG animation
  if (dom.occupancyGaugePath) {
    dom.occupancyGaugePath.setAttribute('stroke-dasharray', `${occupancyRate}, 100`);

    const badge = dom.occupancyBadge;
    if (total === 0) {
      dom.occupancyGaugePath.style.stroke = 'var(--text-dim)';
      badge.className = 'occupancy-badge badge-green';
      badge.textContent = 'NO DATA';
    } else if (occupancyRate >= 85) {
      dom.occupancyGaugePath.style.stroke = 'var(--danger)';
      badge.className = 'occupancy-badge badge-red';
      badge.textContent = occupancyRate === 100 ? 'LOT FULL' : 'HIGH DEMAND';
    } else if (occupancyRate >= 50) {
      dom.occupancyGaugePath.style.stroke = 'var(--warning)';
      badge.className = 'occupancy-badge badge-amber';
      badge.textContent = 'MODERATE';
    } else {
      dom.occupancyGaugePath.style.stroke = 'var(--success)';
      badge.className = 'occupancy-badge badge-green';
      badge.textContent = 'LIGHT DEMAND';
    }
  }

  // Empty state toggle
  if (total === 0) {
    dom.emptyState.classList.remove('hidden');
  } else {
    dom.emptyState.classList.add('hidden');
  }
}

/**
 * Formats and updates the last updated clock
 */
function updateTimestamp() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  dom.lastUpdatedTime.textContent = `Updated: ${timeStr}`;
}

/**
 * MAIN UPDATE FUNCTION
 * Accepts: {"slot_1": 0, "slot_2": 1, "slot_3": 0}
 * 0 = Free, 1 = Occupied
 * Dynamically reconciles slot bays matching the keys in `data`.
 */
export function updateParking(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    console.error('[SmartPark] Invalid data supplied. Expected an object like {"slot_1": 0, "slot_2": 1}', data);
    return;
  }

  const keys = Object.keys(data).sort(naturalSort);
  const now = Date.now();

  // 1. Remove bays that are no longer in data
  state.slots.forEach((record, slotKey) => {
    if (!(slotKey in data)) {
      record.el.remove();
      state.slots.delete(slotKey);
    }
  });

  // 2. Add or update bays
  keys.forEach(slotKey => {
    const status = normalizeStatus(data[slotKey]);
    let record = state.slots.get(slotKey);

    if (!record) {
      // New slot
      const el = createSlotElement(slotKey);
      record = { status, since: now, el };
      state.slots.set(slotKey, record);
      applySlotState(record, slotKey);
    } else if (record.status !== status) {
      // Status transition detected
      record.status = status;
      record.since = now;
      applySlotState(record, slotKey);

      // Animation & notification for live changes
      if (!state.firstLoad) {
        record.el.classList.remove('flash-change');
        void record.el.offsetWidth; // Trigger reflow for CSS animation
        record.el.classList.add('flash-change');

        const isOcc = status === 1;
        showToast(`${formatLabel(slotKey)} is now ${isOcc ? 'Occupied' : 'Available'}`, isOcc);
        playAudioChime(isOcc ? 'entry' : 'exit');
      }
    } else {
      // Ensure visibility is correct
      applySlotVisibility(record, slotKey);
    }
  });

  // 3. Keep DOM in natural sorted order
  keys.forEach(slotKey => {
    const record = state.slots.get(slotKey);
    if (record && record.el) {
      dom.parkingGrid.appendChild(record.el);
    }
  });

  state.firstLoad = false;
  updateAggregateStats();
  updateTimestamp();
}

// Alias for convenience
export const updateParkingSlots = updateParking;

// Bind to window for global script or Firebase listener usage
if (typeof window !== 'undefined') {
  window.updateParking = updateParking;
  window.updateParkingSlots = updateParking;
}

// --- Filter and Search Event Listeners ---
dom.filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    dom.filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.filter = btn.dataset.filter;
    state.slots.forEach((rec, key) => applySlotVisibility(rec, key));
  });
});

dom.slotSearchInput.addEventListener('input', (e) => {
  state.searchTerm = e.target.value;
  if (state.searchTerm) {
    dom.clearSearchBtn.classList.remove('hidden');
  } else {
    dom.clearSearchBtn.classList.add('hidden');
  }
  state.slots.forEach((rec, key) => applySlotVisibility(rec, key));
});

dom.clearSearchBtn.addEventListener('click', () => {
  dom.slotSearchInput.value = '';
  state.searchTerm = '';
  dom.clearSearchBtn.classList.add('hidden');
  state.slots.forEach((rec, key) => applySlotVisibility(rec, key));
});

// Toggle Compact Density Mode
dom.toggleDensityBtn.addEventListener('click', () => {
  state.isCompact = !state.isCompact;
  dom.parkingGrid.classList.toggle('compact-view', state.isCompact);
  dom.toggleDensityBtn.classList.toggle('active', state.isCompact);
  const labelSpan = dom.toggleDensityBtn.querySelector('span');
  if (labelSpan) {
    labelSpan.textContent = state.isCompact ? 'Comfort View' : 'Compact View';
  }
});

// Sound Toggle
dom.toggleAudioBtn.addEventListener('click', () => {
  state.audioEnabled = !state.audioEnabled;
  dom.audioIconOn.classList.toggle('hidden', !state.audioEnabled);
  dom.audioIconOff.classList.toggle('hidden', state.audioEnabled);
  if (state.audioEnabled) {
    playAudioChime('exit');
  }
});

// Initialize aggregate empty statistics on load
updateAggregateStats();
