(() => {
  const seuilInput = document.getElementById('seuil');
  const seuilValeur = document.getElementById('seuil-valeur');
  const sensibiliteInput = document.getElementById('sensibilite');
  const sensibiliteValeur = document.getElementById('sensibilite-valeur');
  const barreNiveau = document.getElementById('barre-niveau');
  const seuilMarker = document.getElementById('seuil-marker');
  const seuilMarkerLabel = document.getElementById('seuil-marker-label');
  const niveauLive = document.getElementById('niveau-live');
  const depassementsEl = document.getElementById('depassements');
  const sonometreCard = document.querySelector('.sonometre-card');
  const startBtn = document.getElementById('start-sonometre');
  const pauseBtn = document.getElementById('pause-sonometre');
  const decrementBtn = document.getElementById('decrement-compteur');
  const incrementBtn = document.getElementById('increment-compteur');
  const resetBtn = document.getElementById('reset-compteur');
  const compactToggleBtn = document.getElementById('toggle-sonometre-compact');

  if (!seuilInput || !sensibiliteInput || !barreNiveau || !startBtn || !pauseBtn || !decrementBtn || !incrementBtn || !resetBtn) return;

  let audioContext;
  let analyser;
  let dataArray;
  let depassements = 0;
  let lastTriggerAt = 0;
  let isPaused = false;
  let isCompact = false;
  const triggerCooldownMs = 1200;

  const playAlertSignal = () => {
    if (!audioContext) return;

    const now = audioContext.currentTime;
    const envelope = audioContext.createGain();
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(0.55, now + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    envelope.connect(audioContext.destination);

    const freqs = [920, 640, 920];
    const beepDuration = 0.12;
    const gap = 0.05;

    freqs.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const startAt = now + index * (beepDuration + gap);
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(freq, startAt);
      oscillator.connect(envelope);
      oscillator.start(startAt);
      oscillator.stop(startAt + beepDuration);
    });
  };

  const updateCompactMode = () => {
    if (!sonometreCard || !compactToggleBtn) return;

    sonometreCard.classList.toggle('is-compact', isCompact);
    compactToggleBtn.textContent = isCompact ? 'Afficher' : 'Masquer';
    compactToggleBtn.setAttribute('aria-expanded', String(!isCompact));
  };

  const updateCompteur = () => {
    depassementsEl.textContent = `Dépassements : ${depassements}`;
    updateSonometreColor();
  };

  const updateSonometreColor = () => {
    if (!sonometreCard) return;
    const ratio = Math.min(depassements, 20) / 20;
    const red = Math.round(30 + (255 - 30) * ratio);
    const green = Math.round(144 * (1 - ratio));
    const blue = Math.round(255 * (1 - ratio));
    const alpha = 0.2 + ratio * 0.35;
    sonometreCard.style.backgroundColor = `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(2)})`;
  };

  const updateSeuilLabel = () => {
    const seuil = Number(seuilInput.value);
    seuilValeur.textContent = `${seuil}%`;

    if (seuilMarker) {
      seuilMarker.style.left = `${seuil}%`;
      if (seuilMarkerLabel) {
        seuilMarkerLabel.textContent = `${seuil}%`;
      }
    }
  };

  const updateSensibiliteLabel = () => {
    const sensibilite = Number(sensibiliteInput.value);
    sensibiliteValeur.textContent = `${sensibilite}%`;
  };

  const normalizeVolume = (arr, sensibilite) => {
    let sum = 0;
    for (let i = 0; i < arr.length; i += 1) {
      const centered = arr[i] - 128;
      sum += centered * centered;
    }
    const rms = Math.sqrt(sum / arr.length);
    const adjustedRms = rms * (sensibilite / 100);
    return Math.min(100, Math.round((adjustedRms / 64) * 100));
  };

  const render = () => {
    if (!analyser) return;

    if (isPaused) {
      requestAnimationFrame(render);
      return;
    }

    analyser.getByteTimeDomainData(dataArray);
    const sensibilite = Number(sensibiliteInput.value);
    const level = normalizeVolume(dataArray, sensibilite);
    const seuil = Number(seuilInput.value);

    barreNiveau.style.width = `${level}%`;
    barreNiveau.classList.toggle('warning', level >= seuil);
    niveauLive.textContent = `Niveau actuel : ${level}%`;

    const now = Date.now();
    if (level >= seuil && now - lastTriggerAt > triggerCooldownMs) {
      depassements += 1;
      lastTriggerAt = now;
      updateCompteur();
      playAlertSignal();
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
      pauseBtn.disabled = false;
      pauseBtn.removeAttribute('disabled');
      pauseBtn.textContent = 'Mettre en pause';

      render();
    } catch (err) {
      startBtn.disabled = false;
      startBtn.textContent = 'Démarrer le sonomètre';
      niveauLive.textContent = 'Niveau actuel : accès micro refusé ou indisponible.';
    }
  };

  const togglePause = async () => {
    if (!audioContext) return;

    if (!isPaused) {
      isPaused = true;
      pauseBtn.textContent = 'Reprendre';
      niveauLive.textContent = 'Niveau actuel : pause';
      await audioContext.suspend();
    } else {
      isPaused = false;
      pauseBtn.textContent = 'Mettre en pause';
      await audioContext.resume();
    }
  };

  seuilInput.addEventListener('input', updateSeuilLabel);
  sensibiliteInput.addEventListener('input', updateSensibiliteLabel);
  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', togglePause);
  decrementBtn.addEventListener('click', () => {
    depassements = Math.max(0, depassements - 1);
    updateCompteur();
  });
  incrementBtn.addEventListener('click', () => {
    depassements += 1;
    updateCompteur();
  });
  resetBtn.addEventListener('click', () => {
    depassements = 0;
    updateCompteur();
  });

  compactToggleBtn?.addEventListener('click', () => {
    isCompact = !isCompact;
    updateCompactMode();
  });

  pauseBtn.disabled = false;
  pauseBtn.removeAttribute('disabled');
  updateSeuilLabel();
  updateSensibiliteLabel();
  updateCompteur();
  updateCompactMode();
})();
