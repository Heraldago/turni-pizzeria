const STORAGE_KEY = "turni_pizzeria_state_v1";

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

function getDefaultState() {
  return {
    startDate: "2026-11-30",
    weeksCount: 5,
    monthLabel: "dic 2026",
    options: {
      useHistoricalPoints: false,
      prioritizeHighWeightDays: true
    },
    staff: [
      { id: "beppe", name: "BEPPE", target4: 13, target5: 16, basePoints: 60 },
      { id: "giof", name: "GIO F", target4: 13, target5: 16, basePoints: 64 },
      { id: "moce", name: "MOCE", target4: 13, target5: 16, basePoints: 63 },
      { id: "greg", name: "GREG", target4: 13, target5: 16, basePoints: 59 },
      { id: "emanuel", name: "EMANUEL", target4: 13, target5: 16, basePoints: 57 },
      { id: "giacomo", name: "GIACOMO", target4: 13, target5: 16, basePoints: 63 },
      { id: "pier", name: "PIER", target4: 8, target5: 10, basePoints: 30 },
      { id: "mattia", name: "MATTIA", target4: 4, target5: 5, basePoints: 24 }
    ],
    dayConfig: {
      0: { label: "Lunedì", weight: 0, slots: 0 },
      1: { label: "Martedì", weight: 3, slots: 3 },
      2: { label: "Mercoledì", weight: 3, slots: 3 },
      3: { label: "Giovedì", weight: 3, slots: 3 },
      4: { label: "Venerdì", weight: 4, slots: 4 },
      5: { label: "Sabato", weight: 4, slots: 4 },
      6: { label: "Domenica", weight: 5, slots: 5 },
      special: { label: "Speciali", weight: 8, slots: 5 }
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
    // assignments["YYYY-MM-DD"] = array of staffId for each slot
    assignments: {},
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
      return Object.assign(getDefaultState(), JSON.parse(raw));
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

function getDayMeta(iso, dayIndex) {
  const override = state.dayOverrides[iso] || "normal";
  if (override === "closed") {
    return { mode: "closed", slots: 0, weight: 0, label: "Chiuso" };
  }
  if (override === "special") {
    const baseCfg = state.dayConfig[dayIndex] || { slots: 4 };
    const slots = baseCfg.slots > 0 ? baseCfg.slots : state.dayConfig.special.slots;
    return {
      mode: "special",
      slots,
      weight: Number(state.dayConfig.special.weight) || 8,
      label: "Speciale"
    };
  }
  const cfg = state.dayConfig[dayIndex] || { weight: 0, slots: 0 };
  if (cfg.slots === 0) {
    return { mode: "closed", slots: 0, weight: 0, label: "Chiuso" };
  }
  return {
    mode: "normal",
    slots: Number(cfg.slots) || 0,
    weight: Number(cfg.weight) || 0,
    label: DAY_NAMES[dayIndex]
  };
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

// Smart Shift Generator matching Gg's Excel constraints and points equity
function generateSchedule() {
  const dates = getCalendarDates();
  const newAssignments = {};
  const shiftCounts = {};
  const pointCounts = {};
  const lastWorkedDayIdx = {};

  state.staff.forEach((p) => {
    shiftCounts[p.id] = 0;
    pointCounts[p.id] = state.options.useHistoricalPoints ? Number(p.basePoints) || 0 : 0;
    lastWorkedDayIdx[p.id] = -10;
  });

  // Group by week so each week is balanced progressively
  for (let w = 0; w < state.weeksCount; w++) {
    const weekDays = dates
      .slice(w * 7, (w + 1) * 7)
      .map((d, idx) => ({
        ...d,
        globalIdx: w * 7 + idx,
        meta: getDayMeta(d.iso, d.dayIndex)
      }))
      .filter((d) => d.meta.slots > 0);

    // Order days in the week:
    // Calculate how many available people each day has to prioritize tightest constraints first
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
        // Available staff not already in chosen for this day
        let candidates = state.staff.filter(
          (p) => !chosen.includes(p.id) && isStaffAvailable(p.id, day.iso, day.dayIndex)
        );

        // Prefer staff who still need shifts to reach target
        const underTarget = candidates.filter((p) => shiftCounts[p.id] < getStaffTarget(p));
        if (underTarget.length > 0) {
          candidates = underTarget;
        }

        if (candidates.length === 0) {
          chosen.push("");
          continue;
        }

        // Count how many days in a normal week each candidate can work (specialist priority: e.g. PIER only Tue/Wed, MATTIA only Fri/Sat/Sun)
        candidates.sort((a, b) => {
          const targetA = Math.max(1, getStaffTarget(a));
          const targetB = Math.max(1, getStaffTarget(b));
          const remRatioA = (targetA - shiftCounts[a.id]) / targetA;
          const remRatioB = (targetB - shiftCounts[b.id]) / targetB;

          const availDaysCountA = 6 - (state.unavailability[a.id] || []).length;
          const availDaysCountB = 6 - (state.unavailability[b.id] || []).length;

          // Expected points per shift target ratio
          const expectedPtsA = targetA * 3.85;
          const expectedPtsB = targetB * 3.85;
          const ptRatioA = pointCounts[a.id] / expectedPtsA;
          const ptRatioB = pointCounts[b.id] / expectedPtsB;

          // Score: higher is better
          let scoreA = remRatioA * 100 - ptRatioA * 45 - availDaysCountA * 3.5;
          let scoreB = remRatioB * 100 - ptRatioB * 45 - availDaysCountB * 3.5;

          // Small penalty for working too many consecutive days
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
  saveState();
  renderAll();
}

function computeLiveStats() {
  const dates = getCalendarDates();
  const stats = {};
  const warnings = [];

  state.staff.forEach((p) => {
    stats[p.id] = {
      shifts: 0,
      points: 0,
      target: getStaffTarget(p)
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

      header.className = `day-header ${headerColorClass}`;
      header.title = "Clicca per cambiare stato giorno: Normale / Speciale (8 pt) / Chiuso";
      header.innerHTML = `
        <span>${d.shortDay} ${formatDisplayDate(d.iso)}</span>
        <span class="day-header-meta">${
          meta.mode === "closed"
            ? "Chiuso"
            : `${meta.slots} pers. / ${meta.weight} pt${meta.mode === "special" ? " (Spec.)" : ""}`
        }</span>
      `;

      header.addEventListener("click", () => {
        const cur = state.dayOverrides[d.iso] || "normal";
        const next = cur === "normal" ? "special" : cur === "special" ? "closed" : "normal";
        state.dayOverrides[d.iso] = next;
        saveState();
        renderAll();
      });

      col.appendChild(header);

      const slotsList = document.createElement("div");
      slotsList.className = "slots-list";

      const maxRows = 5;
      const dayAssigned = state.assignments[d.iso] || [];

      for (let s = 0; s < maxRows; s++) {
        const cell = document.createElement("div");
        if (s < meta.slots) {
          cell.className = "slot-cell";
          const select = document.createElement("select");
          select.className = "slot-select";
          const currentVal = dayAssigned[s] || "";

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

function renderLiveSummary() {
  const { stats, warnings } = computeLiveStats();
  const tbody = document.querySelector("#liveSummaryTable tbody");
  const tfoot = document.querySelector("#liveSummaryTable tfoot");
  const warnBox = document.getElementById("calendarWarnings");

  if (warnings.length > 0) {
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

  state.staff.forEach((p) => {
    const st = stats[p.id] || { shifts: 0, points: 0, target: 0 };
    const diff = st.shifts - st.target;
    totalShifts += st.shifts;
    totalTarget += st.target;
    totalPoints += st.points;

    let diffClass = "diff-ok";
    if (Math.abs(diff) === 1) diffClass = "diff-warn";
    else if (Math.abs(diff) > 1) diffClass = "diff-bad";

    const avg = st.shifts > 0 ? (st.points / st.shifts).toFixed(2) : "0.00";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td><strong>${st.shifts}</strong> / ${st.target}</td>
      <td class="${diffClass}">${diff > 0 ? `+${diff}` : diff}</td>
      <td><strong>${st.points}</strong></td>
      <td>${avg}</td>
    `;
    tbody.appendChild(tr);
  });

  const overallDiff = totalShifts - totalTarget;
  tfoot.innerHTML = `
    <tr>
      <td>TOTALE</td>
      <td>${totalShifts} / ${totalTarget}</td>
      <td>${overallDiff > 0 ? `+${overallDiff}` : overallDiff}</td>
      <td>${totalPoints}</td>
      <td>${totalShifts > 0 ? (totalPoints / totalShifts).toFixed(2) : "0.00"}</td>
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
      <th>COUNTIF ("X")</th>
      ${state.staff.map((p) => `<th>${counts[p.id]}</th>`).join("")}
    </tr>
    <tr>
      <th>Data</th>
      ${state.staff.map((p) => `<th>${p.name}</th>`).join("")}
    </tr>
  `;

  tbody.innerHTML = "";
  dates.forEach((d) => {
    const tr = document.createElement("tr");
    const dateTd = document.createElement("td");
    dateTd.textContent = `${d.shortDay} ${formatFullDisplayDate(d.iso)}`;
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
        saveState();
        renderAll();
      });
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function renderUnavailabilityTable() {
  const thead = document.querySelector("#unavailabilityTable thead");
  const tbody = document.querySelector("#unavailabilityTable tbody");
  const activeDays = [1, 2, 3, 4, 5, 6]; // Martedi .. Domenica come nel foglio di Gg

  thead.innerHTML = `
    <tr>
      <th>Collaboratore</th>
      ${activeDays.map((dIdx) => `<th>${DAY_NAMES[dIdx]}</th>`).join("")}
    </tr>
  `;

  tbody.innerHTML = "";
  state.staff.forEach((p) => {
    const tr = document.createElement("tr");
    const nameTd = document.createElement("td");
    nameTd.textContent = p.name;
    tr.appendChild(nameTd);

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
        saveState();
        renderAll();
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
      <th>In corso (${state.monthLabel})</th>
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
      <th>In corso (${state.monthLabel})</th>
    </tr>
  `;

  ptsBody.innerHTML = "";
  const monthPtSums = months.map(() => 0);
  let livePtSum = 0;

  state.staff.forEach((p) => {
    const tr = document.createElement("tr");
    const liveVal = stats[p.id] ? stats[p.id].points : 0;
    livePtSum += liveVal;

    const cells = months.map((m, i) => {
      const val = (state.historyPoints[m] && state.historyPoints[m][p.id]) || 0;
      monthPtSums[i] += val;
      return `<td>${val}</td>`;
    });

    tr.innerHTML = `
      <td>${p.name}</td>
      ${cells.join("")}
      <td><strong>${liveVal}</strong></td>
    `;
    ptsBody.appendChild(tr);
  });

  ptsFoot.innerHTML = `
    <tr>
      <td>TOTALE</td>
      ${monthPtSums.map((s) => `<td>${s}</td>`).join("")}
      <td>${livePtSum}</td>
    </tr>
  `;
}

function renderSettingsAndWeights() {
  const staffBody = document.querySelector("#settingsStaffTable tbody");
  const staffFoot = document.querySelector("#settingsStaffTable tfoot");
  staffBody.innerHTML = "";

  let sum4 = 0;
  let sum5 = 0;
  let sumPts = 0;

  state.staff.forEach((p, idx) => {
    sum4 += Number(p.target4) || 0;
    sum5 += Number(p.target5) || 0;
    sumPts += Number(p.basePoints) || 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" class="input-inline input-name" value="${p.name}" data-idx="${idx}" data-field="name" /></td>
      <td><input type="number" min="0" max="35" class="input-inline" value="${p.target4}" data-idx="${idx}" data-field="target4" /></td>
      <td><input type="number" min="0" max="35" class="input-inline" value="${p.target5}" data-idx="${idx}" data-field="target5" /></td>
      <td><input type="number" min="0" class="input-inline" value="${p.basePoints}" data-idx="${idx}" data-field="basePoints" /></td>
      <td><button class="btn btn-outline btn-remove-staff" data-idx="${idx}">Rimuovi</button></td>
    `;
    staffBody.appendChild(tr);
  });

  staffFoot.innerHTML = `
    <tr>
      <td>TOTALE</td>
      <td>${sum4}</td>
      <td>${sum5}</td>
      <td>${sumPts}</td>
      <td></td>
    </tr>
  `;

  staffBody.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("change", (e) => {
      const idx = Number(e.target.dataset.idx);
      const field = e.target.dataset.field;
      state.staff[idx][field] = field === "name" ? e.target.value.trim() : Number(e.target.value);
      saveState();
      renderAll();
    });
  });

  staffBody.querySelectorAll(".btn-remove-staff").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.target.dataset.idx);
      if (state.staff.length <= 1) return;
      state.staff.splice(idx, 1);
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
    if (k === 0 || Number(cfg.slots) === 0) badgeClass = "badge-closed";
    else if (k === "special") badgeClass = "badge-special";
    else if (k === 6) badgeClass = "badge-sunday";
    else if (k === 4 || k === 5) badgeClass = "badge-FriSat";

    tr.innerHTML = `
      <td><span class="badge ${badgeClass}">${cfg.label}</span></td>
      <td><input type="number" min="0" max="20" class="input-inline" value="${cfg.weight}" data-key="${k}" data-field="weight" /></td>
      <td><input type="number" min="0" max="5" class="input-inline" value="${cfg.slots}" data-key="${k}" data-field="slots" /></td>
      <td><strong>${totalDayPts} pt</strong></td>
    `;
    weightsBody.appendChild(tr);
  });

  weightsBody.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("change", (e) => {
      const k = e.target.dataset.key;
      const field = e.target.dataset.field;
      state.dayConfig[k][field] = Number(e.target.value);
      saveState();
      renderAll();
    });
  });

  document.getElementById("optUseHistoricalPoints").checked = !!state.options.useHistoricalPoints;
  document.getElementById("optAvoidBackToBackWeekend").checked = !!state.options.prioritizeHighWeightDays;
}

function exportCsv() {
  const dates = getCalendarDates();
  const rows = [];

  for (let w = 0; w < state.weeksCount; w++) {
    const weekDays = dates.slice(w * 7, (w + 1) * 7);
    rows.push(weekDays.map((d) => `${d.shortDay} ${formatDisplayDate(d.iso)}`).join(","));

    for (let s = 0; s < 5; s++) {
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

  renderCalendar();
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

  document.getElementById("btnGenerate").addEventListener("click", () => {
    generateSchedule();
  });

  document.getElementById("btnClearCalendar").addEventListener("click", () => {
    state.assignments = {};
    saveState();
    renderAll();
  });

  document.getElementById("btnSaveArchive").addEventListener("click", () => {
    const label = state.monthLabel.trim() || "mese";
    const { stats } = computeLiveStats();
    if (!state.historyMonths.includes(label)) {
      state.historyMonths.push(label);
    }
    state.historyShifts[label] = {};
    state.historyPoints[label] = {};
    state.staff.forEach((p) => {
      const st = stats[p.id] || { shifts: 0, points: 0 };
      state.historyShifts[label][p.id] = st.shifts;
      state.historyPoints[label][p.id] = st.points;
      p.basePoints = st.points;
    });
    saveState();
    renderAll();
  });

  document.getElementById("btnExportCsv").addEventListener("click", exportCsv);
  document.getElementById("btnPrint").addEventListener("click", () => window.print());

  document.getElementById("btnClearHolidays").addEventListener("click", () => {
    state.holidays = {};
    saveState();
    renderAll();
  });

  document.getElementById("btnAddStaff").addEventListener("click", () => {
    const id = "staff_" + Date.now();
    state.staff.push({
      id,
      name: "NUOVO",
      target4: 13,
      target5: 16,
      basePoints: 0
    });
    state.unavailability[id] = [];
    saveState();
    renderAll();
  });

  document.getElementById("optUseHistoricalPoints").addEventListener("change", (e) => {
    state.options.useHistoricalPoints = e.target.checked;
    saveState();
  });

  document.getElementById("optAvoidBackToBackWeekend").addEventListener("change", (e) => {
    state.options.prioritizeHighWeightDays = e.target.checked;
    saveState();
  });

  document.getElementById("btnResetDefaults").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    state = getDefaultState();
    saveState();
    renderAll();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initEvents();
  // Auto-generate initial schedule if empty so user immediately sees it working
  if (Object.keys(state.assignments).length === 0) {
    generateSchedule();
  } else {
    renderAll();
  }
});
