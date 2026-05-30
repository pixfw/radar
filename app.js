const MY_LAT = -0.18;
const MY_LON = -78.48;

const map = L.map("map", {
  zoomControl: true
}).setView([MY_LAT, MY_LON], 8);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

L.marker([MY_LAT, MY_LON])
  .addTo(map)
  .bindPopup("📍 Mi ubicación");

let planes = {};
let trails = {};
let filters = {
  airbus: true,
  boeing: true,
  cargo: true,
  helicopter: true,
  unknown: true
};

let selectedPlane = null;

---

# 🧠 DESCRIPCIÓN COMPLETA AVIÓN
function getAircraftDescription(code) {
  const t = (code || "").toUpperCase();

  const map = {
    B763: "BOEING 767-300",
    B738: "BOEING 737-800",
    B739: "BOEING 737-900",
    B77W: "BOEING 777-300ER",
    B77L: "BOEING 777-200LR",
    B788: "BOEING 787-8",
    B789: "BOEING 787-9",
    B78X: "BOEING 787-10",

    A320: "AIRBUS A320",
    A20N: "AIRBUS A320neo",
    A321: "AIRBUS A321",
    A359: "AIRBUS A350-900",
    A35K: "AIRBUS A350-1000",
    A388: "AIRBUS A380",

    B77F: "BOEING 777 FREIGHTER",
    B744F: "BOEING 747 FREIGHTER"
  };

  return map[t] || t || "DESCONOCIDO";
}

---

# ✈️ TIPO DE AERONAVE
function getType(plane) {
  const t = (plane.t || "").toLowerCase();

  if (t.includes("heli") || t.startsWith("h") || t.includes("r44")) return "helicopter";
  if (t.includes("f") || t.includes("cargo") || t.includes("freight")) return "cargo";

  if (t.includes("a320") || t.includes("a321") || t.includes("a330") || t.includes("a350") || t.includes("a380"))
    return "airbus";

  if (t.includes("b737") || t.includes("b747") || t.includes("b777") || t.includes("b787"))
    return "boeing";

  return "unknown";
}

---

# 🎨 ICONO PRO
function planeIcon(heading = 0, type = "unknown") {

  const colors = {
    airbus: "#1e88e5",
    boeing: "#43a047",
    cargo: "#fb8c00",
    helicopter: "#6d6d6d",
    unknown: "#9e9e9e"
  };

  const color = colors[type];

  const shape = (type === "helicopter")
    ? `<path d="M256 20 L320 140 L460 160 L320 180 L256 340 L192 180 L52 160 L192 140 Z"
         fill="${color}" stroke="white" stroke-width="10"/>
       <circle cx="256" cy="180" r="20" fill="white"/>`
    : `<path d="M476 220L300 180L220 20C214 8 198 8 192 20L160 180L36 220C20 224 20 244 36 248L160 288L192 492C198 504 214 504 220 492L300 288L476 248C492 244 492 224 476 220Z"
         fill="${color}" stroke="white" stroke-width="12"/>`;

  return L.divIcon({
    className: "",
    html: `
      <svg width="38" height="38"
        viewBox="0 0 512 512"
        style="transform: rotate(${heading}deg); transform-origin:center;">
        ${shape}
      </svg>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });
}

---

# 🧭 TRAIL PRO (degradado)
function updateTrail(id, lat, lon) {

  if (!trails[id]) {
    trails[id] = L.polyline([], {
      color: "#2196f3",
      weight: 2,
      opacity: 0.4
    }).addTo(map);
  }

  let points = trails[id].getLatLngs();
  points.push([lat, lon]);

  if (points.length > 25) points.shift();

  trails[id].setLatLngs(points);
}

---

# 📡 RENDER LISTA
function renderList(list) {
  const div = document.getElementById("list");

  div.innerHTML = list.map(p => `
    <div class="plane-card">
      <b>${p.callsign || "SIN IDENTIFICAR"}</b><br>
      ✈ ${p.aircraft}<br>
      📏 ${p.dist.toFixed(1)} km<br>
      ⬆ ${Math.round(p.altitude)} ft<br>
      ⚡ ${Math.round(p.speed)} kt<br>
      🧭 ${Math.round(p.heading)}°
    </div>
  `).join("");
}

---

# 🚀 LOAD PRINCIPAL
async function loadPlanes() {

  const res = await fetch(
    "https://api.airplanes.live/v2/point/-0.18/-78.48/250"
  );

  const data = await res.json();
  if (!data.ac) return;

  const active = new Set();
  const list = [];

  data.ac.forEach(p => {
    if (!p.lat || !p.lon) return;

    const id = p.hex || p.r || p.flight || `${p.lat}-${p.lon}`;
    active.add(id);

    const type = getType(p);

    const plane = {
      lat: p.lat,
      lon: p.lon,
      heading: p.track || 0,
      speed: p.gs || 0,
      altitude: p.alt_baro || 0,
      dist: p.dst || 0,
      callsign: p.flight?.trim() || "",
      aircraft: getAircraftDescription(p.t),
      type
    };

    list.push(plane);

    // filtro simple
    if (!filters[type]) return;

    if (planes[id]) {

      planes[id].setLatLng([p.lat, p.lon]);
      planes[id].setIcon(planeIcon(p.track || 0, type));

    } else {

      planes[id] = L.marker(
        [p.lat, p.lon],
        { icon: planeIcon(p.track || 0, type) }
      )
      .addTo(map)
      .bindPopup(`
        <b>${plane.callsign}</b><br>
        ✈ ${plane.aircraft}<br>
        🧭 ${plane.heading}°<br>
        ⚡ ${plane.speed} kt
      `);
    }

    updateTrail(id, p.lat, p.lon);
  });

  // cleanup
  Object.keys(planes).forEach(id => {
    if (!active.has(id)) {
      map.removeLayer(planes[id]);
      delete planes[id];

      if (trails[id]) {
        map.removeLayer(trails[id]);
        delete trails[id];
      }
    }
  });

  list.sort((a,b) => a.dist - b.dist);
  renderList(list.slice(0, 30));
}

---

# 🔁 LOOP
loadPlanes();
setInterval(loadPlanes, 6000);
