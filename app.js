const MY_LAT = -0.18;
const MY_LON = -78.48;

const map = L.map("map").setView([MY_LAT, MY_LON], 8);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

L.marker([MY_LAT, MY_LON])
  .addTo(map)
  .bindPopup("Mi ubicación");

let planeMarkers = {}; // ahora usamos objeto por identificador

// ------------------------------
// ICONO AVIÓN ROTADO
// ------------------------------
function planeIcon(heading = 0) {
  return L.divIcon({
    className: "",
    html: `
      <svg
        width="36"
        height="36"
        viewBox="0 0 512 512"
        style="
          transform: rotate(${heading}deg);
          transform-origin: center;
        "
      >
        <path
          fill="#1976d2"
          stroke="white"
          stroke-width="15"
          d="M476 220L300 180L220 20C214 8 198 8 192 20L160 180L36 220C20 224 20 244 36 248L160 288L192 492C198 504 214 504 220 492L300 288L476 248C492 244 492 224 476 220Z"
        />
      </svg>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
}

// ------------------------------
// LISTA LATERAL
// ------------------------------
function renderList(planes) {
  const div = document.getElementById("list");

  if (planes.length === 0) {
    div.innerHTML = "No se encontraron aviones.";
    return;
  }

  div.innerHTML = "";

  planes.forEach(p => {
    div.innerHTML += `
      <div class="plane">
        <b>✈ ${p.callsign || "SIN IDENTIFICAR"}</b><br>
        Matrícula: ${p.registration || "N/D"}<br>
        Aeronave: ${p.aircraft || "N/D"}<br>
        Distancia: ${p.dist.toFixed(1)} km<br>
        Altitud: ${Math.round(p.altitude)} ft<br>
        Velocidad: ${Math.round(p.speed)} kt<br>
        Rumbo: ${Math.round(p.heading)}°
      </div>
    `;
  });
}

// ------------------------------
// CARGA DE AVIONES
// ------------------------------
async function loadPlanes() {
  try {
    const response = await fetch(
      "https://api.airplanes.live/v2/point/-0.18/-78.48/250"
    );

    const data = await response.json();

    if (!data.ac) {
      console.error(data);
      return;
    }

    const nearby = [];

    const activeKeys = new Set();

    data.ac.forEach(plane => {
      if (plane.lat == null || plane.lon == null) return;

      const id = plane.hex || plane.r || plane.flight || `${plane.lat}-${plane.lon}`;
      activeKeys.add(id);

      const planeData = {
        callsign: plane.flight?.trim() || "",
        altitude: plane.alt_baro || 0,
        dist: plane.dst || 0,
        speed: plane.gs || 0,
        heading: plane.track || 0,
        registration: plane.r || "",
        aircraft: plane.t || ""
      };

      nearby.push(planeData);

      // ------------------------------
      // CREAR O ACTUALIZAR MARCADOR
      // ------------------------------
      if (planeMarkers[id]) {
        planeMarkers[id].setLatLng([plane.lat, plane.lon]);
        planeMarkers[id].setIcon(planeIcon(plane.track || 0));
        planeMarkers[id].bindPopup(`
          <b>${plane.flight?.trim() || "Vuelo"}</b><br>
          ${plane.r || ""}<br>
          ${plane.t || ""}
        `);
      } else {
        planeMarkers[id] = L.marker(
          [plane.lat, plane.lon],
          { icon: planeIcon(plane.track || 0) }
        )
          .addTo(map)
          .bindPopup(`
            <b>${plane.flight?.trim() || "Vuelo"}</b><br>
            ${plane.r || ""}<br>
            ${plane.t || ""}
          `);
      }
    });

    // ------------------------------
    // ELIMINAR AVIONES QUE YA NO ESTÁN
    // ------------------------------
    Object.keys(planeMarkers).forEach(id => {
      if (!activeKeys.has(id)) {
        map.removeLayer(planeMarkers[id]);
        delete planeMarkers[id];
      }
    });

    nearby.sort((a, b) => a.dist - b.dist);
    renderList(nearby.slice(0, 20));

  } catch (err) {
    console.error(err);
    document.getElementById("list").innerHTML =
      "Error cargando datos. Revise la consola.";
  }
}

// ------------------------------
loadPlanes();
setInterval(loadPlanes, 15000);
