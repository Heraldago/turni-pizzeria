const STORAGE_KEY = "turni_pizzeria_state_v3";
const ADMIN_PIN = "2323";

let isAdmin = false;
let highlightedStaffId = "";
let staffRoleFilter = "all";
let activeSwapMode = "sub"; // "sub" | "swap"

const DAY_NAMES = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica"
];

const SHORT_DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const ITALIAN_MONTHS_SHORT = [
  "gen",
  "feb",
  "mar",
  "apr",
  "mag",
  "giu",
  "lug",
  "ago",
  "set",
  "ott",
  "nov",
  "dic"
];

const CONTRACT_LABELS = {
  part_time: "Part-time Fattorino",
  full_time_combo: "Full-time Interno (Mar/Mer Fattorino)",
  weekend_only: "Part-time Weekend"
};

function getDefaultState() {
  return {
    startDate: "2026-11-30",
    weeksCount: 5,
    monthLabel: "dic 2026",
    // "draft" = Fase 1 (Bozza Titolare, nascosto ai dipendenti) | "published" = Fase 2 (Visibile + Scambi)
    schedulePhase: "published",
    options: {
      useHistoricalPoints: true,
      prioritizeHighWeightDays: true,
      allowEmployeeSwaps: true
    },
    staff: [
      { id: "beppe", name: "BEPPE", contractType: "part_time", target4: 13, target5: 16, basePoints: 60 },
      { id: "giof", name: "GIO F", contractType: "part_time", target4: 13, target5: 16, basePoints: 64 },
      { id: "moce", name: "MOCE", contractType: "part_time", target4: 13, target5: 16, basePoints: 63 },
      { id: "greg", name: "GREG", contractType: "part_time", target4: 13, target5: 16, basePoints: 59 },
      { id: "emanuel", name: "EMANUEL", contractType: "part_time", target4: 13, target5: 16, basePoints: 57 },
      { id: "giacomo", name: "GIACOMO", contractType: "part_time", target4: 13, target5: 16, basePoints: 63 },
      { id: "pier", name: "PIER", contractType: "full_time_combo", target4: 8, target5: 10, basePoints: 30 },
      { id: "mattia", name: "MATTIA", contractType: "weekend_only", target4: 4, target5: 5, basePoints: 24 }
    ],
    dayConfig: {
      0: { label: "Lunedì", weight: 0, slots: 0 },
      1: { label: "Martedì", weight: 3, slots: 3 },
      2: { label: "Mercoledì", weight: 3, slots: 3 },
      3: { label: "Giovedì", weight: 3, slots: 3 },
      4: { label: "Venerdì", weight: 4, slots: 4 },
      5: { label: "Sabato", weight: 4, slots: 4 },
      6: { label: "Domenica", weight: 5, slots: 5 },
      special: { label: "Festivi / Speciali", weight: 12, slots: 5 }
    },
    // indisponibilita[staffId] = array of dayIndex (0=Lun .. 6=Dom)
    unavailability: {
      beppe: [1, 2, 4],
      giof: [3],
      moce: [],
      greg: [],
      emanuel: [2, 3],
      giacomo: [],
      pier: [3, 4, 5, 6],
      mattia: [1, 2, 3]
    },
    // holidays["YYYY-MM-DD"] = array of staffId
    holidays: {
      "2026-12-04": ["mattia"]
    },
    // dayOverrides["YYYY-MM-DD"] = "normal" | "special" | "closed"
    dayOverrides: {},
    // daySlotOverrides["YYYY-MM-DD"] = number of slots override for a specific date
    daySlotOverrides: {},
    // assignments["YYYY-MM-DD"] = array of staffId for each slot
    assignments: {},
    // Registro scambi/sostituzioni del mese corrente
    swapLog: [],
    // Historical archive matching Riepilogo_Turni and Classifica_Punti
    historyMonths: ["ott 2026"],
    historyShifts: {
      "ott 2026": {
        beppe: 15,
        giof: 17,
        moce: 16,
        greg: 16,
        emanuel: 15,
        giacomo: 16,
        pier: 10,
        mattia: 5
      }
    },
    historyPoints: {
      "ott 2026": {
        beppe: 60,
        giof: 64,
        moce: 63,
        greg: 59,
        emanuel: 57,
        giacomo: 63,
        pier: 30,
        mattia: 24
      }
    }
  };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const def = getDefaultState();
      const merged = Object.assign(def, parsed);
      merged.options = Object.assign(def.options, parsed.options || {});
      if (!Array.isArray(merged.swapLog)) merged.swapLog = [];
      if (!merged.daySlotOverrides) merged.daySlotOverrides = {};
      if (!merged.schedulePhase) merged.schedulePhase = "published";
      merged.staff = (merged.staff || def.staff).map((p) => ({
        contractType: p.id === "pier" ? "full_time_combo" : p.id === "mattia" ? "weekend_only" : "part_time",
        ...p
      }));
      return merged;
    }
  } catch (err) {
    console.error("Errore caricamento stato:", err);
  }
  return getDefaultState();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Errore salvataggio stato:", err);
  }
}

function parseIsoDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatIsoDate(dateObj) {
  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function formatFullDisplayDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function getMondayWeekdayIndex(iso) {
  const dt = parseIsoDate(iso);
  const jsDay = dt.getUTCDay(); // 0=Sun..6=Sat
  return (jsDay + 6) % 7; // 0=Mon..6=Sun
}

function getCalendarDates() {
  const start = parseIsoDate(state.startDate);
  const totalDays = state.weeksCount * 7;
  const dates = [];
  for (let i = 0; i < totalDays; i++) {
    const cur = new Date(start.getTime() + i * 86400000);
    const iso = formatIsoDate(cur);
    const dayIndex = getMondayWeekdayIndex(iso);
    dates.push({
      iso,
      dayIndex,
      dayName: DAY_NAMES[dayIndex],
      shortDay: SHORT_DAY_NAMES[dayIndex],
      weekIndex: Math.floor(i / 7)
    });
  }
  return dates;
}

// Calcola data inizio e nome mese suggerito per il ciclo successivo
function computeNextCycleMetadata() {
  const start = parseIsoDate(state.startDate);
  const nextStart = new Date(start.getTime() + state.weeksCount * 7 * 86400000);
  const nextStartIso = formatIsoDate(nextStart);
  // Prende un giorno centrale (es. +15 gg) per determinare il mese principale del nuovo ciclo
  const midDate = new Date(nextStart.getTime() + 15 * 86400000);
  const nextMonthLabel = `${ITALIAN_MONTHS_SHORT[midDate.getUTCMonth()]} ${midDate.getUTCFullYear()}`;
  const nextEnd = new Date(nextStart.getTime() + (state.weeksCount * 7 - 1) * 86400000);
  const nextEndIso = formatIsoDate(nextEnd);
  return {
    nextStartIso,
    nextEndIso,
    nextMonthLabel
  };
}

// Calcolo Pasqua e Pasquetta per qualsiasi anno (algoritmo di Butcher-Meeus)
function getEasterIsoDates(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easter = new Date(Date.UTC(year, month - 1, day));
  const easterMonday = new Date(easter.getTime() + 86400000);
  return {
    easterIso: formatIsoDate(easter),
    easterMondayIso: formatIsoDate(easterMonday)
  };
}

// Riconoscimento automatico festività importanti e chiusure (es. 25 Dicembre chiuso)
function getAutomaticDayStatus(iso) {
  const [yStr, mStr, dStr] = iso.split("-");
  const md = `${mStr}-${dStr}`;
  const year = Number(yStr);

  // 25 Dicembre (Natale): Chiuso di default
  if (md === "12-25") {
    return { mode: "closed", holidayName: "Natale" };
  }

  // Festività nazionali e giornate ad altissimo carico in pizzeria
  const specialHolidays = {
    "01-01": "Capodanno",
    "01-06": "Epifania",
    "04-25": "25 Aprile",
    "05-01": "1° Maggio",
    "06-02": "2 Giugno",
    "08-15": "Ferragosto",
    "11-01": "Ognissanti",
    "12-08": "Immacolata",
    "12-24": "Vigilia",
    "12-26": "S. Stefano",
    "12-31": "S. Silvestro"
  };

  if (specialHolidays[md]) {
    return { mode: "special", holidayName: specialHolidays[md] };
  }

  const { easterIso, easterMondayIso } = getEasterIsoDates(year);
  if (iso === easterIso) {
    return { mode: "special", holidayName: "Pasqua" };
  }
  if (iso === easterMondayIso) {
    return { mode: "special", holidayName: "Pasquetta" };
  }

  return { mode: "normal", holidayName: "" };
}

function getEffectiveDayMode(iso, dayIndex) {
  const baseCfg = state.dayConfig[dayIndex] || { weight: 0, slots: 0 };
  const autoStatus = getAutomaticDayStatus(iso);
  const manualOverride = state.dayOverrides[iso];

  if (manualOverride) {
    return { mode: manualOverride, holidayName: autoStatus.holidayName };
  }

  if (Number(baseCfg.slots) === 0) {
    return { mode: "closed", holidayName: autoStatus.holidayName };
  }

  return autoStatus;
}

function getDayMeta(iso, dayIndex) {
  const { mode, holidayName } = getEffectiveDayMode(iso, dayIndex);
  const baseCfg = state.dayConfig[dayIndex] || { weight: 0, slots: 0 };
  const hasSlotOverride = state.daySlotOverrides && state.daySlotOverrides[iso] !== undefined;
  const overrideSlots = hasSlotOverride ? Math.max(0, Number(state.daySlotOverrides[iso])) : null;

  let baseMeta;
  if (mode === "closed") {
    baseMeta = {
      mode: "closed",
      slots: 0,
      weight: 0,
      label: holidayName ? `Chiuso (${holidayName})` : "Chiuso",
      holidayName
    };
  } else if (mode === "special") {
    const slots = Number(baseCfg.slots) > 0 ? Number(baseCfg.slots) : Number(state.dayConfig.special.slots) || 5;
    baseMeta = {
      mode: "special",
      slots,
      weight: Number(state.dayConfig.special.weight) || 12,
      label: holidayName || "Festivo",
      holidayName
    };
  } else if (Number(baseCfg.slots) === 0) {
    baseMeta = { mode: "closed", slots: 0, weight: 0, label: "Chiuso", holidayName };
  } else {
    baseMeta = {
      mode: "normal",
      slots: Number(baseCfg.slots) || 0,
      weight: Number(baseCfg.weight) || 0,
      label: DAY_NAMES[dayIndex],
      holidayName
    };
  }

  if (hasSlotOverride) {
    if (overrideSlots === 0) {
      return {
        mode: "closed",
        slots: 0,
        weight: 0,
        label: holidayName ? `Chiuso (${holidayName})` : "Chiuso",
        holidayName,
        isCustomSlots: true
      };
    }
    if (baseMeta.mode === "closed") {
      const openedMode = holidayName ? "special" : "normal";
      const openedWeight = holidayName
        ? Number(state.dayConfig.special.weight) || 12
        : Number(baseCfg.weight) || 3;
      return {
        mode: openedMode,
        slots: overrideSlots,
        weight: openedWeight,
        label: holidayName || DAY_NAMES[dayIndex],
        holidayName,
        isCustomSlots: true
      };
    }
    return {
      ...baseMeta,
      slots: overrideSlots,
      isCustomSlots: true
    };
  }

  return baseMeta;
}

function adjustDateSlots(iso, delta) {
  if (!iso) return;
  const dayIndex = getMondayWeekdayIndex(iso);
  const curMeta = getDayMeta(iso, dayIndex);
  const nextSlots = Math.max(0, Math.min(15, curMeta.slots + delta));
  if (!state.daySlotOverrides) state.daySlotOverrides = {};
  state.daySlotOverrides[iso] = nextSlots;

  const curAssigned = state.assignments[iso] ? [...state.assignments[iso]] : [];
  if (curAssigned.length > nextSlots) {
    state.assignments[iso] = curAssigned.slice(0, nextSlots);
  } else {
    while (curAssigned.length < nextSlots) {
      curAssigned.push("");
    }
    state.assignments[iso] = curAssigned;
  }

  saveState();
  renderAll();
}

function resetDateSlots(iso) {
  if (!iso || !state.daySlotOverrides) return;
  delete state.daySlotOverrides[iso];
  saveState();
  renderAll();
}

function isStaffAvailable(staffId, iso, dayIndex) {
  const unavailDays = state.unavailability[staffId] || [];
  if (unavailDays.includes(dayIndex)) return false;
  const holidayList = state.holidays[iso] || [];
  if (holidayList.includes(staffId)) return false;
  return true;
}

function getStaffTarget(person) {
  return Number(state.weeksCount) === 4 ? Number(person.target4) : Number(person.target5);
}

/**
 * Calcola per ogni collaboratore il Punteggio Massimo Potenziale nel periodo attivo
 */
function computePotentialMap(dates) {
  const potential = {};
  state.staff.forEach((p) => {
    potential[p.id] = {
      availDays: 0,
      maxAvailablePts: 0,
      targetShifts: getStaffTarget(p),
      targetPotentialPts: 1,
      historicalRatio: 0
    };
  });

  dates.forEach((d) => {
    const meta = getDayMeta(d.iso, d.dayIndex);
    if (meta.slots <= 0) return;

    state.staff.forEach((p) => {
      if (isStaffAvailable(p.id, d.iso, d.dayIndex)) {
        potential[p.id].availDays += 1;
        potential[p.id].maxAvailablePts += meta.weight;
      }
    });
  });

  state.staff.forEach((p) => {
    const info = potential[p.id];
    const avgWeightPerAvailDay = info.availDays > 0 ? info.maxAvailablePts / info.availDays : 3.5;
    const rawTargetPts = Math.round(avgWeightPerAvailDay * Math.max(1, info.targetShifts));
    info.targetPotentialPts = Math.max(1, Math.min(info.maxAvailablePts || rawTargetPts, rawTargetPts));

    const histPts = Number(p.basePoints) || 0;
    info.historicalRatio = histPts / info.targetPotentialPts;
  });

  return potential;
}

// Generatore Turni (Fase 1: Bozza) basato sulla Media Relativa al Punteggio Massimo Potenziale
function generateSchedule(shuffleTieBreak = false) {
  const dates = getCalendarDates();
  const potentialMap = computePotentialMap(dates);
  const newAssignments = {};
  const shiftCounts = {};
  const pointCounts = {};
  const lastWorkedDayIdx = {};
  const tieBreaker = {};

  state.staff.forEach((p) => {
    shiftCounts[p.id] = 0;
    pointCounts[p.id] = 0;
    lastWorkedDayIdx[p.id] = -10;
    tieBreaker[p.id] = shuffleTieBreak ? (Math.random() - 0.5) * 2.5 : 0;
  });

  for (let w = 0; w < state.weeksCount; w++) {
    const weekDays = dates
      .slice(w * 7, (w + 1) * 7)
      .map((d, idx) => ({
        ...d,
        globalIdx: w * 7 + idx,
        meta: getDayMeta(d.iso, d.dayIndex)
      }))
      .filter((d) => d.meta.slots > 0);

    weekDays.forEach((d) => {
      const availCount = state.staff.filter((p) => isStaffAvailable(p.id, d.iso, d.dayIndex)).length;
      d.slack = availCount - d.meta.slots;
    });

    weekDays.sort((a, b) => {
      if (state.options.prioritizeHighWeightDays && b.meta.weight !== a.meta.weight) {
        return b.meta.weight - a.meta.weight;
      }
      if (a.slack !== b.slack) return a.slack - b.slack;
      return b.meta.weight - a.meta.weight;
    });

    weekDays.forEach((day) => {
      const chosen = [];
      for (let s = 0; s < day.meta.slots; s++) {
        let candidates = state.staff.filter(
          (p) => !chosen.includes(p.id) && isStaffAvailable(p.id, day.iso, day.dayIndex)
        );

        const underTarget = candidates.filter((p) => shiftCounts[p.id] < getStaffTarget(p));
        if (underTarget.length > 0) {
          candidates = underTarget;
        }

        if (candidates.length === 0) {
          chosen.push("");
          continue;
        }

        candidates.sort((a, b) => {
          const potA = potentialMap[a.id];
          const potB = potentialMap[b.id];

          const targetA = Math.max(1, potA.targetShifts);
          const targetB = Math.max(1, potB.targetShifts);
          const remRatioA = (targetA - shiftCounts[a.id]) / targetA;
          const remRatioB = (targetB - shiftCounts[b.id]) / targetB;

          const currentPtRatioA = pointCounts[a.id] / potA.targetPotentialPts;
          const currentPtRatioB = pointCounts[b.id] / potB.targetPotentialPts;

          const histOffsetA = state.options.useHistoricalPoints ? potA.historicalRatio * 0.35 : 0;
          const histOffsetB = state.options.useHistoricalPoints ? potB.historicalRatio * 0.35 : 0;

          const totalRelativeLoadA = currentPtRatioA + histOffsetA;
          const totalRelativeLoadB = currentPtRatioB + histOffsetB;

          const scarcityBonusA = (35 - potA.availDays) * 1.15;
          const scarcityBonusB = (35 - potB.availDays) * 1.15;

          const equityWeight = day.meta.weight >= 5 ? 65 : 45;

          let scoreA = remRatioA * 100 - totalRelativeLoadA * equityWeight + scarcityBonusA + tieBreaker[a.id];
          let scoreB = remRatioB * 100 - totalRelativeLoadB * equityWeight + scarcityBonusB + tieBreaker[b.id];

          if (Math.abs(day.globalIdx - lastWorkedDayIdx[a.id]) === 1) scoreA -= 4;
          if (Math.abs(day.globalIdx - lastWorkedDayIdx[b.id]) === 1) scoreB -= 4;

          return scoreB - scoreA;
        });

        const pick = candidates[0];
        chosen.push(pick.id);
        shiftCounts[pick.id] += 1;
        pointCounts[pick.id] += day.meta.weight;
        lastWorkedDayIdx[pick.id] = day.globalIdx;
      }

      newAssignments[day.iso] = chosen;
    });
  }

  state.assignments = newAssignments;
  state.swapLog = [];
  saveState();
  renderAll();
}

function computeLiveStats() {
  const dates = getCalendarDates();
  const potentialMap = computePotentialMap(dates);
  const stats = {};
  const warnings = [];

  state.staff.forEach((p) => {
    const pot = potentialMap[p.id];
    stats[p.id] = {
      shifts: 0,
      points: 0,
      target: pot.targetShifts,
      maxAvailablePts: pot.maxAvailablePts,
      targetPotentialPts: pot.targetPotentialPts
    };
  });

  dates.forEach((d) => {
    const meta = getDayMeta(d.iso, d.dayIndex);
    const assigned = state.assignments[d.iso] || [];
    const seenToday = new Set();

    for (let i = 0; i < meta.slots; i++) {
      const staffId = assigned[i] || "";
      if (!staffId) continue;

      if (seenToday.has(staffId)) {
        const p = state.staff.find((x) => x.id === staffId);
        warnings.push(`${formatDisplayDate(d.iso)}: ${p ? p.name : staffId} inserito due volte nello stesso giorno.`);
      }
      seenToday.add(staffId);

      if (!isStaffAvailable(staffId, d.iso, d.dayIndex)) {
        const p = state.staff.find((x) => x.id === staffId);
        warnings.push(`${formatDisplayDate(d.iso)} (${d.shortDay}): ${p ? p.name : staffId} ha indisponibilità o ferie.`);
      }

      if (stats[staffId]) {
        stats[staffId].shifts += 1;
        stats[staffId].points += meta.weight;
      }
    }
  });

  return { stats, warnings };
}

function renderStaffFilterDropdown() {
  const select = document.getElementById("staffHighlightSelect");
  if (!select) return;

  const prevVal = highlightedStaffId;
  select.innerHTML = `<option value="">Tutti i collaboratori</option>`;
  state.staff.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === prevVal) opt.selected = true;
    select.appendChild(opt);
  });
}

