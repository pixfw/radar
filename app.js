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
    airbus: "#1e88e5",
    boeing: "#43a047",
    cargo: "#fb8c00",
    helicopter: "#424242",
    unknown: "#9e9e9e"
  };

  const color = colors[type] || colors.unknown;

  const svg = `
    <svg width="34" height="34" viewBox="0 0 24 24"
      style="transform: rotate(${heading}deg); transform-origin: center;">
      
      <!-- fuselaje -->
      <path d="M12 2
               C13 2 13.5 3 13.5 4.5
               L13.5 10
               L21 13
               L21 15
               L13.5 13.5
               L13.5 18
               L15 20
               L15 21
               L12 20
               L9 21
               L9 20
               L10.5 18
               L10.5 13.5
               L3 15
               L3 13
               L10.5 10
               L10.5 4.5
               C10.5 3 11 2 12 2 Z"
        fill="${color}"
        stroke="white"
        stroke-width="0.8"
      />

      <!-- cabina -->
      <circle cx="12" cy="5" r="0.8" fill="white" opacity="0.8"/>

    </svg>
  `;

  return L.divIcon({
    className: "",
    html: svg,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
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
