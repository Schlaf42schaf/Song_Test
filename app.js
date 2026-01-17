const scanBtn = document.getElementById("scanBtn");
const readerEl = document.getElementById("reader");
const resultEl = document.getElementById("result");

let qr = null;
let scanning = false;

function isValidUrl(text) {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

async function startScan() {
  if (scanning) return;
  scanning = true;

  readerEl.style.display = "block";
  scanBtn.textContent = "Stop";

  if (!qr) qr = new Html5Qrcode("reader");

  try {
    await qr.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      async (decodedText) => {
        resultEl.textContent = decodedText;

        // Scan stoppen
        await stopScan();

        // Wenn es eine URL ist → öffnen
        //if (isValidUrl(decodedText)) {
          // kleines Delay, damit Stop sauber durch ist
          setTimeout(() => {
            window.open(decodedText, "_blank");
          }, 300);
        //}
      }
    );
  } catch (err) {
    scanning = false;
    scanBtn.textContent = "QR-Code scannen";
    readerEl.style.display = "none";
    resultEl.textContent =
      "Kamera konnte nicht gestartet werden. Erlaube den Zugriff und nutze HTTPS.";
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