function renderLifecycleUI() {
  const phaseBadge = document.getElementById("phaseBadge");
  const btnTogglePublish = document.getElementById("btnTogglePublish");
  const draftLockedNotice = document.getElementById("draftLockedNotice");
  const calendarGridContainer = document.getElementById("calendarGridContainer");
  const swapPanelCard = document.getElementById("swapPanelCard");

  const isPublished = state.schedulePhase === "published";

  if (phaseBadge) {
    if (isPublished) {
      phaseBadge.textContent = "Pubblicato";
      phaseBadge.className = "phase-badge phase-published";
    } else {
      phaseBadge.textContent = "In Bozza";
      phaseBadge.className = "phase-badge phase-draft";
    }
  }

  if (btnTogglePublish) {
    if (isPublished) {
      btnTogglePublish.textContent = "Torna in Bozza";
      btnTogglePublish.className = "btn btn-outline";
    } else {
      btnTogglePublish.textContent = "2. Pubblica ai Dipendenti";
      btnTogglePublish.className = "btn btn-publish";
    }
  }

  const hideCalendarForStaff = !isAdmin && !isPublished;
  if (draftLockedNotice) {
    draftLockedNotice.hidden = !hideCalendarForStaff;
  }
  if (calendarGridContainer) {
    calendarGridContainer.hidden = hideCalendarForStaff;
  }

  if (swapPanelCard) {
    const canSwap = isAdmin || (isPublished && state.options.allowEmployeeSwaps !== false);
    swapPanelCard.hidden = !canSwap;
  }
}

function renderRoleUI() {
  const adminElements = document.querySelectorAll(".admin-only");
  adminElements.forEach((el) => {
    el.hidden = !isAdmin;
  });

  const roleBadge = document.getElementById("roleBadge");
  const btnToggleAdmin = document.getElementById("btnToggleAdmin");
  const calHelper = document.getElementById("calendarHelperText");
  const legendList = document.getElementById("legendList");

  if (isAdmin) {
    if (roleBadge) {
      roleBadge.textContent = "Modalità Titolare";
      roleBadge.className = "role-badge role-admin";
    }
    if (btnToggleAdmin) {
      btnToggleAdmin.textContent = "Esci da Titolare";
      btnToggleAdmin.classList.add("is-active");
    }
    if (calHelper) {
      calHelper.innerHTML =
        `Clicca sull'intestazione di un giorno per cambiarlo tra <strong>Normale</strong>, <strong>Festivo (${state.dayConfig.special.weight} pt)</strong> e <strong>Chiuso</strong>.`;
    }
    if (legendList) {
      legendList.innerHTML = `
        <span class="badge badge-closed">Chiuso: 0 pt</span>
        <span class="badge badge-weekday">Mar-Gio: ${state.dayConfig[1].slots}p / ${state.dayConfig[1].weight}pt</span>
        <span class="badge badge-FriSat">Ven-Sab: ${state.dayConfig[4].slots}p / ${state.dayConfig[4].weight}pt</span>
        <span class="badge badge-sunday">Dom: ${state.dayConfig[6].slots}p / ${state.dayConfig[6].weight}pt</span>
        <span class="badge badge-special">Festivo: ${state.dayConfig.special.weight}pt</span>
      `;
    }
  } else {
    if (roleBadge) {
      roleBadge.textContent = "Vista Dipendente";
      roleBadge.className = "role-badge role-staff";
    }
    if (btnToggleAdmin) {
      btnToggleAdmin.textContent = "Area Titolare (PIN)";
      btnToggleAdmin.classList.remove("is-active");
    }
    if (calHelper) {
      calHelper.innerHTML =
        `Seleziona il tuo nome in alto per evidenziare i tuoi turni o usa il riquadro a destra per cambi turno.`;
    }
    if (legendList) {
      legendList.innerHTML = `
        <span class="badge badge-closed">Chiuso (Lun / 25 Dic)</span>
        <span class="badge badge-weekday">Mar-Gio (${state.dayConfig[1].slots} pers.)</span>
        <span class="badge badge-FriSat">Ven-Sab (${state.dayConfig[4].slots} pers.)</span>
        <span class="badge badge-sunday">Dom (${state.dayConfig[6].slots} pers.)</span>
        <span class="badge badge-special">Festivo</span>
      `;
    }

    const activeTabBtn = document.querySelector(".tab-btn.active");
    if (activeTabBtn && activeTabBtn.classList.contains("admin-only")) {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      const calBtn = document.querySelector('.tab-btn[data-tab="tab-calendario"]');
      const calPanel = document.getElementById("tab-calendario");
      if (calBtn) calBtn.classList.add("active");
      if (calPanel) calPanel.classList.add("active");
    }
  }

  renderLifecycleUI();
}

function renderCalendar() {
  const container = document.getElementById("calendarGridContainer");
  const dates = getCalendarDates();
  container.innerHTML = "";

  for (let w = 0; w < state.weeksCount; w++) {
    const weekDays = dates.slice(w * 7, (w + 1) * 7);
    const weekEl = document.createElement("div");
    weekEl.className = "week-block";

    const weekTitle = document.createElement("div");
    weekTitle.className = "week-block-title";
    weekTitle.textContent = `Settimana ${w + 1} (${formatDisplayDate(weekDays[0].iso)} - ${formatDisplayDate(weekDays[weekDays.length - 1].iso)})`;
    weekEl.appendChild(weekTitle);

    const weekGrid = document.createElement("div");
    weekGrid.className = "week-grid";
    const maxRows = Math.max(5, ...weekDays.map((wd) => getDayMeta(wd.iso, wd.dayIndex).slots));

    weekDays.forEach((d) => {
      const meta = getDayMeta(d.iso, d.dayIndex);
      const col = document.createElement("div");
      col.className = `day-column${meta.mode === "closed" ? " is-closed" : ""}`;

      const header = document.createElement("div");
      let headerColorClass = "header-weekday";
      if (meta.mode === "closed") headerColorClass = "header-closed";
      else if (meta.mode === "special") headerColorClass = "header-special";
      else if (d.dayIndex === 6) headerColorClass = "header-sunday";
      else if (d.dayIndex === 4 || d.dayIndex === 5) headerColorClass = "header-frisat";

      header.className = `day-header ${headerColorClass}${isAdmin ? "" : " is-readonly"}`;

      let metaText = "";
      if (meta.mode === "closed") {
        metaText = meta.holidayName ? `Chiuso (${meta.holidayName})` : "Chiuso";
      } else if (isAdmin) {
        const specTag = meta.mode === "special" ? ` - ${meta.label}` : "";
        metaText = `${meta.slots}p / ${meta.weight}pt${specTag}`;
      } else {
        const specTag = meta.mode === "special" ? ` (${meta.label})` : "";
        metaText = `${meta.slots} pers.${specTag}`;
      }

      if (isAdmin) {
        header.innerHTML = `
          <div class="day-header-top">
            <span>${d.shortDay} ${formatDisplayDate(d.iso)}</span>
            <div class="day-slot-stepper" title="Togli o aggiungi un turno in questo giorno">
              <button type="button" class="day-slot-btn" data-slot-delta="-1" aria-label="Togli turno">-</button>
              <button type="button" class="day-slot-btn" data-slot-delta="1" aria-label="Aggiungi turno">+</button>
            </div>
          </div>
          <span class="day-header-meta">${metaText}</span>
        `;

        header.title = `Clicca per cambiare stato giorno: Normale / Festivo (${state.dayConfig.special.weight} pt) / Chiuso`;
        header.querySelectorAll(".day-slot-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const delta = Number(btn.dataset.slotDelta);
            adjustDateSlots(d.iso, delta);
          });
        });

        header.addEventListener("click", () => {
          const cur = getEffectiveDayMode(d.iso, d.dayIndex).mode;
          const next = cur === "normal" ? "special" : cur === "special" ? "closed" : "normal";
          state.dayOverrides[d.iso] = next;
          if (state.daySlotOverrides) {
            delete state.daySlotOverrides[d.iso];
          }
          saveState();
          renderAll();
        });
      } else {
        header.innerHTML = `
          <span>${d.shortDay} ${formatDisplayDate(d.iso)}</span>
          <span class="day-header-meta">${metaText}</span>
        `;
      }

      col.appendChild(header);

      const slotsList = document.createElement("div");
      slotsList.className = "slots-list";

      const dayAssigned = state.assignments[d.iso] || [];

      for (let s = 0; s < maxRows; s++) {
        const cell = document.createElement("div");
        if (s < meta.slots) {
          cell.className = "slot-cell";
          const currentVal = dayAssigned[s] || "";
          const isHighlighted = highlightedStaffId && currentVal === highlightedStaffId;

          if (isAdmin) {
            const select = document.createElement("select");
            select.className = `slot-select${isHighlighted ? " slot-highlighted" : ""}`;

            const emptyOpt = document.createElement("option");
            emptyOpt.value = "";
            emptyOpt.textContent = "- vuoto -";
            select.appendChild(emptyOpt);

            state.staff.forEach((p) => {
              const avail = isStaffAvailable(p.id, d.iso, d.dayIndex);
              const opt = document.createElement("option");
              opt.value = p.id;
              opt.textContent = avail ? p.name : `${p.name} (Indisp.)`;
              if (p.id === currentVal) opt.selected = true;
              select.appendChild(opt);
            });

            const duplicate =
              currentVal &&
              dayAssigned.slice(0, meta.slots).filter((id) => id === currentVal).length > 1;
            if (currentVal && (!isStaffAvailable(currentVal, d.iso, d.dayIndex) || duplicate)) {
              select.classList.add("has-conflict");
            }

            select.addEventListener("change", (e) => {
              if (!state.assignments[d.iso]) {
                state.assignments[d.iso] = Array(meta.slots).fill("");
              }
              state.assignments[d.iso][s] = e.target.value;
              saveState();
              renderAll();
            });

            cell.appendChild(select);
          } else {
            const person = state.staff.find((p) => p.id === currentVal);
            const span = document.createElement("div");
            span.className = `slot-readonly${isHighlighted ? " slot-highlighted" : ""}`;
            span.textContent = person ? person.name : "-";
            cell.appendChild(span);
          }
        } else {
          cell.className = "slot-cell inactive-slot";
        }
        slotsList.appendChild(cell);
      }

      col.appendChild(slotsList);
      weekGrid.appendChild(col);
    });

    weekEl.appendChild(weekGrid);
    container.appendChild(weekEl);
  }
}

