// ─────────────────────────────────────────────────────────
//  TRYB ITUNES BETA
//  Wyszukuje utwory bezpośrednio w iTunes Search API
//  Nie wymaga logowania do Spotify
// ─────────────────────────────────────────────────────────

const ItunesMode = (() => {

    let active = false;
    let tracks = [];
    let currentIndex = 0;
    let currentRound = 0;
    let isArtistGuessed = false;
    let isTitleGuessed = false;
    let audioEl = null;
    let pauseTimer = null;

    const playDurations = [1, 2, 3, 5, 10];
    const timeProgressPercents = [10, 20, 30, 50, 100];

    // ── DOM ───────────────────────────────────────────────
    const landingUI           = document.getElementById('landingUI');
    const itunesSetupUI       = document.getElementById('itunesSetupUI');
    const gameUI              = document.getElementById('gameUI');
    const setupUI             = document.getElementById('setupUI');
    const loginBtn            = document.getElementById('loginBtn');
    const itunesQuery         = document.getElementById('itunesQuery');
    const itunesCount         = document.getElementById('itunesCount');
    const itunesLoadBtn       = document.getElementById('itunesLoadBtn');
    const secretDisplay       = document.getElementById('secretDisplay');
    const guessInput          = document.getElementById('guessInput');
    const submitGuessBtn      = document.getElementById('submitGuessBtn');
    const playBtn             = document.getElementById('playBtn');
    const nextRoundBtn        = document.getElementById('nextRoundBtn');
    const timeDisplay         = document.getElementById('timeDisplay');
    const timeProgressFill    = document.getElementById('timeProgressFill');
    const trackCounterDisplay = document.getElementById('trackCounterDisplay');
    const hideLengthToggle    = document.getElementById('hideLengthToggle');
    const volumeSlider        = document.getElementById('volumeSlider');
    const historyList         = document.getElementById('historyList');

    // ── Badge ─────────────────────────────────────────────
    function showBadge() {
        if (document.getElementById('itunesBadge')) return;
        const badge = document.createElement('div');
        badge.id = 'itunesBadge';
        badge.textContent = 'iTunes Beta';
        badge.style.cssText = `
            position:fixed; top:1rem; left:50%; transform:translateX(-50%);
            font-family:'Space Mono',monospace; font-size:0.6rem;
            letter-spacing:0.15em; text-transform:uppercase; color:#ff3366;
            border:1px solid #ff3366; padding:0.2rem 0.6rem; border-radius:2px;
            background:rgba(10,10,15,0.9); z-index:200; pointer-events:none;
        `;
        document.body.appendChild(badge);
    }

    function hideBadge() {
        const b = document.getElementById('itunesBadge');
        if (b) b.remove();
    }

    // ── Szukaj w iTunes ───────────────────────────────────
    async function searchItunes(query, limit) {
        // iTunes Search API pozwala pobrać max 200 wyników
        const fetchLimit = Math.min(limit * 4, 200); // weź więcej, przefiltruj te z preview
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${fetchLimit}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            const withPreview = (data.results || []).filter(r => r.previewUrl && r.trackName && r.artistName);

            // Tasuj żeby nie zawsze te same piosenki
            for (let i = withPreview.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [withPreview[i], withPreview[j]] = [withPreview[j], withPreview[i]];
            }

            // Zwróć żądaną liczbę
            return withPreview.slice(0, limit).map(r => ({
                name: r.trackName,
                artist: r.artistName,
                previewUrl: r.previewUrl
            }));
        } catch (e) {
            console.error('iTunes search error:', e);
            return [];
        }
    }

    // ── Załaduj i zacznij ─────────────────────────────────
    async function loadAndStart() {
        const query = itunesQuery.value.trim();
        const count = parseInt(itunesCount.value) || 10;

        if (!query) { alert("Wpisz artystę lub gatunek."); return; }

        itunesLoadBtn.disabled = true;
        itunesLoadBtn.textContent = 'Szukam...';

        try {
            const found = await searchItunes(query, count);

            if (found.length === 0) {
                alert("Nie znaleziono żadnych utworów z podglądem dla tego zapytania. Spróbuj innego artysty lub gatunku.");
                return;
            }

            if (found.length < count) {
                console.warn(`iTunes: znaleziono tylko ${found.length} z ${count} żądanych utworów`);
            }

            tracks = found;
            currentIndex = 0;
            historyList.innerHTML = '';

            itunesSetupUI.style.display = 'none';
            gameUI.style.display = 'flex';
            playBtn.disabled = false;
            nextRoundBtn.disabled = false;
            loadNextTrack();

        } catch (e) {
            console.error(e);
            alert("Błąd podczas wyszukiwania.");
        } finally {
            itunesLoadBtn.disabled = false;
            itunesLoadBtn.textContent = 'Szukaj i graj';
        }
    }

    // ── Audio ─────────────────────────────────────────────
    function stopAudio() {
        clearTimeout(pauseTimer);
        if (audioEl) {
            audioEl.pause();
            audioEl.currentTime = 0;
            audioEl = null;
        }
    }

    function playFragment() {
        stopAudio();
        const track = tracks[currentIndex];
        if (!track?.previewUrl) return;
        audioEl = new Audio(track.previewUrl);
        audioEl.volume = volumeSlider.value / 100;
        audioEl.play().catch(e => console.error('Audio error:', e));
        pauseTimer = setTimeout(() => {
            if (audioEl) audioEl.pause();
        }, playDurations[currentRound] * 1000 + 300);
    }

    // ── Gra ───────────────────────────────────────────────
    function loadNextTrack() {
        currentRound = 0;
        isArtistGuessed = false;
        isTitleGuessed = false;
        guessInput.value = '';
        timeDisplay.textContent = playDurations[0];
        timeProgressFill.style.width = timeProgressPercents[0] + '%';
        trackCounterDisplay.textContent = `${currentIndex + 1} / ${tracks.length}`;
        updateSecretDisplay();
    }

    function updateSecretDisplay() {
        if (!active) return;
        const hideLength = hideLengthToggle.checked;
        const mask = t => hideLength ? '*****' : t.replace(/[\p{L}\d]/gu, '*');
        const track = tracks[currentIndex];
        if (!track) return;
        secretDisplay.textContent = `${isArtistGuessed ? track.artist : mask(track.artist)} - ${isTitleGuessed ? track.name : mask(track.name)}`;
    }

    function clean(str) { return str.toLowerCase().replace(/[^\p{L}\d\s]/gu, ""); }

    function addToHistory(artist, title, guessed, secondsUsed) {
        const item = document.createElement('div');
        item.classList.add('history-item', guessed ? 'guessed' : 'failed');
        const a = document.createElement('div'); a.classList.add('h-artist'); a.textContent = artist;
        const t = document.createElement('div'); t.classList.add('h-title');  t.textContent = title;
        const s = document.createElement('div'); s.classList.add('h-time');
        s.textContent = guessed ? `✓ ${secondsUsed}s` : '✕ nie zgadnięto';
        item.appendChild(a); item.appendChild(t); item.appendChild(s);
        historyList.appendChild(item);
        historyList.scrollTop = historyList.scrollHeight;
    }

    function triggerEdgeGlow() {
        document.body.classList.remove('correct-flash');
        void document.body.offsetWidth;
        document.body.classList.add('correct-flash');
        document.body.addEventListener('animationend', () => document.body.classList.remove('correct-flash'), { once: true });
    }

    function playSuccessSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 8);
            const src = ctx.createBufferSource(); src.buffer = buf;
            const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 1800; flt.Q.value = 0.8;
            const g = ctx.createGain(); g.gain.value = 2.5;
            src.connect(flt); flt.connect(g); g.connect(ctx.destination);
            src.start();
        } catch {}
    }

    function nextSong(failed = false) {
        stopAudio();
        const track = tracks[currentIndex];
        if (failed) addToHistory(track.artist, track.name, false, null);
        currentIndex++;
        if (currentIndex >= tracks.length) {
            alert("To była ostatnia piosenka!");
            goToSetup();
            return;
        }
        loadNextTrack();
    }

    function goToSetup() {
        stopAudio();
        gameUI.style.display = 'none';
        itunesSetupUI.style.display = 'flex';
        tracks = [];
        currentIndex = 0;
        historyList.innerHTML = '';
    }

    // ── Listenery iTunes (capture + stopImmediatePropagation) ──
    function onPlay(e) {
        if (!active) return;
        e.stopImmediatePropagation();
        playFragment();
    }

    function onNextRound(e) {
        if (!active) return;
        e.stopImmediatePropagation();
        if (currentRound < playDurations.length - 1) {
            currentRound++;
            timeDisplay.textContent = playDurations[currentRound];
            timeProgressFill.style.width = timeProgressPercents[currentRound] + '%';
        } else {
            const track = tracks[currentIndex];
            isArtistGuessed = true; isTitleGuessed = true;
            updateSecretDisplay(); stopAudio();
            setTimeout(() => { nextSong(true); alert("Koniec prób! Następny utwór."); }, 300);
        }
    }

    function onSubmit(e) {
        if (!active) return;
        e.stopImmediatePropagation();
        const track = tracks[currentIndex];
        const inputWords = clean(guessInput.value).split(/\s+/).filter(w => w.length > 0);
        if (!isArtistGuessed && clean(track.artist).split(/\s+/).some(w => inputWords.includes(w))) isArtistGuessed = true;
        if (!isTitleGuessed && clean(track.name).split(/\s+/).some(w => inputWords.includes(w))) isTitleGuessed = true;
        guessInput.value = '';
        updateSecretDisplay();
        if (isArtistGuessed && isTitleGuessed) {
            playSuccessSound(); triggerEdgeGlow(); stopAudio();
            addToHistory(track.artist, track.name, true, playDurations[currentRound]);
            setTimeout(() => nextSong(), 2000);
        }
    }

    function onVolume() {
        if (audioEl) audioEl.volume = volumeSlider.value / 100;
    }

    function onToggleLength() {
        if (active) updateSecretDisplay();
    }

    // ── Aktywuj / Deaktywuj ───────────────────────────────
    function activate() {
        active = true;
        showBadge();

        // Ukryj wszystko inne
        landingUI.style.display = 'none';
        loginBtn.style.display = 'none';
        setupUI.style.display = 'none';
        gameUI.style.display = 'none';

        // Pokaż iTunes setup
        itunesSetupUI.style.display = 'flex';

        // Listenery gry
        playBtn.addEventListener('click', onPlay, true);
        nextRoundBtn.addEventListener('click', onNextRound, true);
        submitGuessBtn.addEventListener('click', onSubmit, true);
        volumeSlider.addEventListener('input', onVolume);
        hideLengthToggle.addEventListener('change', onToggleLength);

        // "Zmień playlistę" z menu – wróć do iTunes setup
        document.getElementById('menuGoSetupItunes')?.addEventListener('click', goToSetup);
    }

    function deactivate() {
        active = false;
        hideBadge();
        stopAudio();
        itunesSetupUI.style.display = 'none';
        gameUI.style.display = 'none';

        playBtn.removeEventListener('click', onPlay, true);
        nextRoundBtn.removeEventListener('click', onNextRound, true);
        submitGuessBtn.removeEventListener('click', onSubmit, true);
        volumeSlider.removeEventListener('input', onVolume);
        hideLengthToggle.removeEventListener('change', onToggleLength);
    }

    // ── Public API ────────────────────────────────────────
    function init() {
        // Przycisk "Szukaj i graj"
        itunesLoadBtn.addEventListener('click', () => {
            if (!active) return;
            loadAndStart();
        });

        // Enter w polu query
        itunesQuery.addEventListener('keydown', (e) => {
            if (!active) return;
            if (e.key === 'Enter') loadAndStart();
        });

        // Landing – przycisk iTunes
        document.getElementById('landingItunesBtn').addEventListener('click', () => {
            landingUI.style.display = 'none';
            activate();
        });

        // Dropdown – Tryb iTunes
        document.getElementById('menuTrybItunes').addEventListener('click', () => {
            document.getElementById('menuDropdown').classList.add('hidden');
            if (!active) {
                // Jeśli OG jest w trakcie gry, reload
                if (gameUI.style.display !== 'none') { location.reload(); return; }
                landingUI.style.display = 'none';
                setupUI.style.display = 'none';
                loginBtn.style.display = 'none';
                activate();
            }
        });

        // Dropdown – wróć do setup iTunes gdy aktywny
        document.getElementById('menuTrybOG').addEventListener('click', () => {
            document.getElementById('menuDropdown').classList.add('hidden');
            if (active) {
                deactivate();
                location.reload();
            }
        });
    }

    return { init, activate, deactivate, isActive: () => active, goToSetup };

})();