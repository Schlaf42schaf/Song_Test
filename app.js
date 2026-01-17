const scanBtn = document.getElementById("scanBtn");
const readerEl = document.getElementById("reader");
const resultEl = document.getElementById("result");

let qr = null;
let scanning = false;

async function startScan() {
  if (scanning) return;
  scanning = true;

  readerEl.style.display = "block";
  scanBtn.textContent = "Stop";

  // Scanner-Instanz erstellen (einmalig)
  if (!qr) qr = new Html5Qrcode("reader");

  try {
    await qr.start(
      { facingMode: "environment" }, // Rückkamera bevorzugen
      { fps: 10, qrbox: 250 },
      async (decodedText) => {
        resultEl.textContent = decodedText;

        // Nach Erfolg stoppen
        await stopScan();
      },
      // optional: error callback (weglassen, sonst spammt es die Konsole)
      undefined
    );
  } catch (err) {
    scanning = false;
    scanBtn.textContent = "QR-Code scannen";
    readerEl.style.display = "none";
    resultEl.textContent =
      "Kamera konnte nicht gestartet werden. Erlaubnis erteilen und HTTPS nutzen (GitHub Pages passt).";
    console.error(err);
  }
}

async function stopScan() {
  if (!qr || !scanning) return;
  scanning = false;

  try {
    await qr.stop();
    await qr.clear();
  } catch (e) {
    // stop/clear können je nach Zustand manchmal werfen – ignorieren
  }

  readerEl.style.display = "none";
  scanBtn.textContent = "QR-Code scannen";
}

scanBtn.addEventListener("click", () => {
  if (scanning) stopScan();
  else startScan();
});
