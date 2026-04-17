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
  let lastDepassementAt = 0;
  let lastAutoAdjustAt = 0;
  let ambientRmsEstimate = 0;
  let isPaused = false;
  let isCompact = false;
  const triggerCooldownMs = 1200;
  const rapidIncreaseWindowMs = 20000;
  const rapidIncreaseThreshold = 4;
  const stagnationWindowMs = 30000;
  const autoAdjustCooldownMs = 1000;
  const targetMarginBelowThreshold = 2;
  const maxAutoAdjustDelta = 15;
  const depassementTimestamps = [];

  const playAlertSignal = () => {
    if (!audioContext) return;

    const now = audioContext.currentTime;
    const peakGain = Math.min(1.6, 0.75 + depassements * 0.08);
    const envelope = audioContext.createGain();
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(peakGain, now + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    envelope.connect(audioContext.destination);

    let beepCount = 1;
    if (depassements >= 5 && depassements <= 10) {
      beepCount = 2;
    } else if (depassements > 10) {
      beepCount = 3;
    }

    const freqs = [920, 640, 920].slice(0, beepCount);
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

  const setSensibilite = (newValue) => {
    const min = Number(sensibiliteInput.min || 50);
    const max = Number(sensibiliteInput.max || 200);
    const clamped = Math.min(max, Math.max(min, newValue));
    const rounded = Math.round(clamped);

    if (Number(sensibiliteInput.value) !== rounded) {
      sensibiliteInput.value = String(rounded);
      updateSensibiliteLabel();
    }
  };

  const autoAdjustSensibilite = (now, niveauAmbiantCible) => {
    if (now - lastAutoAdjustAt < autoAdjustCooldownMs) return;
    if (ambientRmsEstimate <= 0.05) return;

    while (depassementTimestamps.length && now - depassementTimestamps[0] > rapidIncreaseWindowMs) {
      depassementTimestamps.shift();
    }

    const sensibiliteActuelle = Number(sensibiliteInput.value);
    const sensibiliteCible = (niveauAmbiantCible * 64) / ambientRmsEstimate;
    const diff = sensibiliteCible - sensibiliteActuelle;
    const delta = Math.max(-maxAutoAdjustDelta, Math.min(maxAutoAdjustDelta, diff));
    setSensibilite(sensibiliteActuelle + delta);

    if (depassementTimestamps.length >= rapidIncreaseThreshold && diff > 0) {
      setSensibilite(sensibiliteActuelle - maxAutoAdjustDelta);
    }

    if (lastDepassementAt > 0 && now - lastDepassementAt >= stagnationWindowMs) {
      lastDepassementAt = now;
    }

    lastAutoAdjustAt = now;
  };

  const calculateRms = (arr) => {
    let sum = 0;
    for (let i = 0; i < arr.length; i += 1) {
      const centered = arr[i] - 128;
      sum += centered * centered;
    }
    return Math.sqrt(sum / arr.length);
  };

  const normalizeVolume = (rms, sensibilite) => {
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
    const rms = calculateRms(dataArray);
    const level = normalizeVolume(rms, sensibilite);
    const seuil = Number(seuilInput.value);
    const niveauAmbiantCible = Math.max(5, seuil - targetMarginBelowThreshold);

    const facteurLissage = level >= seuil ? 0.05 : 0.12;
    if (ambientRmsEstimate === 0) {
      ambientRmsEstimate = rms;
    } else {
      ambientRmsEstimate = ambientRmsEstimate + (rms - ambientRmsEstimate) * facteurLissage;
    }

    barreNiveau.style.width = `${level}%`;
    barreNiveau.classList.toggle('warning', level >= seuil);
    niveauLive.textContent = `Niveau actuel : ${level}%`;

    const now = Date.now();
    if (level >= seuil && now - lastTriggerAt > triggerCooldownMs) {
      depassements += 1;
      lastTriggerAt = now;
      lastDepassementAt = now;
      depassementTimestamps.push(now);
      updateCompteur();
      playAlertSignal();
    }

    autoAdjustSensibilite(now, niveauAmbiantCible);

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
      const now = Date.now();
      lastAutoAdjustAt = now;
      lastDepassementAt = now;
      depassementTimestamps.length = 0;
      ambientRmsEstimate = 0;

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
