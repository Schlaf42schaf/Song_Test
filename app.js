const scanBtn = document.getElementById("scanBtn");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
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
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3`,
    };
  } catch {
    return null;
  }
}

function buildEmbed(decodedText) {
  // Priorität: Spotify → YouTube
  const spotify = tryParseSpotify(decodedText);
  // alert(spotify);
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
    // ✅ GEÄNDERT: iframe in Wrapper + Overlay, damit Video/Titel nicht sichtbar sind
    //playerEl.innerHTML = `
      //<div class="yt-wrap">
        //<iframe
          //src="${embedInfo.embedUrl}"
          //allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          //allowfullscreen
        //></iframe>
        //<div class="yt-cover"></div>
      //</div>
    //`;
    playerEl.innerHTML = `
    <div class="yt-audio">
      <iframe
        src="${embedInfo.embedUrl}"
        allow="autoplay; encrypted-media"
        referrerpolicy="strict-origin-when-cross-origin"
      ></iframe>
      
    </div>
  `;
  }
}

async function startScan() {
  if (scanning) return;
  scanning = true;

  readerEl.style.display = "block";
  scanBtn.textContent = "Stop";
  playBtn.style.display = "none";
  pauseBtn.style.display = "none";

  if (!qr) qr = new Html5Qrcode("reader");

  try {
    await qr.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      async (decodedText) => {
        lastDecodedText = decodedText;
      
        // ✅ GEÄNDERT: erst embedInfo bestimmen ...
        lastEmbedInfo = buildEmbed(decodedText);
      
        // ✅ GEÄNDERT: ... dann Ergebnis anzeigen (debug optional)
        // resultEl.innerHTML = `${decodedText}<br><small>${lastEmbedInfo?.embedUrl ?? ""}</small>`;
        resultEl.textContent = "Song erkannt 🎵";
        
        await stopScan();
      
        if (lastEmbedInfo) {
          playBtn.style.display = "inline-block";
          pauseBtn.style.display = "none";
        } else {
          playBtn.style.display = "none";
          pauseBtn.style.display = "none";
          playerEl.innerHTML = "";
          resultEl.textContent = "Kein gültiger Spotify- oder YouTube-Link erkannt.";
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
  resultEl.textContent = "Song wird abgespielt 🎵";
  renderPlayer(lastEmbedInfo);

  // ✅ Buttons umschalten
  playBtn.style.display = "none";
  pauseBtn.style.display = "inline-block";
  
});

pauseBtn.addEventListener("click", () => {
  // ✅ Player entfernen = Audio stoppt
  playerEl.innerHTML = "";

  pauseBtn.style.display = "none";
  playerEl.style.display = "none"; 
  playBtn.style.display = "inline-block";

  resultEl.textContent = "⏸️ Song pausiert";

});