// Popola i selettori del pannello Scambi & Sostituzioni in Tempo Reale (Fase 2)
function renderSwapPanel() {
  const subDateSelect = document.getElementById("subDateSelect");
  const swapDate1Select = document.getElementById("swapDate1Select");
  const swapDate2Select = document.getElementById("swapDate2Select");
  if (!subDateSelect || !swapDate1Select || !swapDate2Select) return;

  const openDates = getCalendarDates().filter((d) => getDayMeta(d.iso, d.dayIndex).slots > 0);
  const prevSubDate = subDateSelect.value;
  const prevSwap1 = swapDate1Select.value;
  const prevSwap2 = swapDate2Select.value;

  const buildDateOptions = (selectEl, prevIso, fallbackIdx) => {
    selectEl.innerHTML = "";
    openDates.forEach((d, idx) => {
      const meta = getDayMeta(d.iso, d.dayIndex);
      const opt = document.createElement("option");
      opt.value = d.iso;
      opt.textContent = `${d.shortDay} ${formatDisplayDate(d.iso)}${meta.mode === "special" ? " (" + meta.label + ")" : ""}`;
      if (prevIso ? d.iso === prevIso : idx === fallbackIdx) {
        opt.selected = true;
      }
      selectEl.appendChild(opt);
    });
  };

  buildDateOptions(subDateSelect, prevSubDate, 0);
  buildDateOptions(swapDate1Select, prevSwap1, 0);
  buildDateOptions(swapDate2Select, prevSwap2, Math.min(1, openDates.length - 1));

  updateSubStaffSelectors();
  updateDoubleSwapStaffSelectors();
  renderSwapLog();
}

function updateSubStaffSelectors() {
  const subDateSelect = document.getElementById("subDateSelect");
  const outSelect = document.getElementById("subOutStaffSelect");
  const inSelect = document.getElementById("subInStaffSelect");
  if (!subDateSelect || !outSelect || !inSelect) return;

  const iso = subDateSelect.value;
  if (!iso) return;
  const dayIndex = getMondayWeekdayIndex(iso);
  const meta = getDayMeta(iso, dayIndex);
  const assignedIds = (state.assignments[iso] || []).slice(0, meta.slots).filter(Boolean);

  outSelect.innerHTML = "";
  if (assignedIds.length === 0) {
    outSelect.innerHTML = `<option value="">Nessun turno assegnato</option>`;
  } else {
    assignedIds.forEach((id) => {
      const p = state.staff.find((x) => x.id === id);
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = p ? p.name : id;
      outSelect.appendChild(opt);
    });
  }

  inSelect.innerHTML = "";
  const candidates = state.staff.filter((p) => !assignedIds.includes(p.id));
  candidates.forEach((p) => {
    const avail = isStaffAvailable(p.id, iso, dayIndex);
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = avail ? p.name : `${p.name} (Indisponibile)`;
    inSelect.appendChild(opt);
  });
}

function updateDoubleSwapStaffSelectors() {
  const d1Select = document.getElementById("swapDate1Select");
  const s1Select = document.getElementById("swapStaff1Select");
  const d2Select = document.getElementById("swapDate2Select");
  const s2Select = document.getElementById("swapStaff2Select");
  if (!d1Select || !s1Select || !d2Select || !s2Select) return;

  const populateAssigned = (dateIso, staffSelect) => {
    const prev = staffSelect.value;
    staffSelect.innerHTML = "";
    if (!dateIso) return;
    const dayIdx = getMondayWeekdayIndex(dateIso);
    const meta = getDayMeta(dateIso, dayIdx);
    const assigned = (state.assignments[dateIso] || []).slice(0, meta.slots).filter(Boolean);
    assigned.forEach((id) => {
      const p = state.staff.find((x) => x.id === id);
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = p ? p.name : id;
      if (id === prev) opt.selected = true;
      staffSelect.appendChild(opt);
    });
  };

  populateAssigned(d1Select.value, s1Select);
  populateAssigned(d2Select.value, s2Select);
}

function showSwapFeedback(msg, isError = false) {
  const box = document.getElementById("swapFeedbackMsg");
  if (!box) return;
  box.hidden = false;
  box.className = `swap-feedback ${isError ? "is-err" : "is-ok"}`;
  box.textContent = msg;
  setTimeout(() => {
    box.hidden = true;
  }, 4000);
}

function renderSwapLog() {
  const listEl = document.getElementById("swapHistoryList");
  const undoBtn = document.getElementById("btnUndoLastSwap");
  if (!listEl || !undoBtn) return;

  const logs = state.swapLog || [];
  undoBtn.hidden = logs.length === 0;

  if (logs.length === 0) {
    listEl.innerHTML = `<li>Nessuno scambio effettuato in questo mese.</li>`;
    return;
  }

  listEl.innerHTML = logs
    .slice()
    .reverse()
    .map((item) => `<li>${item.text}</li>`)
    .join("");
}

