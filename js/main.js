// ── NAVBAR ────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// ── MOBILE MENU ───────────────────────────────
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ── SCROLL REVEAL ─────────────────────────────
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });
reveals.forEach(el => observer.observe(el));

// ── CONFIG ────────────────────────────────────
const API_URL = 'http://localhost:8000';

// Fallback slots — backend is the real source of truth
const ALL_SLOTS = [
  "6:00 AM - 7:00 AM",
  "7:00 AM - 8:00 AM",
  "8:00 AM - 9:00 AM",
  "9:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 1:00 PM",
  "1:00 PM - 2:00 PM",
  "2:00 PM - 3:00 PM",
  "3:00 PM - 4:00 PM",
  "4:00 PM - 5:00 PM",
  "5:00 PM - 6:00 PM",
  "6:00 PM - 7:00 PM",
  "7:00 PM - 8:00 PM",
  "8:00 PM - 9:00 PM",
  "9:00 PM - 10:00 PM",
];

// ── STATE ─────────────────────────────────────
let currentYear, currentMonth;
let selectedDate     = null;  // "YYYY-MM-DD"
let selectedSlots    = [];    // array of selected slot strings
let bookedSlotsCache = [];    // booked slots from API

// ── CALENDAR ──────────────────────────────────
function initCalendar() {
  const now    = new Date();
  currentYear  = now.getFullYear();
  currentMonth = now.getMonth();
  renderCalendar();
  document.getElementById('calPrev').onclick = () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
  };
  document.getElementById('calNext').onclick = () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
  };
}

function renderCalendar() {
  const monthNames = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"];
  document.getElementById('calMonthYear').textContent =
    `${monthNames[currentMonth]} ${currentYear}`;

  const firstDay    = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today       = new Date(); today.setHours(0, 0, 0, 0);
  const container   = document.getElementById('calDays');
  container.innerHTML = '';

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    container.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dayDate = new Date(currentYear, currentMonth, d);
    const cell    = document.createElement('div');
    cell.textContent = d;
    cell.className   = 'cal-day';

    if (dayDate < today) {
      cell.classList.add('past');
    } else {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      if (selectedDate === dateStr) cell.classList.add('selected');
      cell.onclick = () => pickDate(dateStr, d);
    }
    container.appendChild(cell);
  }
}

function pickDate(dateStr, d) {
  selectedDate  = dateStr;
  selectedSlots = [];
  document.getElementById('dateInput').value = dateStr;

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun",
                      "Jul","Aug","Sep","Oct","Nov","Dec"];
  document.getElementById('selectedDateDisplay').style.display = 'block';
  document.getElementById('selectedDateText').textContent =
    `${d} ${monthNames[currentMonth]} ${currentYear}`;

  renderCalendar();
  loadAvailability();
}

// ── SLOT LOADING ──────────────────────────────
async function loadAvailability() {
  const facility    = document.getElementById('facilitySelect').value;
  const date        = document.getElementById('dateInput').value;
  const grid        = document.getElementById('slotGrid');
  const placeholder = document.getElementById('slotPlaceholder');
  const legend      = document.getElementById('slotLegend');

  selectedSlots = [];
  updateSlotSummaryDisplay();

  if (!facility || !date) {
    placeholder.style.display = 'flex';
    grid.style.display        = 'none';
    legend.style.display      = 'none';
    return;
  }

  placeholder.style.display = 'none';
  grid.style.display        = 'grid';
  legend.style.display      = 'flex';
  grid.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;grid-column:1/-1;text-align:center;padding:1.5rem 1rem">Loading slots…</p>';

  try {
    const res  = await fetch(`${API_URL}/api/availability?facility=${encodeURIComponent(facility)}&date=${encodeURIComponent(date)}`);
    const data = await res.json();

    const slots      = data.all_slots || ALL_SLOTS;
    bookedSlotsCache = data.booked_slots || [];

    grid.innerHTML = '';
    slots.forEach(slot => {
      const isBooked = bookedSlotsCache.includes(slot);
      const btn = document.createElement('button');
      btn.type         = 'button';
      btn.dataset.slot = slot;
      btn.className    = 'slot-btn ' + (isBooked ? 'slot-booked' : 'slot-free');
      btn.disabled     = isBooked;
      btn.innerHTML    = `
        <span class="slot-time">${slot}</span>
        <span class="slot-status">${isBooked ? '🔴 Booked' : '🟢 Available'}</span>
      `;
      if (!isBooked) btn.onclick = () => toggleSlot(slot, btn);
      grid.appendChild(btn);
    });

    document.getElementById('slotCountSummary').textContent =
      `${data.available_count}/${data.total_slots} available`;

  } catch (err) {
    grid.innerHTML = '<p style="color:#ff6b6b;font-size:0.85rem;grid-column:1/-1;text-align:center;padding:1.5rem 1rem">⚠️ Could not load slots. Is the server running?</p>';
  }
}

