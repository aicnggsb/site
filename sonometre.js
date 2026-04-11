(() => {
  const seuilInput = document.getElementById('seuil');
  const seuilValeur = document.getElementById('seuil-valeur');
  const barreNiveau = document.getElementById('barre-niveau');
  const niveauLive = document.getElementById('niveau-live');
  const depassementsEl = document.getElementById('depassements');
  const startBtn = document.getElementById('start-sonometre');
  const resetBtn = document.getElementById('reset-compteur');

  if (!seuilInput || !startBtn) return;

  let audioContext;
  let analyser;
  let dataArray;
  let depassements = 0;
  let lastTriggerAt = 0;
  const triggerCooldownMs = 1200;

  const updateSeuilLabel = () => {
    seuilValeur.textContent = `${seuilInput.value}%`;
  };

  const normalizeVolume = (arr) => {
    let sum = 0;
    for (let i = 0; i < arr.length; i += 1) {
      const centered = arr[i] - 128;
      sum += centered * centered;
    }
    const rms = Math.sqrt(sum / arr.length);
    return Math.min(100, Math.round((rms / 64) * 100));
  };

  const render = () => {
    if (!analyser) return;
    analyser.getByteTimeDomainData(dataArray);
    const level = normalizeVolume(dataArray);
    const seuil = Number(seuilInput.value);

    barreNiveau.style.width = `${level}%`;
    barreNiveau.classList.toggle('warning', level >= seuil);
    niveauLive.textContent = `Niveau actuel : ${level}%`;

    const now = Date.now();
    if (level >= seuil && now - lastTriggerAt > triggerCooldownMs) {
      depassements += 1;
      lastTriggerAt = now;
      depassementsEl.textContent = `Dépassements : ${depassements}`;
    }

    requestAnimationFrame(render);
  };

  const start = async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Sonomètre actif';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);

      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);

      render();
    } catch (err) {
      startBtn.disabled = false;
      startBtn.textContent = 'Démarrer le sonomètre';
      niveauLive.textContent = 'Niveau actuel : accès micro refusé ou indisponible.';
    }
  };

  seuilInput.addEventListener('input', updateSeuilLabel);
  startBtn.addEventListener('click', start);
  resetBtn.addEventListener('click', () => {
    depassements = 0;
    depassementsEl.textContent = 'Dépassements : 0';
  });

  updateSeuilLabel();
})();