function renderLiveSummary() {
  const { stats, warnings } = computeLiveStats();
  const tbody = document.querySelector("#liveSummaryTable tbody");
  const tfoot = document.querySelector("#liveSummaryTable tfoot");
  const warnBox = document.getElementById("calendarWarnings");
  const staffShiftCountBox = document.getElementById("staffShiftCountBox");

  if (staffShiftCountBox) {
    if (highlightedStaffId && stats[highlightedStaffId] && state.schedulePhase === "published") {
      const p = state.staff.find((x) => x.id === highlightedStaffId);
      const st = stats[highlightedStaffId];
      staffShiftCountBox.hidden = false;
      staffShiftCountBox.innerHTML = `Turni attuali in calendario per <strong>${p ? p.name : ""}</strong>: <strong>${st.shifts} turni</strong>`;
    } else {
      staffShiftCountBox.hidden = true;
      staffShiftCountBox.innerHTML = "";
    }
  }

  if (isAdmin && warnings.length > 0) {
    warnBox.hidden = false;
    warnBox.innerHTML = `<strong>Conflitti rilevati (${warnings.length}):</strong><br>` + warnings.join("<br>");
  } else {
    warnBox.hidden = true;
    warnBox.innerHTML = "";
  }

  tbody.innerHTML = "";
  let totalShifts = 0;
  let totalTarget = 0;
  let totalPoints = 0;
  let totalTargetPotPts = 0;

  state.staff.forEach((p) => {
    const st = stats[p.id] || {
      shifts: 0,
      points: 0,
      target: 0,
      maxAvailablePts: 0,
      targetPotentialPts: 1
    };
    const diff = st.shifts - st.target;
    totalShifts += st.shifts;
    totalTarget += st.target;
    totalPoints += st.points;
    totalTargetPotPts += st.targetPotentialPts;

    let diffClass = "diff-ok";
    if (Math.abs(diff) === 1) diffClass = "diff-warn";
    else if (Math.abs(diff) > 1) diffClass = "diff-bad";

    const equityPct = st.targetPotentialPts > 0
      ? Math.round((st.points / st.targetPotentialPts) * 100)
      : 0;

    const tr = document.createElement("tr");
    tr.title = `Max punti disponibili: ${st.maxAvailablePts} pt | Quota attesa sui ${st.target} turni: ${st.targetPotentialPts} pt`;
    tr.innerHTML = `
      <td>${p.name}</td>
      <td><strong>${st.shifts}</strong> / ${st.target}</td>
      <td class="${diffClass}">${diff > 0 ? `+${diff}` : diff}</td>
      <td><strong>${st.points}</strong> / ${st.targetPotentialPts} <small>(max ${st.maxAvailablePts})</small></td>
      <td><strong>${equityPct}%</strong></td>
    `;
    tbody.appendChild(tr);
  });

  const overallDiff = totalShifts - totalTarget;
  const overallPct = totalTargetPotPts > 0 ? Math.round((totalPoints / totalTargetPotPts) * 100) : 0;
  tfoot.innerHTML = `
    <tr>
      <td>TOTALE</td>
      <td>${totalShifts} / ${totalTarget}</td>
      <td>${overallDiff > 0 ? `+${overallDiff}` : overallDiff}</td>
      <td>${totalPoints} / ${totalTargetPotPts}</td>
      <td>${overallPct}%</td>
    </tr>
  `;
}

