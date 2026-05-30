navigator.geolocation.getCurrentPosition(pos => {

  const MY_LAT = pos.coords.latitude;
  const MY_LON = pos.coords.longitude;

});

const map = L.map("map").setView([MY_LAT, MY_LON], 8);

L.tileLayer(
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "© OpenStreetMap"
  }
).addTo(map);

L.marker([MY_LAT, MY_LON])
  .addTo(map)
  .bindPopup("Mi ubicación");

let planeMarkers = [];

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

async function loadPlanes() {

  try {

    planeMarkers.forEach(marker => {
      map.removeLayer(marker);
    });

    planeMarkers = [];

    const response = await fetch(
      "https://api.airplanes.live/v2/point/-0.18/-78.48/250"
    );

    const data = await response.json();

    console.log(data);

    if (!data.ac) {
      console.error(data);
      return;
    }

    const nearby = [];

    data.ac.forEach(plane => {

      if (plane.lat == null || plane.lon == null)
        return;

      nearby.push({
        callsign: plane.flight?.trim() || "",
        altitude: plane.alt_baro || 0,
        dist: plane.dst || 0,
        speed: plane.gs || 0,
        heading: plane.track || 0,
        registration: plane.r || "",
        aircraft: plane.t || ""
      });

      const marker = L.marker([
        plane.lat,
        plane.lon
      ])
      .addTo(map)
      .bindPopup(`
        <b>${plane.flight?.trim() || "Vuelo"}</b><br>
        ${plane.r || ""}<br>
        ${plane.t || ""}
      `);

      planeMarkers.push(marker);
    });

    nearby.sort((a,b) => a.dist - b.dist);

    renderList(
      nearby.slice(0,20)
    );

  }
  catch(err) {

    console.error(err);

    document.getElementById("list").innerHTML =
      "Error cargando datos. Revise la consola.";
  }
}

loadPlanes();

setInterval(loadPlanes, 15000);
