const MY_LAT = -0.18;
const MY_LON = -78.48;

const map = L.map("map").setView([MY_LAT, MY_LON], 8);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

L.marker([MY_LAT, MY_LON])
  .addTo(map)
  .bindPopup("Mi ubicación");

let planeMarkers = {};
let planeTrails = {};

// ------------------------------
// CLASIFICACIÓN
// ------------------------------
function getAircraftType(plane) {
  const type = (plane.t || "").toLowerCase();

  if (type.includes("heli") || type.startsWith("h") || type.includes("r44")) {
    return "helicopter";
  }

  if (type.includes("f") || type.includes("cargo") || type.includes("freight")) {
    return "cargo";
  }

  if (
    type.includes("a318") || type.includes("a319") ||
    type.includes("a320") || type.includes("a321") ||
    type.includes("a330") || type.includes("a350") ||
    type.includes("a380")
  ) return "airbus";

  if (
    type.includes("b737") || type.includes("b738") ||
    type.includes("b739") || type.includes("b747") ||
    type.includes("b757") || type.includes("b767") ||
    type.includes("b777") || type.includes("b787")
  ) return "boeing";

  return "unknown";
}

// ------------------------------
// ICONO
// ------------------------------
function planeIcon(heading = 0, type = "unknown") {

  const colors = {
    airbus: "#1976d2",
    boeing: "#2e7d32",
    cargo: "#ff9800",
    helicopter: "#424242",
    unknown: "#9e9e9e"
  };

  const color = colors[type] || colors.unknown;

  const shape = (type === "helicopter")
    ? `<path d="M256 20 L300 120 L420 140 L300 160 L256 300 L212 160 L92 140 L212 120 Z"
         fill="${color}" stroke="white" stroke-width="10"/>
       <circle cx="256" cy="160" r="18" fill="white"/>`
    : `<path d="M476 220L300 180L220 20C214 8 198 8 192 20L160 180L36 220C20 224 20 244 36 248L160 288L192 492C198 504 214 504 220 492L300 288L476 248C492 244 492 224 476 220Z"
         fill="${color}" stroke="white" stroke-width="12"/>`;

  return L.divIcon({
    className: "",
    html: `
      <svg width="36" height="36" viewBox="0 0 512 512"
        style="transform: rotate(${heading}deg); transform-origin:center;">
        ${shape}
      </svg>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
}

// ------------------------------
// TRAIL (rastro)
// ------------------------------
function updateTrail(id, lat, lon) {
  if (!planeTrails[id]) {
    planeTrails[id] = L.polyline([], {
      color: "rgba(0,150,255,0.5)",
      weight: 2
    }).addTo(map);
  }

  const trail = planeTrails[id];
  const points = trail.getLatLngs();

  points.push([lat, lon]);

  if (points.length > 20) points.shift();

  trail.setLatLngs(points);
}

// ------------------------------
// LISTA
// ------------------------------
function renderList(planes) {
  const div = document.getElementById("list");

  if (!planes.length) {
    div.innerHTML = "No se encontraron aviones.";
    return;
  }

  div.innerHTML = planes.map(p => `
    <div class="plane">
      <b>✈ ${p.callsign || "SIN IDENTIFICAR"}</b><br>
      Tipo: ${p.type}<br>
      Distancia: ${p.dist.toFixed(1)} km<br>
      Altitud: ${Math.round(p.altitude)} ft<br>
      Velocidad: ${Math.round(p.speed)} kt<br>
      Rumbo: ${Math.round(p.heading)}°
    </div>
  `).join("");
}

// ------------------------------
// LOAD
// ------------------------------
async function loadPlanes() {
  try {
    const res = await fetch(
      "https://api.airplanes.live/v2/point/-0.18/-78.48/250"
    );

    const data = await res.json();

    if (!data.ac) return;

    const nearby = [];
    const active = new Set();

    data.ac.forEach(plane => {
      if (plane.lat == null || plane.lon == null) return;

      const id = plane.hex || plane.r || plane.flight || `${plane.lat}-${plane.lon}`;
      active.add(id);

      const type = getAircraftType(plane);

      const info = {
        callsign: plane.flight?.trim() || "",
        altitude: plane.alt_baro || 0,
        dist: plane.dst || 0,
        speed: plane.gs || 0,
        heading: plane.track || 0,
        registration: plane.r || "",
        aircraft: plane.t || "",
        type
      };

      nearby.push(info);

      // ----------------------
      // MARKER
      // ----------------------
      if (planeMarkers[id]) {
        planeMarkers[id].setLatLng([plane.lat, plane.lon]);
        planeMarkers[id].setIcon(planeIcon(plane.track || 0, type));
      } else {
        planeMarkers[id] = L.marker(
          [plane.lat, plane.lon],
          { icon: planeIcon(plane.track || 0, type) }
        )
        .addTo(map)
        .bindPopup(`
          <b>${plane.flight?.trim() || "Vuelo"}</b><br>
          ${plane.r || ""}<br>
          ${plane.t || ""}
        `);
      }

      // ----------------------
      // TRAIL
      // ----------------------
      updateTrail(id, plane.lat, plane.lon);
    });

    // eliminar aviones desaparecidos
    Object.keys(planeMarkers).forEach(id => {
      if (!active.has(id)) {
        map.removeLayer(planeMarkers[id]);
        delete planeMarkers[id];

        if (planeTrails[id]) {
          map.removeLayer(planeTrails[id]);
          delete planeTrails[id];
        }
      }
    });

    nearby.sort((a, b) => a.dist - b.dist);
    renderList(nearby.slice(0, 20));

  } catch (e) {
    console.error(e);
    document.getElementById("list").innerHTML =
      "Error cargando datos.";
  }
}

// ------------------------------
loadPlanes();
setInterval(loadPlanes, 8000);