function renderHolidaysTable() {
  const thead = document.querySelector("#holidaysTable thead");
  const tbody = document.querySelector("#holidaysTable tbody");
  const dates = getCalendarDates();

  const counts = {};
  state.staff.forEach((p) => (counts[p.id] = 0));
  dates.forEach((d) => {
    const list = state.holidays[d.iso] || [];
    list.forEach((id) => {
      if (counts[id] !== undefined) counts[id] += 1;
    });
  });

  thead.innerHTML = `
    <tr>
      <th>Totale Assenze ("X")</th>
      ${state.staff.map((p) => `<th>${counts[p.id]}</th>`).join("")}
    </tr>
    <tr>
      <th>Data</th>
      ${state.staff.map((p) => `<th>${p.name}</th>`).join("")}
    </tr>
  `;

  tbody.innerHTML = "";
  dates.forEach((d) => {
    const meta = getDayMeta(d.iso, d.dayIndex);
    const tr = document.createElement("tr");
    const dateTd = document.createElement("td");
    const closedTag = meta.mode === "closed" ? " (Chiuso)" : meta.mode === "special" ? ` (${meta.label})` : "";
    dateTd.textContent = `${d.shortDay} ${formatFullDisplayDate(d.iso)}${closedTag}`;
    tr.appendChild(dateTd);

    const list = state.holidays[d.iso] || [];
    state.staff.forEach((p) => {
      const td = document.createElement("td");
      const hasX = list.includes(p.id);
      td.className = `matrix-cell ${hasX ? "marked-x" : ""}`;
      td.textContent = hasX ? "X" : "";
      td.addEventListener("click", () => {
        const cur = state.holidays[d.iso] || [];
        if (cur.includes(p.id)) {
          state.holidays[d.iso] = cur.filter((id) => id !== p.id);
        } else {
          state.holidays[d.iso] = [...cur, p.id];
        }
        generateSchedule(false);
      });
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function renderUnavailabilityTable() {
  const thead = document.querySelector("#unavailabilityTable thead");
  const tbody = document.querySelector("#unavailabilityTable tbody");
  const activeDays = [1, 2, 3, 4, 5, 6];

  thead.innerHTML = `
    <tr>
      <th>Collaboratore</th>
      <th>Inquadramento / Ruolo</th>
      ${activeDays.map((dIdx) => `<th>${DAY_NAMES[dIdx]}</th>`).join("")}
    </tr>
  `;

  tbody.innerHTML = "";
  state.staff.forEach((p) => {
    const tr = document.createElement("tr");
    const nameTd = document.createElement("td");
    nameTd.textContent = p.name;
    tr.appendChild(nameTd);

    const roleTd = document.createElement("td");
    roleTd.style.fontSize = "0.76rem";
    roleTd.style.color = "var(--text-muted)";
    roleTd.textContent = CONTRACT_LABELS[p.contractType] || CONTRACT_LABELS.part_time;
    tr.appendChild(roleTd);

    const unavail = state.unavailability[p.id] || [];
    activeDays.forEach((dIdx) => {
      const td = document.createElement("td");
      const hasX = unavail.includes(dIdx);
      td.className = `matrix-cell ${hasX ? "marked-x" : ""}`;
      td.textContent = hasX ? "X" : "";
      td.addEventListener("click", () => {
        const cur = state.unavailability[p.id] || [];
        if (cur.includes(dIdx)) {
          state.unavailability[p.id] = cur.filter((x) => x !== dIdx);
        } else {
          state.unavailability[p.id] = [...cur, dIdx];
        }
        generateSchedule(false);
      });
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function renderHistoryTables() {
  const { stats } = computeLiveStats();
  const months = state.historyMonths;

  // 1. Riepilogo_Turni
  const shiftsHead = document.querySelector("#historyShiftsTable thead");
  const shiftsBody = document.querySelector("#historyShiftsTable tbody");
  const shiftsFoot = document.querySelector("#historyShiftsTable tfoot");

  shiftsHead.innerHTML = `
    <tr>
      <th>Nome</th>
      ${months.map((m) => `<th>${m}</th>`).join("")}
      <th>Lettore Punti Live (${state.monthLabel})</th>
    </tr>
  `;

  shiftsBody.innerHTML = "";
  const monthShiftSums = months.map(() => 0);
  let liveShiftSum = 0;

  state.staff.forEach((p) => {
    const tr = document.createElement("tr");
    const liveVal = stats[p.id] ? stats[p.id].shifts : 0;
    liveShiftSum += liveVal;

    const cells = months.map((m, i) => {
      const val = (state.historyShifts[m] && state.historyShifts[m][p.id]) || 0;
      monthShiftSums[i] += val;
      return `<td>${val}</td>`;
    });

    tr.innerHTML = `
      <td>${p.name}</td>
      ${cells.join("")}
      <td><strong>${liveVal}</strong></td>
    `;
    shiftsBody.appendChild(tr);
  });

  shiftsFoot.innerHTML = `
    <tr>
      <td>TOTALE</td>
      ${monthShiftSums.map((s) => `<td>${s}</td>`).join("")}
      <td>${liveShiftSum}</td>
    </tr>
  `;

  // 2. Classifica_Punti
  const ptsHead = document.querySelector("#historyPointsTable thead");
  const ptsBody = document.querySelector("#historyPointsTable tbody");
  const ptsFoot = document.querySelector("#historyPointsTable tfoot");

  ptsHead.innerHTML = `
    <tr>
      <th>Nome</th>
      ${months.map((m) => `<th>${m}</th>`).join("")}
      <th>Lettore Punti Live (${state.monthLabel})</th>
      <th>% sul Max Potenziale</th>
    </tr>
  `;

  ptsBody.innerHTML = "";
  const monthPtSums = months.map(() => 0);
  let livePtSum = 0;

  state.staff.forEach((p) => {
    const tr = document.createElement("tr");
    const st = stats[p.id] || { points: 0, targetPotentialPts: 1 };
    const liveVal = st.points;
    const pct = st.targetPotentialPts > 0 ? Math.round((liveVal / st.targetPotentialPts) * 100) : 0;
    livePtSum += liveVal;

    const cells = months.map((m, i) => {
      const val = (state.historyPoints[m] && state.historyPoints[m][p.id]) || 0;
      monthPtSums[i] += val;
      return `<td>${val}</td>`;
    });

    tr.innerHTML = `
      <td>${p.name}</td>
      ${cells.join("")}
      <td><strong>${liveVal}</strong> / ${st.targetPotentialPts}</td>
      <td><strong>${pct}%</strong></td>
    `;
    ptsBody.appendChild(tr);
  });

  ptsFoot.innerHTML = `
    <tr>
      <td>TOTALE</td>
      ${monthPtSums.map((s) => `<td>${s}</td>`).join("")}
      <td>${livePtSum}</td>
      <td>-</td>
    </tr>
  `;
}

function syncAssignmentsWithDayConfig() {
  const dates = getCalendarDates();
  dates.forEach((d) => {
    const meta = getDayMeta(d.iso, d.dayIndex);
    const cur = state.assignments[d.iso] ? [...state.assignments[d.iso]] : [];
    if (cur.length > meta.slots) {
      state.assignments[d.iso] = cur.slice(0, meta.slots);
    } else if (cur.length < meta.slots) {
      while (cur.length < meta.slots) {
        cur.push("");
      }
      state.assignments[d.iso] = cur;
    }
  });
}

function renderSingleDateSlotControls() {
  const dateSelect = document.getElementById("customSlotDateSelect");
  const badge = document.getElementById("customSlotCurrentBadge");
  const resetBtn = document.getElementById("btnResetDaySlot");
  if (!dateSelect || !badge) return;

  const dates = getCalendarDates();
  const prevIso = dateSelect.value;
  dateSelect.innerHTML = "";

  dates.forEach((d, idx) => {
    const meta = getDayMeta(d.iso, d.dayIndex);
    const opt = document.createElement("option");
    opt.value = d.iso;
    const customTag = state.daySlotOverrides && state.daySlotOverrides[d.iso] !== undefined ? " *" : "";
    opt.textContent = `${d.shortDay} ${formatDisplayDate(d.iso)} - ${meta.slots} turni${customTag}`;
    if (prevIso ? d.iso === prevIso : idx === 0) {
      opt.selected = true;
    }
    dateSelect.appendChild(opt);
  });

  const activeIso = dateSelect.value;
  if (activeIso) {
    const dayIdx = getMondayWeekdayIndex(activeIso);
    const meta = getDayMeta(activeIso, dayIdx);
    badge.textContent = meta.slots === 0 ? "Chiuso (0 turni)" : `${meta.slots} ${meta.slots === 1 ? "turno" : "turni"}`;
    if (resetBtn) {
      resetBtn.hidden = !(state.daySlotOverrides && state.daySlotOverrides[activeIso] !== undefined);
    }
  }
}

function renderSettingsAndWeights() {
  const staffBody = document.querySelector("#settingsStaffTable tbody");
  const staffFoot = document.querySelector("#settingsStaffTable tfoot");
  const roleFilterSelect = document.getElementById("staffRoleFilterSelect");
  if (roleFilterSelect) {
    roleFilterSelect.value = staffRoleFilter;
  }

  staffBody.innerHTML = "";

  let sum4 = 0;
  let sum5 = 0;
  let sumPts = 0;

  state.staff.forEach((p, idx) => {
    const cType = p.contractType || "part_time";
    if (staffRoleFilter !== "all" && cType !== staffRoleFilter) {
      return;
    }

    sum4 += Number(p.target4) || 0;
    sum5 += Number(p.target5) || 0;
    sumPts += Number(p.basePoints) || 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" class="input-inline input-name" value="${p.name}" data-idx="${idx}" data-field="name" /></td>
      <td>
        <select class="role-select-inline" data-idx="${idx}" data-field="contractType">
          <option value="part_time" ${cType === "part_time" ? "selected" : ""}>Part-time Fattorino</option>
          <option value="full_time_combo" ${cType === "full_time_combo" ? "selected" : ""}>Full-time Interno (Mar/Mer Fattorino)</option>
          <option value="weekend_only" ${cType === "weekend_only" ? "selected" : ""}>Part-time Weekend</option>
        </select>
      </td>
      <td>
        <div class="stepper-inline">
          <button type="button" class="btn-step" data-idx="${idx}" data-field="target4" data-delta="-1" title="Togli 1 turno (4 sett.)">-</button>
          <input type="number" min="0" max="35" class="input-inline" value="${p.target4}" data-idx="${idx}" data-field="target4" />
          <button type="button" class="btn-step" data-idx="${idx}" data-field="target4" data-delta="1" title="Aggiungi 1 turno (4 sett.)">+</button>
        </div>
      </td>
      <td>
        <div class="stepper-inline">
          <button type="button" class="btn-step" data-idx="${idx}" data-field="target5" data-delta="-1" title="Togli 1 turno (5 sett.)">-</button>
          <input type="number" min="0" max="35" class="input-inline" value="${p.target5}" data-idx="${idx}" data-field="target5" />
          <button type="button" class="btn-step" data-idx="${idx}" data-field="target5" data-delta="1" title="Aggiungi 1 turno (5 sett.)">+</button>
        </div>
      </td>
      <td><input type="number" min="0" class="input-inline" value="${p.basePoints}" data-idx="${idx}" data-field="basePoints" /></td>
      <td><button type="button" class="btn btn-outline btn-remove-staff" data-idx="${idx}">Togli</button></td>
    `;
    staffBody.appendChild(tr);
  });

  staffFoot.innerHTML = `
    <tr>
      <td>TOTALE (${state.staff.length} pers.)</td>
      <td>-</td>
      <td>${sum4}</td>
      <td>${sum5}</td>
      <td>${sumPts}</td>
      <td></td>
    </tr>
  `;

  staffBody.querySelectorAll("input, select").forEach((inp) => {
    inp.addEventListener("change", (e) => {
      const idx = Number(e.target.dataset.idx);
      const field = e.target.dataset.field;
      if (field === "name") {
        state.staff[idx].name = e.target.value.trim() || state.staff[idx].name;
      } else if (field === "contractType") {
        state.staff[idx].contractType = e.target.value;
        if (e.target.value === "full_time_combo") {
          state.unavailability[state.staff[idx].id] = [3, 4, 5, 6];
        } else if (e.target.value === "weekend_only") {
          state.unavailability[state.staff[idx].id] = [1, 2, 3];
        }
      } else {
        state.staff[idx][field] = Math.max(0, Number(e.target.value) || 0);
      }
      saveState();
      renderAll();
    });
  });

  staffBody.querySelectorAll(".btn-step").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      const field = btn.dataset.field;
      const delta = Number(btn.dataset.delta);
      const curVal = Number(state.staff[idx][field]) || 0;
      state.staff[idx][field] = Math.max(0, Math.min(35, curVal + delta));
      saveState();
      renderAll();
    });
  });

  staffBody.querySelectorAll(".btn-remove-staff").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      if (state.staff.length <= 1) return;
      const removed = state.staff[idx];
      state.staff.splice(idx, 1);

      if (removed) {
        delete state.unavailability[removed.id];
        Object.keys(state.holidays || {}).forEach((iso) => {
          state.holidays[iso] = (state.holidays[iso] || []).filter((id) => id !== removed.id);
        });
        Object.keys(state.assignments || {}).forEach((iso) => {
          state.assignments[iso] = (state.assignments[iso] || []).map((id) => (id === removed.id ? "" : id));
        });
        if (highlightedStaffId === removed.id) {
          highlightedStaffId = "";
        }
      }

      saveState();
      renderAll();
    });
  });

  // Weights Table
  const weightsBody = document.querySelector("#weightsTable tbody");
  weightsBody.innerHTML = "";
  const keys = [0, 1, 2, 3, 4, 5, 6, "special"];

  keys.forEach((k) => {
    const cfg = state.dayConfig[k];
    const tr = document.createElement("tr");
    const totalDayPts = (Number(cfg.weight) || 0) * (Number(cfg.slots) || 0);
    let badgeClass = "badge-weekday";
    if (k === 0 && Number(cfg.slots) === 0) badgeClass = "badge-closed";
    else if (Number(cfg.slots) === 0) badgeClass = "badge-closed";
    else if (k === "special") badgeClass = "badge-special";
    else if (k === 6) badgeClass = "badge-sunday";
    else if (k === 4 || k === 5) badgeClass = "badge-FriSat";

    tr.innerHTML = `
      <td><span class="badge ${badgeClass}">${cfg.label}</span></td>
      <td><input type="number" min="0" max="50" class="input-inline" value="${cfg.weight}" data-key="${k}" data-field="weight" /></td>
      <td>
        <div class="stepper-inline">
          <button type="button" class="btn-weight-step" data-key="${k}" data-delta="-1" title="Togli 1 turno/persona">-</button>
          <input type="number" min="0" max="15" class="input-inline" value="${cfg.slots}" data-key="${k}" data-field="slots" />
          <button type="button" class="btn-weight-step" data-key="${k}" data-delta="1" title="Aggiungi 1 turno/persona">+</button>
        </div>
      </td>
      <td><strong>${totalDayPts} pt</strong></td>
    `;
    weightsBody.appendChild(tr);
  });

  weightsBody.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("change", (e) => {
      const k = e.target.dataset.key;
      const field = e.target.dataset.field;
      state.dayConfig[k][field] = Math.max(0, Number(e.target.value) || 0);
      if (field === "slots") {
        syncAssignmentsWithDayConfig();
      }
      saveState();
      renderAll();
    });
  });

  weightsBody.querySelectorAll(".btn-weight-step").forEach((btn) => {
    btn.addEventListener("click", () => {
      const k = btn.dataset.key;
      const delta = Number(btn.dataset.delta);
      const curSlots = Number(state.dayConfig[k].slots) || 0;
      state.dayConfig[k].slots = Math.max(0, Math.min(15, curSlots + delta));
      syncAssignmentsWithDayConfig();
      saveState();
      renderAll();
    });
  });

  renderSingleDateSlotControls();

  document.getElementById("optUseHistoricalPoints").checked = !!state.options.useHistoricalPoints;
  document.getElementById("optAvoidBackToBackWeekend").checked = !!state.options.prioritizeHighWeightDays;
  const optSwaps = document.getElementById("optAllowEmployeeSwaps");
  if (optSwaps) {
    optSwaps.checked = state.options.allowEmployeeSwaps !== false;
  }
}

// Dialog Fase 3: Chiusura Mese, Lettore Punti & Avanzamento Ciclo
function openCloseMonthModal() {
  const modal = document.getElementById("closeMonthModal");
  const tbody = document.querySelector("#closeMonthReaderTable tbody");
  const subtitle = document.getElementById("closeMonthSubtitle");
  const nextDatesPreview = document.getElementById("nextCycleDatesPreview");
  const nextLabelInput = document.getElementById("nextCycleLabelInput");

  const { stats } = computeLiveStats();
  const { nextStartIso, nextEndIso, nextMonthLabel } = computeNextCycleMetadata();

  subtitle.innerHTML = `Il <strong>Lettore Punti</strong> ha calcolato i turni definitivi di <strong>${state.monthLabel}</strong> (inclusi <strong>${(state.swapLog || []).length}</strong> scambi/sostituzioni effettuati). Confermando, i punti vengono congelati nello storico per dare priorità equa nel mese successivo.`;

  tbody.innerHTML = "";
  state.staff.forEach((p) => {
    const st = stats[p.id] || { shifts: 0, points: 0, target: 0, targetPotentialPts: 1 };
    const pct = st.targetPotentialPts > 0 ? Math.round((st.points / st.targetPotentialPts) * 100) : 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${p.name}</strong></td>
      <td>${st.shifts} / ${st.target}</td>
      <td>${p.basePoints} pt</td>
      <td><strong>${st.points} pt</strong> <small>(su ${st.targetPotentialPts})</small></td>
      <td><strong>${pct}%</strong></td>
      <td><strong>${st.points} pt</strong></td>
    `;
    tbody.appendChild(tr);
  });

  nextDatesPreview.textContent = `${formatFullDisplayDate(nextStartIso)} -> ${formatFullDisplayDate(nextEndIso)} (${state.weeksCount} sett.)`;
  nextLabelInput.value = nextMonthLabel;

  modal.showModal();
}

function confirmCloseMonthAndAdvance() {
  const nextLabelInput = document.getElementById("nextCycleLabelInput");
  const { stats } = computeLiveStats();
  const { nextStartIso, nextMonthLabel } = computeNextCycleMetadata();
  const currentLabel = state.monthLabel.trim() || "mese";

  if (!state.historyMonths.includes(currentLabel)) {
    state.historyMonths.push(currentLabel);
  }
  state.historyShifts[currentLabel] = {};
  state.historyPoints[currentLabel] = {};

  state.staff.forEach((p) => {
    const st = stats[p.id] || { shifts: 0, points: 0 };
    state.historyShifts[currentLabel][p.id] = st.shifts;
    state.historyPoints[currentLabel][p.id] = st.points;
    p.basePoints = st.points;
  });

  // Avanza automaticamente al ciclo successivo in Fase 1 (Bozza Titolare)
  state.startDate = nextStartIso;
  state.monthLabel = (nextLabelInput && nextLabelInput.value.trim()) || nextMonthLabel;
  state.holidays = {};
  state.dayOverrides = {};
  state.daySlotOverrides = {};
  state.swapLog = [];
  state.schedulePhase = "draft";

  const modal = document.getElementById("closeMonthModal");
  if (modal) modal.close();

  generateSchedule(false);
}

function exportCsv() {
  const dates = getCalendarDates();
  const rows = [];

  for (let w = 0; w < state.weeksCount; w++) {
    const weekDays = dates.slice(w * 7, (w + 1) * 7);
    const maxSlots = Math.max(5, ...weekDays.map((d) => getDayMeta(d.iso, d.dayIndex).slots));
    rows.push(weekDays.map((d) => `${d.shortDay} ${formatDisplayDate(d.iso)}`).join(","));

    for (let s = 0; s < maxSlots; s++) {
      const slotRow = weekDays.map((d) => {
        const assigned = state.assignments[d.iso] || [];
        const staffId = assigned[s] || "";
        const person = state.staff.find((p) => p.id === staffId);
        return person ? `"${person.name}"` : '""';
      });
      rows.push(slotRow.join(","));
    }
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `turni_pizzeria_${state.monthLabel.replace(/\s+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderAll() {
  document.getElementById("startDateInput").value = state.startDate;
  document.getElementById("weeksCountSelect").value = String(state.weeksCount);
  document.getElementById("monthLabelInput").value = state.monthLabel;

  renderRoleUI();
  renderStaffFilterDropdown();
  renderCalendar();
  renderSwapPanel();
  renderLiveSummary();
  renderHolidaysTable();
  renderUnavailabilityTable();
  renderHistoryTables();
  renderSettingsAndWeights();
}

function initEvents() {
  // Tabs navigation
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });

  // Selettore evidenziazione turni dipendente
  const staffHighlightSelect = document.getElementById("staffHighlightSelect");
  if (staffHighlightSelect) {
    staffHighlightSelect.addEventListener("change", (e) => {
      highlightedStaffId = e.target.value;
      renderCalendar();
      renderLiveSummary();
    });
  }

  // Gestione Modal PIN Titolare (2323)
  const pinModal = document.getElementById("pinModal");
  const pinForm = document.getElementById("pinForm");
  const pinCodeInput = document.getElementById("pinCodeInput");
  const pinErrorMsg = document.getElementById("pinErrorMsg");
  const btnToggleAdmin = document.getElementById("btnToggleAdmin");
  const btnCancelPin = document.getElementById("btnCancelPin");

  btnToggleAdmin.addEventListener("click", () => {
    if (isAdmin) {
      isAdmin = false;
      renderAll();
      return;
    }
    pinCodeInput.value = "";
    pinErrorMsg.hidden = true;
    pinModal.showModal();
    pinCodeInput.focus();
  });

  btnCancelPin.addEventListener("click", () => {
    pinModal.close();
  });

  pinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (pinCodeInput.value.trim() === ADMIN_PIN) {
      isAdmin = true;
      pinErrorMsg.hidden = true;
      pinModal.close();
      renderAll();
    } else {
      pinErrorMsg.hidden = false;
      pinCodeInput.select();
    }
  });

  document.getElementById("startDateInput").addEventListener("change", (e) => {
    if (e.target.value) {
      state.startDate = e.target.value;
      saveState();
      renderAll();
    }
  });

  document.getElementById("weeksCountSelect").addEventListener("change", (e) => {
    state.weeksCount = Number(e.target.value);
    saveState();
    renderAll();
  });

  document.getElementById("monthLabelInput").addEventListener("change", (e) => {
    state.monthLabel = e.target.value.trim() || "mese";
    saveState();
    renderAll();
  });

  // Fase 1: Genera / Rigenera Bozza
  const btnGenerate = document.getElementById("btnGenerate");
  btnGenerate.addEventListener("click", () => {
    state.schedulePhase = "draft";
    generateSchedule(true);
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    const calTabBtn = document.querySelector('.tab-btn[data-tab="tab-calendario"]');
    if (calTabBtn) calTabBtn.classList.add("active");
    const calPanel = document.getElementById("tab-calendario");
    if (calPanel) calPanel.classList.add("active");

    const origText = "1. Genera Bozza";
    btnGenerate.textContent = "Bozza Generata ✓";
    setTimeout(() => {
      btnGenerate.textContent = origText;
    }, 1400);
  });

  // Fase 2: Pubblica ai Dipendenti / Torna in Bozza
  const btnTogglePublish = document.getElementById("btnTogglePublish");
  if (btnTogglePublish) {
    btnTogglePublish.addEventListener("click", () => {
      state.schedulePhase = state.schedulePhase === "published" ? "draft" : "published";
      saveState();
      renderAll();
    });
  }

  // Fase 3: Chiudi Mese & Lettore Punti
  const btnCloseMonthModal = document.getElementById("btnCloseMonthModal");
  const btnCancelCloseMonth = document.getElementById("btnCancelCloseMonth");
  const btnConfirmCloseMonth = document.getElementById("btnConfirmCloseMonth");

  if (btnCloseMonthModal) {
    btnCloseMonthModal.addEventListener("click", openCloseMonthModal);
  }
  if (btnCancelCloseMonth) {
    btnCancelCloseMonth.addEventListener("click", () => {
      document.getElementById("closeMonthModal").close();
    });
  }
  if (btnConfirmCloseMonth) {
    btnConfirmCloseMonth.addEventListener("click", confirmCloseMonthAndAdvance);
  }

  // Eventi Pannello Scambi & Sostituzioni in Tempo Reale
  document.querySelectorAll(".swap-mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeSwapMode = btn.dataset.swapMode;
      document.querySelectorAll(".swap-mode-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("swapSubBox").hidden = activeSwapMode !== "sub";
      document.getElementById("swapDoubleBox").hidden = activeSwapMode !== "swap";
    });
  });

  const subDateSelect = document.getElementById("subDateSelect");
  if (subDateSelect) {
    subDateSelect.addEventListener("change", updateSubStaffSelectors);
  }

  const swapDate1Select = document.getElementById("swapDate1Select");
  const swapDate2Select = document.getElementById("swapDate2Select");
  if (swapDate1Select) {
    swapDate1Select.addEventListener("change", updateDoubleSwapStaffSelectors);
  }
  if (swapDate2Select) {
    swapDate2Select.addEventListener("change", updateDoubleSwapStaffSelectors);
  }

  const btnApplySub = document.getElementById("btnApplySubstitution");
  if (btnApplySub) {
    btnApplySub.addEventListener("click", () => {
      const iso = document.getElementById("subDateSelect").value;
      const outId = document.getElementById("subOutStaffSelect").value;
      const inId = document.getElementById("subInStaffSelect").value;
      if (!iso || !outId || !inId) {
        showSwapFeedback("Seleziona data, chi esce e chi subentra.", true);
        return;
      }
      const assigned = state.assignments[iso] || [];
      const slotIdx = assigned.indexOf(outId);
      if (slotIdx === -1) {
        showSwapFeedback("Collaboratore non trovato in questa data.", true);
        return;
      }
      if (assigned.includes(inId)) {
        showSwapFeedback("Il sostituto è già in turno in questa data.", true);
        return;
      }

      const prevSnapshot = JSON.parse(JSON.stringify(state.assignments));
      state.assignments[iso][slotIdx] = inId;

      const outName = (state.staff.find((p) => p.id === outId) || {}).name || outId;
      const inName = (state.staff.find((p) => p.id === inId) || {}).name || inId;
      state.swapLog.push({
        text: `${formatDisplayDate(iso)}: <strong>${inName}</strong> sostituisce <strong>${outName}</strong>`,
        prevAssignments: prevSnapshot
      });

      saveState();
      renderAll();
      showSwapFeedback(`Sostituzione registrata: ${inName} al posto di ${outName} (${formatDisplayDate(iso)})`);
    });
  }

  const btnApplyDoubleSwap = document.getElementById("btnApplyDoubleSwap");
  if (btnApplyDoubleSwap) {
    btnApplyDoubleSwap.addEventListener("click", () => {
      const iso1 = document.getElementById("swapDate1Select").value;
      const staff1 = document.getElementById("swapStaff1Select").value;
      const iso2 = document.getElementById("swapDate2Select").value;
      const staff2 = document.getElementById("swapStaff2Select").value;

      if (!iso1 || !staff1 || !iso2 || !staff2) {
        showSwapFeedback("Seleziona entrambi i giorni e i collaboratori.", true);
        return;
      }
      if (iso1 === iso2) {
        showSwapFeedback("Per lo scambio tra 2 giorni scegli due date diverse.", true);
        return;
      }
      if (staff1 === staff2) {
        showSwapFeedback("Seleziona due collaboratori diversi da scambiare.", true);
        return;
      }

      const list1 = state.assignments[iso1] || [];
      const list2 = state.assignments[iso2] || [];
      const idx1 = list1.indexOf(staff1);
      const idx2 = list2.indexOf(staff2);

      if (idx1 === -1 || idx2 === -1) {
        showSwapFeedback("Turni selezionati non validi.", true);
        return;
      }
      if (list1.includes(staff2)) {
        showSwapFeedback(`Il collaboratore è già in turno il ${formatDisplayDate(iso1)}.`, true);
        return;
      }
      if (list2.includes(staff1)) {
        showSwapFeedback(`Il collaboratore è già in turno il ${formatDisplayDate(iso2)}.`, true);
        return;
      }

      const prevSnapshot = JSON.parse(JSON.stringify(state.assignments));
      state.assignments[iso1][idx1] = staff2;
      state.assignments[iso2][idx2] = staff1;

      const name1 = (state.staff.find((p) => p.id === staff1) || {}).name || staff1;
      const name2 = (state.staff.find((p) => p.id === staff2) || {}).name || staff2;

      state.swapLog.push({
        text: `Scambio: <strong>${name1}</strong> (${formatDisplayDate(iso1)}) ↔ <strong>${name2}</strong> (${formatDisplayDate(iso2)})`,
        prevAssignments: prevSnapshot
      });

      saveState();
      renderAll();
      showSwapFeedback(`Scambio completato tra ${name1} e ${name2}!`);
    });
  }

  const btnUndoLastSwap = document.getElementById("btnUndoLastSwap");
  if (btnUndoLastSwap) {
    btnUndoLastSwap.addEventListener("click", () => {
      if (!state.swapLog || state.swapLog.length === 0) return;
      const last = state.swapLog.pop();
      if (last && last.prevAssignments) {
        state.assignments = last.prevAssignments;
      }
      saveState();
      renderAll();
      showSwapFeedback("Ultimo scambio annullato.");
    });
  }

  document.getElementById("btnClearCalendar").addEventListener("click", () => {
    state.assignments = {};
    state.swapLog = [];
    saveState();
    renderAll();
  });

  document.getElementById("btnSaveArchive").addEventListener("click", openCloseMonthModal);

  document.getElementById("btnExportCsv").addEventListener("click", exportCsv);
  document.getElementById("btnPrint").addEventListener("click", () => window.print());

  document.getElementById("btnClearHolidays").addEventListener("click", () => {
    state.holidays = {};
    generateSchedule(false);
  });

  // Filtro Ruolo in Tab 5
  const staffRoleFilterSelect = document.getElementById("staffRoleFilterSelect");
  if (staffRoleFilterSelect) {
    staffRoleFilterSelect.addEventListener("change", (e) => {
      staffRoleFilter = e.target.value;
      renderSettingsAndWeights();
    });
  }

  const newStaffRoleSelect = document.getElementById("newStaffRoleSelect");
  const newStaffTarget4Input = document.getElementById("newStaffTarget4Input");
  const newStaffTarget5Input = document.getElementById("newStaffTarget5Input");
  const newStaffNameInput = document.getElementById("newStaffNameInput");

  if (newStaffRoleSelect && newStaffTarget4Input && newStaffTarget5Input) {
    newStaffRoleSelect.addEventListener("change", (e) => {
      const role = e.target.value;
      if (role === "full_time_combo") {
        newStaffTarget4Input.value = "8";
        newStaffTarget5Input.value = "10";
      } else if (role === "weekend_only") {
        newStaffTarget4Input.value = "4";
        newStaffTarget5Input.value = "5";
      } else {
        newStaffTarget4Input.value = "13";
        newStaffTarget5Input.value = "16";
      }
    });
  }

  const handleAddNewStaff = () => {
    const id = "staff_" + Date.now();
    const rawName = newStaffNameInput ? newStaffNameInput.value.trim() : "";
    const name = (rawName || `PERSONA ${state.staff.length + 1}`).toUpperCase();
    const contractType = newStaffRoleSelect ? newStaffRoleSelect.value : "part_time";
    const target4 = newStaffTarget4Input ? Math.max(0, Number(newStaffTarget4Input.value) || 0) : 13;
    const target5 = newStaffTarget5Input ? Math.max(0, Number(newStaffTarget5Input.value) || 0) : 16;

    state.staff.push({
      id,
      name,
      contractType,
      target4,
      target5,
      basePoints: 0
    });

    if (contractType === "full_time_combo") {
      state.unavailability[id] = [3, 4, 5, 6];
    } else if (contractType === "weekend_only") {
      state.unavailability[id] = [1, 2, 3];
    } else {
      state.unavailability[id] = [];
    }

    if (newStaffNameInput) {
      newStaffNameInput.value = "";
    }
    staffRoleFilter = "all";
    saveState();
    renderAll();
  };

  document.getElementById("btnAddStaff").addEventListener("click", handleAddNewStaff);
  if (newStaffNameInput) {
    newStaffNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddNewStaff();
      }
    });
  }

  // Gestione Aggiungi / Togli Turno su Singola Data in Tab 5
  const customSlotDateSelect = document.getElementById("customSlotDateSelect");
  const btnRemoveDaySlot = document.getElementById("btnRemoveDaySlot");
  const btnAddDaySlot = document.getElementById("btnAddDaySlot");
  const btnResetDaySlot = document.getElementById("btnResetDaySlot");

  if (customSlotDateSelect) {
    customSlotDateSelect.addEventListener("change", renderSingleDateSlotControls);
  }
  if (btnRemoveDaySlot) {
    btnRemoveDaySlot.addEventListener("click", () => {
      const iso = customSlotDateSelect ? customSlotDateSelect.value : "";
      if (iso) adjustDateSlots(iso, -1);
    });
  }
  if (btnAddDaySlot) {
    btnAddDaySlot.addEventListener("click", () => {
      const iso = customSlotDateSelect ? customSlotDateSelect.value : "";
      if (iso) adjustDateSlots(iso, 1);
    });
  }
  if (btnResetDaySlot) {
    btnResetDaySlot.addEventListener("click", () => {
      const iso = customSlotDateSelect ? customSlotDateSelect.value : "";
      if (iso) resetDateSlots(iso);
    });
  }

  document.getElementById("optUseHistoricalPoints").addEventListener("change", (e) => {
    state.options.useHistoricalPoints = e.target.checked;
    saveState();
  });

  document.getElementById("optAvoidBackToBackWeekend").addEventListener("change", (e) => {
    state.options.prioritizeHighWeightDays = e.target.checked;
    saveState();
  });

  const optAllowEmployeeSwaps = document.getElementById("optAllowEmployeeSwaps");
  if (optAllowEmployeeSwaps) {
    optAllowEmployeeSwaps.addEventListener("change", (e) => {
      state.options.allowEmployeeSwaps = e.target.checked;
      saveState();
      renderLifecycleUI();
    });
  }

  document.getElementById("btnResetDefaults").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    state = getDefaultState();
    generateSchedule(false);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initEvents();
  if (Object.keys(state.assignments).length === 0) {
    generateSchedule();
  } else {
    renderAll();
  }
});
