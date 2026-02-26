const ItunesMode = (() => {

    let active = false;
    let tracks = [];
    let currentIndex = 0;
    let currentRound = 0;
    let isArtistGuessed = false;
    let isTitleGuessed = false;
    let audioEl = null;
    let pauseTimer = null;
    let searchMode = 'artist';
    let selectedPlaylist = null;

    const playDurations = [1, 2, 3, 5, 10];
    const timeProgressPercents = [10, 20, 30, 50, 100];

    const PLAYLISTS = [
        { label: 'Top 50 Polska - Mix',      url: 'https://itunes.apple.com/pl/rss/topsongs/limit=50/json' },
        { label: 'Top 50 Polska - Hip-Hop',  url: 'https://itunes.apple.com/pl/rss/topsongs/limit=50/genre=18/json' },
        { label: 'Top 50 Polska - Pop',      url: 'https://itunes.apple.com/pl/rss/topsongs/limit=50/genre=14/json' },
        { label: 'Top 50 Polska - Rock',     url: 'https://itunes.apple.com/pl/rss/topsongs/limit=50/genre=21/json' },
        { label: 'Top 50 Polska - Alt',      url: 'https://itunes.apple.com/pl/rss/topsongs/limit=50/genre=20/json' },
        { label: 'Top 50 USA - Mix',         url: 'https://itunes.apple.com/us/rss/topsongs/limit=50/json' },
        { label: 'Top 50 USA - Hip-Hop',     url: 'https://itunes.apple.com/us/rss/topsongs/limit=50/genre=18/json' },
        { label: 'Top 50 UK - Mix',          url: 'https://itunes.apple.com/gb/rss/topsongs/limit=50/json' },
        { label: 'Top 50 Niemcy - Mix',      url: 'https://itunes.apple.com/de/rss/topsongs/limit=50/json' },
        { label: 'Top 50 Francja - Mix',     url: 'https://itunes.apple.com/fr/rss/topsongs/limit=50/json' },
        { label: 'Top 50 Hiszpania - Mix',   url: 'https://itunes.apple.com/es/rss/topsongs/limit=50/json' },
        { label: 'Top 50 Włochy - Mix',      url: 'https://itunes.apple.com/it/rss/topsongs/limit=50/json' },
    ];

    const landingUI           = document.getElementById('landingUI');
    const itunesSetupUI       = document.getElementById('itunesSetupUI');
    const gameUI              = document.getElementById('gameUI');
    const setupUI             = document.getElementById('setupUI');
    const loginBtn            = document.getElementById('loginBtn');
    const itunesArtistQuery   = document.getElementById('itunesArtistQuery');
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
    const tabArtist           = document.getElementById('tabArtist');
    const tabGenre            = document.getElementById('tabGenre');
    const artistPanel         = document.getElementById('artistPanel');
    const genrePanel          = document.getElementById('genrePanel');
    const genreChips          = document.getElementById('genreChips');

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

    function setupTabs() {
        tabArtist.addEventListener('click', () => setMode('artist'));
        tabGenre.addEventListener('click', () => setMode('playlist'));
        tabGenre.textContent = 'Playlista'; 
    }

    function setMode(mode) {
        searchMode = mode;
        if (mode === 'artist') {
            tabArtist.classList.add('active');
            tabGenre.classList.remove('active');
            artistPanel.style.display = 'block';
            genrePanel.style.display = 'none';
        } else {
            tabGenre.classList.add('active');
            tabArtist.classList.remove('active');
            genrePanel.style.display = 'block';
            artistPanel.style.display = 'none';
        }
    }

    function buildPlaylistChips() {
        genreChips.innerHTML = '';
        PLAYLISTS.forEach(p => {
            const chip = document.createElement('button');
            chip.classList.add('genre-chip');
            chip.textContent = p.label;
            chip.addEventListener('click', () => {
                document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                selectedPlaylist = p;
            });
            genreChips.appendChild(chip);
        });
    }

    async function fetchPlaylistTracks(playlist, limit) {
        try {
            const rssRes = await fetch(playlist.url);
            const rssData = await rssRes.json();
            const entries = rssData.feed?.entry || [];

            if (entries.length === 0) return [];

            const trackIds = entries
                .map(e => e.id?.attributes?.['im:id'])
                .filter(Boolean)
                .slice(0, 50);

            const cCode = playlist.url.match(/\.com\/([a-z]{2})\//)[1] || 'us';
            const lookupUrl = `https://itunes.apple.com/lookup?id=${trackIds.join(',')}&country=${cCode}&entity=song`;
            
            const lookupRes = await fetch(lookupUrl);
            const lookupData = await lookupRes.json();

            const withPreview = (lookupData.results || [])
                .filter(r => r.previewUrl && r.kind === 'song' && r.trackName && r.artistName)
                .map(r => ({ name: r.trackName, artist: r.artistName, previewUrl: r.previewUrl }));

            shuffle(withPreview);
            return withPreview.slice(0, limit);

        } catch (e) {
            return fetchByTerm(playlist.label, limit);
        }
    }

    async function fetchArtistTracks(artistName, limit) {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&media=music&entity=song&limit=200&attribute=artistTerm`;
        try {
            const res = await fetch(url);
            const data = await res.json();

            const cleanStr = s => s.toLowerCase().replace(/[^\p{L}\d]/gu, '');
            const target = cleanStr(artistName);

            const filtered = (data.results || [])
                .filter(r => {
                    if (!r.previewUrl || !r.artistName || !r.trackName) return false;
                    const artistsInTrack = r.artistName.toLowerCase().split(/,|\&|feat\.?/i).map(a => cleanStr(a));
                    return artistsInTrack.includes(target);
                })
                .map(r => ({ name: r.trackName, artist: r.artistName, previewUrl: r.previewUrl }));

            const seen = new Set();
            const unique = filtered.filter(t => {
                const key = t.name.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            shuffle(unique);
            return unique.slice(0, limit);

        } catch (e) {
            return [];
        }
    }

    async function fetchByTerm(term, limit) {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=200`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            const withPreview = (data.results || [])
                .filter(r => r.previewUrl && r.trackName && r.artistName)
                .map(r => ({ name: r.trackName, artist: r.artistName, previewUrl: r.previewUrl }));
            shuffle(withPreview);
            return withPreview.slice(0, limit);
        } catch { return []; }
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    async function loadAndStart() {
        const count = parseInt(itunesCount.value) || 10;

        if (searchMode === 'playlist' && !selectedPlaylist) {
            alert("Wybierz playlistę z listy."); return;
        }
        if (searchMode === 'artist' && !itunesArtistQuery.value.trim()) {
            alert("Wpisz nazwę artysty."); return;
        }

        itunesLoadBtn.disabled = true;
        itunesLoadBtn.textContent = searchMode === 'playlist' ? 'Pobieranie...' : 'Szukam...';

        try {
            let found = [];

            if (searchMode === 'playlist') {
                found = await fetchPlaylistTracks(selectedPlaylist, count);
            } else {
                found = await fetchArtistTracks(itunesArtistQuery.value.trim(), count);
            }

            if (found.length === 0) {
                alert("Nie znaleziono utworów. Spróbuj czegoś innego.");
                return;
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
            alert("Błąd podczas wyszukiwania.");
        } finally {
            itunesLoadBtn.disabled = false;
            itunesLoadBtn.textContent = 'Szukaj i graj';
        }
    }

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
        audioEl.play().catch(() => {});
        pauseTimer = setTimeout(() => {
            if (audioEl) audioEl.pause();
        }, playDurations[currentRound] * 1000 + 300);
    }

    function loadNextTrack() {
        currentRound = 0;
        isArtistGuessed = (searchMode === 'artist');
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

    function onPlay(e) {
        if (!active) return;
        e.stopImmediatePropagation();
        playFragment();
    }

    function onNextRound(e) {
        if (!active) return;
        e.stopImmediatePropagation();
        stopAudio();
        if (currentRound < playDurations.length - 1) {
            currentRound++;
            timeDisplay.textContent = playDurations[currentRound];
            timeProgressFill.style.width = timeProgressPercents[currentRound] + '%';
        } else {
            const track = tracks[currentIndex];
            isArtistGuessed = true; isTitleGuessed = true;
            updateSecretDisplay();
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
            Auth.addScore(currentRound);
            setTimeout(() => nextSong(), 2000);
        }
    }

    function onVolume() {
        if (audioEl) audioEl.volume = volumeSlider.value / 100;
    }

    function onToggleLength() {
        if (active) updateSecretDisplay();
    }

    function activate() {
        active = true;
        showBadge();

        landingUI.style.display = 'none';
        loginBtn.style.display = 'none';
        setupUI.style.display = 'none';
        gameUI.style.display = 'none';
        itunesSetupUI.style.display = 'flex';

        playBtn.addEventListener('click', onPlay, true);
        nextRoundBtn.addEventListener('click', onNextRound, true);
        submitGuessBtn.addEventListener('click', onSubmit, true);
        volumeSlider.addEventListener('input', onVolume);
        hideLengthToggle.addEventListener('change', onToggleLength);
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

    function init() {
        buildPlaylistChips();
        setupTabs();

        itunesLoadBtn.addEventListener('click', () => { if (active) loadAndStart(); });
        itunesArtistQuery.addEventListener('keydown', e => { if (active && e.key === 'Enter') loadAndStart(); });

        document.getElementById('landingItunesBtn').addEventListener('click', () => {
            landingUI.style.display = 'none';
            activate();
        });

        document.getElementById('menuTrybItunes').addEventListener('click', () => {
            document.getElementById('menuDropdown').classList.add('hidden');
            if (!active) {
                if (gameUI.style.display !== 'none') { location.reload(); return; }
                landingUI.style.display = 'none';
                setupUI.style.display = 'none';
                loginBtn.style.display = 'none';
                activate();
            }
        });

        document.getElementById('menuTrybOG').addEventListener('click', () => {
            document.getElementById('menuDropdown').classList.add('hidden');
            if (active) { deactivate(); location.reload(); }
        });
    }

    return { init, activate, deactivate, isActive: () => active, goToSetup, stopAudio };

})();