// ── SLOT TOGGLE (multi-select) ─────────────────
function toggleSlot(slot, btn) {
  const idx = selectedSlots.indexOf(slot);

  if (idx === -1) {
    selectedSlots.push(slot);
    btn.classList.remove('slot-free');
    btn.classList.add('slot-selected');
    btn.querySelector('.slot-status').textContent = '✅ Selected';
  } else {
    selectedSlots.splice(idx, 1);
    btn.classList.remove('slot-selected');
    btn.classList.add('slot-free');
    btn.querySelector('.slot-status').textContent = '🟢 Available';
  }

  if (selectedSlots.length > 0) {
    document.getElementById('slotError').style.display = 'none';
    document.getElementById('slotGrid').style.outline  = '';
  }

  updateSlotSummaryDisplay();
}

// ── SELECTED SLOTS SUMMARY DISPLAY ────────────
function updateSlotSummaryDisplay() {
  const display    = document.getElementById('selectedSlotDisplay');
  const list       = document.getElementById('selectedSlotList');
  const durationEl = document.getElementById('selectedDuration');

  if (selectedSlots.length === 0) {
    display.style.display = 'none';
    return;
  }

  const facilityEl   = document.getElementById('facilitySelect');
  const facilityText = facilityEl.options[facilityEl.selectedIndex]?.text || '';

  display.style.display = 'block';
  list.innerHTML = selectedSlots
    .map(s => `<span class="selected-slot-chip">${s}</span>`)
    .join('');

  const hours = selectedSlots.length;
  durationEl.textContent =
    `${hours} hour${hours > 1 ? 's' : ''} total  •  ${facilityText}  •  ${selectedDate}`;
}

// ── BOOKING SUBMIT ────────────────────────────
async function handleBooking(e) {
  e.preventDefault();
  const form      = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  if (!selectedDate) {
    alert('⚠️ Please select a date from the calendar!');
    return;
  }

  if (selectedSlots.length === 0) {
    document.getElementById('slotError').style.display     = 'block';
    document.getElementById('slotGrid').style.outline      = '2px solid #e74c3c';
    document.getElementById('slotGrid').style.borderRadius = '8px';
    document.getElementById('slotGrid').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  submitBtn.textContent = 'Confirming…';
  submitBtn.disabled    = true;

  const bookingData = {
    name:       document.getElementById('nameInput').value,
    contact:    document.getElementById('contactInput').value,
    facility:   document.getElementById('facilitySelect').value,
    date:       selectedDate,
    time_slots: selectedSlots,
    notes:      document.getElementById('notesInput').value
  };

  try {
    const response = await fetch(`${API_URL}/api/bookings/bulk`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(bookingData)
    });
    const data = await response.json();

    if (response.ok) {
      const slotCount = data.booked_count;
      document.getElementById('modalSlotSummary').textContent =
        `${slotCount} slot${slotCount > 1 ? 's' : ''} confirmed  •  ${selectedDate}`;
      document.getElementById('modal').classList.add('open');

      // Reset everything
      form.reset();
      selectedDate     = null;
      selectedSlots    = [];
      bookedSlotsCache = [];
      updateSlotSummaryDisplay();
      document.getElementById('dateInput').value              = '';
      document.getElementById('selectedDateDisplay').style.display = 'none';
      document.getElementById('selectedSlotDisplay').style.display = 'none';
      document.getElementById('slotGrid').style.display       = 'none';
      document.getElementById('slotPlaceholder').style.display = 'flex';
      document.getElementById('slotLegend').style.display     = 'none';
      document.getElementById('slotCountSummary').textContent = '';
      renderCalendar();

    } else {
      alert('❌ ' + (data.detail || 'Booking failed. Please try again.'));
      loadAvailability(); // refresh so any slots just taken by others show as booked
    }

  } catch (err) {
    alert('⚠️ Cannot connect to booking server. Please check your connection.');
  } finally {
    submitBtn.textContent = 'Confirm Booking →';
    submitBtn.disabled    = false;
  }
}

// ── MODAL ─────────────────────────────────────
function closeModal() {
  document.getElementById('modal').classList.remove('open');
}
document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCalendar();
  document.getElementById('facilitySelect').addEventListener('change', () => {
    selectedSlots = [];
    updateSlotSummaryDisplay();
    loadAvailability();
  });
});