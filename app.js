const scanBtn = document.getElementById("scanBtn");
const playBtn = document.getElementById("playBtn");
const readerEl = document.getElementById("reader");
const resultEl = document.getElementById("result");
const playerEl = document.getElementById("player");

let qr = null;
let scanning = false;

// Merken, was gescannt wurde
let lastDecodedText = "";
let lastEmbedInfo = null; // { type: 'spotify'|'youtube', embedUrl: string }

function tryParseSpotify(urlStr) {
  try {
    const u = new URL(urlStr);

    // Beispiele:
    // https://open.spotify.com/track/<id>
    // https://open.spotify.com/playlist/<id>
    // https://open.spotify.com/album/<id>
    // alert(u.hostname);
    if (u.hostname !== "open.spotify.com") return null;

    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const kind = parts[parts.length - 2];
    const id = parts[parts.length - 1];

    // Spotify Embed:
    // https://open.spotify.com/embed/<kind>/<id>
    // alert(`https://open.spotify.com/embed/${kind}/${id}`);
    return {
      type: "spotify",
      embedUrl: `https://open.spotify.com/embed/${kind}/${id}`,
    };
  } catch {
    return null;
  }
}

function tryParseYouTube(urlStr) {
  try {
    const u = new URL(urlStr);

    let videoId = null;

    // youtu.be/<id>
    if (u.hostname === "youtu.be") {
      videoId = u.pathname.split("/").filter(Boolean)[0] || null;
    }

    // youtube.com/watch?v=<id>
    if (!videoId && (u.hostname === "www.youtube.com" || u.hostname === "youtube.com")) {
      if (u.pathname === "/watch") {
        videoId = u.searchParams.get("v");
      } else if (u.pathname.startsWith("/shorts/")) {
        videoId = u.pathname.split("/")[2] || null;
      } else if (u.pathname.startsWith("/embed/")) {
        videoId = u.pathname.split("/")[2] || null;
      }
    }

    if (!videoId) return null;

    // YouTube Embed (Autoplay wird oft nur nach User-Klick erlaubt)
    return {
      type: "youtube",
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1`,
    };
  } catch {
    return null;
  }
}

function buildEmbed(decodedText) {
  // Priorität: Spotify → YouTube
  const spotify = tryParseSpotify(decodedText);
  alert(spotify);
  if (spotify) return spotify;

  const yt = tryParseYouTube(decodedText);
  if (yt) return yt;

  return null;
}

function renderPlayer(embedInfo) {
  playerEl.innerHTML = "";

  if (!embedInfo) return;

  if (embedInfo.type === "spotify") {
    // Spotify embed hat feste Höhe je nach Typ; 152 passt oft gut.
    playerEl.innerHTML = `
      <iframe
        src="${embedInfo.embedUrl}"
        height="152"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      ></iframe>
    `;
  } else if (embedInfo.type === "youtube") {
    playerEl.innerHTML = `
      <iframe
        src="${embedInfo.embedUrl}"
        height="315"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowfullscreen
      ></iframe>
    `;
  }
}

async function startScan() {
  if (scanning) return;
  scanning = true;

  readerEl.style.display = "block";
  scanBtn.textContent = "Stop";
  playBtn.style.display = "none";

  if (!qr) qr = new Html5Qrcode("reader");

  try {
    await qr.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      async (decodedText) => {
        lastDecodedText = decodedText;
        resultEl.textContent = decodedText;

        // Player-Info bestimmen
        lastEmbedInfo = buildEmbed(decodedText);

        // Scan stoppen (damit Kamera aus ist)
        await stopScan();

        if (lastEmbedInfo) {
          // Jetzt braucht es einen User-Klick zum Starten (Autoplay-Policies)
          playBtn.style.display = "inline-block";
        } else {
          playBtn.style.display = "none";
          playerEl.innerHTML = "";
        }
      }
    );
  } catch (err) {
    scanning = false;
    scanBtn.textContent = "QR-Code scannen";
    readerEl.style.display = "none";
    resultEl.textContent =
      "Kamera konnte nicht gestartet werden. Erlaube Zugriff und nutze HTTPS (GitHub Pages passt).";
    console.error(err);
  }
}

async function stopScan() {
  if (!qr || !scanning) return;
  scanning = false;

  try {
    await qr.stop();
    await qr.clear();
  } catch {}

  readerEl.style.display = "none";
  scanBtn.textContent = "QR-Code scannen";
}

scanBtn.addEventListener("click", () => {
  if (scanning) stopScan();
  else startScan();
});

playBtn.addEventListener("click", () => {
  if (!lastEmbedInfo) return;

  // Einbettung “startet” jetzt durch User-Geste
  renderPlayer(lastEmbedInfo);

  // Button ausblenden (optional)
  // playBtn.style.display = "none";
});
