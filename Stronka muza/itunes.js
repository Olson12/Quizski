// ─────────────────────────────────────────────────────────
//  TRYB SKIBIDI BETA – Deezer edition
// ─────────────────────────────────────────────────────────

const ItunesMode = (() => {

    const GENRE_POOLS = {
        'Top Polska': [
            'Mata', 'Young Leosia', 'Tymek', 'Otsochodzi', 'Quebonafide',
            'Ralph Kaminski', 'Sanah', 'Dawid Podsiadło', 'Bedoes',
            'SB Maffija', 'Białas', 'Taco Hemingway', 'Paluch', 'Kubi Producent'
        ],
        'Polska Viral': [
            'Mata', 'Young Leosia', 'Otsochodzi', 'Tymek', 'Kacperczyk',
            'Bedoes', 'Beteo', 'Oskar Cymerman', 'Sobel', 'Kwiat Jabłoni',
            'Daria Zawiałow', 'Smolasty', 'SB Maffija', 'Kuba Skowroński', 'Młody Dzban'
        ],
        'Polski Hip-Hop': [
            'Taco Hemingway', 'Quebonafide', 'Paluch', 'Białas', 'Hemp Gru',
            'Kędzierski', 'PRO8L3M', 'Ten Typ Mes', 'Sokół', 'Peja',
            'Kukon', 'Łona', 'Miuosh', 'O.S.T.R.', 'Bonus RPK'
        ],
        'Polski Trap': [
            'Mata', 'Bedoes', 'SB Maffija', 'Tymek', 'Otsochodzi',
            'Young Leosia', 'Kubi Producent', 'Beteo', 'ReTo', 'Kacperczyk',
            'Żabson', 'Pezet', 'Wac Toja', 'Zbuku', 'Tomasz Szubrycht'
        ],
        'Global Hits': [
            'Taylor Swift', 'Drake', 'Bad Bunny', 'The Weeknd', 'Olivia Rodrigo',
            'Doja Cat', 'Post Malone', 'Billie Eilish', 'Harry Styles', 'SZA',
            'Morgan Wallen', 'Dua Lipa', 'Ariana Grande', 'Ed Sheeran', 'Justin Bieber'
        ],
        'Rap US': [
            'Drake', 'Kendrick Lamar', 'J. Cole', 'Travis Scott', 'Lil Baby',
            'Future', 'Gunna', 'Lil Durk', 'Rod Wave', 'NBA YoungBoy',
            '21 Savage', 'Lil Uzi Vert', 'Playboi Carti', 'Polo G', 'Jack Harlow'
        ],
        'Drill': [
            'Pop Smoke', 'Kay Flock', 'Fivio Foreign', 'Sheff G', 'Sleepy Hallow',
            'Central Cee', 'Headie One', 'ArrDee', 'Dave', 'Unknown T',
            'Lil Durk', 'King Von', 'Polo G', 'Calboy', 'Stunna Gambino'
        ],
        'Latino': [
            'Bad Bunny', 'J Balvin', 'Ozuna', 'Anuel AA', 'Maluma',
            'Daddy Yankee', 'Reggaeton', 'Farruko', 'Myke Towers', 'Jhay Cortez',
            'Rauw Alejandro', 'Lunay', 'Sech', 'Zion', 'Nicky Jam'
        ],
        'Pop 2000s': [
            'Britney Spears', 'Christina Aguilera', 'Destiny\'s Child', 'Beyoncé', 'Nelly',
            'Eminem', 'Linkin Park', 'OutKast', 'Jay-Z', 'Usher',
            'Alicia Keys', 'Jennifer Lopez', '*NSYNC', 'Backstreet Boys', 'R. Kelly'
        ],
        'Rock Classics': [
            'Nirvana', 'Pearl Jam', 'Soundgarden', 'Red Hot Chili Peppers', 'Foo Fighters',
            'Green Day', 'The Smashing Pumpkins', 'Alice in Chains', 'Stone Temple Pilots', 'Bush',
            'Metallica', 'Guns N\' Roses', 'AC/DC', 'Led Zeppelin', 'Black Sabbath'
        ],
        'K-Pop': [
            'BTS', 'BLACKPINK', 'Stray Kids', 'TWICE', 'EXO',
            'NCT 127', 'aespa', 'IVE', 'NewJeans', 'LE SSERAFIM',
            'Red Velvet', 'Seventeen', 'ITZY', 'GOT7', 'MONSTA X'
        ],
        'R&B': [
            'SZA', 'Frank Ocean', 'H.E.R.', 'Daniel Caesar', 'Jhené Aiko',
            'Summer Walker', 'Giveon', 'Brent Faiyaz', 'Lucky Daye', 'Ella Mai',
            'Khalid', 'Kehlani', 'Jorja Smith', 'Bryson Tiller', 'PJ Morton'
        ],
        'Binnie': [
            'J. Cole', 'Drake', 'Kanye West', 'Maroon 5'
        ],
        'Trap Klasyki': [
            'Gucci Mane', 'Young Jeezy', 'T.I.', 'Waka Flocka Flame', 'Rae Sremmurd',
            'Migos', 'Young Thug', '2 Chainz', 'Meek Mill', 'Rick Ross',
            'Future', 'Fetty Wap', 'Trinidad James', 'Yo Gotti', 'August Alsina'
        ],
    };

    // ── Stan ──────────────────────────────────────────────
    let active = false;
    let tracks = [];
    let currentIndex = 0;
    let currentRound = 0;
    let isArtistGuessed = false;
    let isTitleGuessed = false;
    let audioEl = null;
    let pauseTimer = null;
    let searchMode = 'artist';
    let selectedGenreKey = null;

    const playDurations = [1, 2, 3, 5, 10];
    const timeProgressPercents = [10, 20, 30, 50, 100];

    // ── DOM ───────────────────────────────────────────────
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

    // ── Badge ─────────────────────────────────────────────
    function showBadge() {
        if (document.getElementById('itunesBadge')) return;
        const badge = document.createElement('div');
        badge.id = 'itunesBadge';
        badge.textContent = 'Tryb Skibidi Beta';
        badge.style.cssText = `
            position:fixed; top:1rem; left:50%; transform:translateX(-50%);
            font-family:'Space Mono',monospace; font-size:0.6rem;
            letter-spacing:0.15em; text-transform:uppercase; color:#00aaff;
            border:1px solid #ff0037a8; padding:0.2rem 0.6rem; border-radius:2px;
            background:rgba(10,10,15,0.9); z-index:200; pointer-events:none;
        `;
        document.body.appendChild(badge);
    }

    function hideBadge() {
        const b = document.getElementById('itunesBadge');
        if (b) b.remove();
    }

    // ── Tabs ──────────────────────────────────────────────
    function setupTabs() {
        tabArtist.addEventListener('click', () => setMode('artist'));
        tabGenre.addEventListener('click', () => setMode('genre'));
        tabGenre.textContent = 'Gatunek';
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

    // ── Genre chips ───────────────────────────────────────
    function buildGenreChips() {
        genreChips.innerHTML = '';
        Object.keys(GENRE_POOLS).forEach(key => {
            const chip = document.createElement('button');
            chip.classList.add('genre-chip');
            chip.textContent = key;
            chip.addEventListener('click', () => {
                document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                selectedGenreKey = key;
            });
            genreChips.appendChild(chip);
        });
    }

    // ── JSONP helper ──────────────────────────────────────
    function jsonp(url) {
        return new Promise((resolve, reject) => {
            const cbName = 'dzcb_' + Date.now() + Math.round(Math.random() * 99999);
            const script = document.createElement('script');
            const fullUrl = url + (url.includes('?') ? '&' : '?') + 'output=jsonp&callback=' + cbName;
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('JSONP timeout'));
            }, 8000);

            window[cbName] = (data) => {
                clearTimeout(timeout);
                cleanup();
                if (data.error) reject(new Error('Deezer: ' + JSON.stringify(data.error)));
                else resolve(data);
            };

            function cleanup() {
                delete window[cbName];
                if (script.parentNode) script.remove();
            }

            script.onerror = () => { clearTimeout(timeout); cleanup(); reject(new Error('JSONP fail')); };
            script.src = fullUrl;
            document.body.appendChild(script);
        });
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    // ─────────────────────────────────────────────────────
    //  FETCH: ARTYSTA – ze ścisłą walidacją
    // ─────────────────────────────────────────────────────
    async function fetchArtistTracks(artistName, limit) {
        const cleanName = artistName.trim();

        // 1. Znajdź artystę
        const searchData = await jsonp(
            `https://api.deezer.com/search/artist?q=${encodeURIComponent(cleanName)}&limit=5`
        );

        if (!searchData.data || searchData.data.length === 0) {
            throw new Error('NO_ARTIST');
        }

        // 2. Dopasuj artystę – szukaj dokładnego lub bliskiego trafienia
        const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const nameNorm  = normalize(cleanName);

        let artist = searchData.data.find(a => normalize(a.name) === nameNorm)
                  || searchData.data.find(a => normalize(a.name).includes(nameNorm) || nameNorm.includes(normalize(a.name)))
                  || searchData.data[0];

        const artistId   = artist.id;
        const artistName_ = artist.name;

        // 3. Pobierz top tracki
        const topData = await jsonp(
            `https://api.deezer.com/artist/${artistId}/top?limit=100`
        );

        if (!topData.data || topData.data.length === 0) {
            throw new Error('NO_TRACKS');
        }

        // 4. Filtruj – tylko piosenki gdzie ten artysta jest głównym twórcą LUB na feat
        //    Deezer zwraca contributors[] z wszystkimi wykonawcami tracka
        const valid = topData.data.filter(t => {
            if (!t.preview || !t.title) return false;

            // Główny artysta tracka to ten sam co szukany
            if (t.artist && t.artist.id === artistId) return true;

            // Feat – sprawdź contributors
            if (Array.isArray(t.contributors)) {
                return t.contributors.some(c => c.id === artistId);
            }

            return false;
        }).map(t => ({
            name:       t.title,
            artist:     artistName_,
            previewUrl: t.preview,
        }));

        // 5. Minimum check
        if (valid.length < 3) {
            throw new Error('TOO_FEW');
        }

        shuffle(valid);
        return valid.slice(0, limit);
    }

    // ─────────────────────────────────────────────────────
    //  FETCH: GATUNEK – losuje z puli artystów
    // ─────────────────────────────────────────────────────
    async function fetchGenreTracks(genreKey, limit) {
        const pool = GENRE_POOLS[genreKey];
        if (!pool || pool.length === 0) return [];

        // ── Ile artystów pobieramy? ───────────────────────
        // Duże pule: bierz więcej artystów niż potrzeba żeby mieć z czego wybierać
        // Małe pule (np. Binnie, 10 artystów): bierz wszystkich
        const isSmallPool = pool.length <= 6;
        const fetchCount  = isSmallPool
            ? pool.length                              // małe pule – wszyscy
            : Math.min(pool.length, Math.max(8, limit)); // duże – co najmniej 8

        const shuffledPool = [...pool];
        shuffle(shuffledPool);
        const toFetch = shuffledPool.slice(0, fetchCount);

        // ── Limit piosenek PER ARTYSTA ───────────────────
        // Cel: żaden artysta nie może stanowić więcej niż ~20-25% quizu
        // Dla małych pul podnosimy limit żeby nie brickowało
        const perArtistCap = isSmallPool
            ? Math.max(3, Math.ceil(limit / pool.length * 2))  // małe: elastycznie
            : Math.max(2, Math.ceil(limit * 0.25));             // duże: max 25%

        const allTracks = [];

        await Promise.allSettled(toFetch.map(async (artistName) => {
            try {
                const searchData = await jsonp(
                    `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=1`
                );
                if (!searchData.data || !searchData.data[0]) return;

                const artistId = searchData.data[0].id;
                const realName = searchData.data[0].name;

                const topData = await jsonp(
                    `https://api.deezer.com/artist/${artistId}/top?limit=50`
                );
                if (!topData.data) return;

                const valid = topData.data
                    .filter(t => t.preview && t.title && t.artist && t.artist.id === artistId)
                    .map(t => ({
                        name:       t.title,
                        artist:     realName,
                        previewUrl: t.preview,
                    }));

                // Tasuj top tracki żeby nie było zawsze tych samych hitów
                shuffle(valid);

                // Zastosuj per-artist cap już tutaj
                allTracks.push(...valid.slice(0, perArtistCap));
            } catch {
                // Cichy fail – jeden artysta nie działa, reszta działa
            }
        }));

        if (allTracks.length === 0) return [];

        // ── Usuń duplikaty po tytule+artyście ───────────
        const seen = new Set();
        const unique = allTracks.filter(t => {
            const key = t.artist.toLowerCase() + '|' + t.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // ── Finalne tasowanie + trim do żądanej liczby ───
        shuffle(unique);
        return unique.slice(0, limit);
    }

    // ─────────────────────────────────────────────────────
    //  LOAD AND START
    // ─────────────────────────────────────────────────────
    async function loadAndStart() {
        const count = parseInt(itunesCount.value) || 10;

        if (searchMode === 'genre' && !selectedGenreKey) {
            showError('Wybierz gatunek z listy.'); return;
        }
        if (searchMode === 'artist' && !itunesArtistQuery.value.trim()) {
            showError('Wpisz nazwę artysty.'); return;
        }

        itunesLoadBtn.disabled = true;
        itunesLoadBtn.textContent = 'Pobieranie...';
        clearError();

        try {
            let found = [];

            if (searchMode === 'genre') {
                found = await fetchGenreTracks(selectedGenreKey, count);
                if (found.length === 0) {
                    showError('Nie udało się pobrać piosenek. Spróbuj ponownie.');
                    return;
                }
            } else {
                try {
                    found = await fetchArtistTracks(itunesArtistQuery.value.trim(), count);
                } catch (e) {
                    const msg = e.message;
                    if (msg === 'NO_ARTIST')  showError('Nie znaleziono takiego artysty. Sprawdź pisownię.');
                    else if (msg === 'NO_TRACKS') showError('Ten artysta nie ma dostępnych piosenek na Deezerze.');
                    else if (msg === 'TOO_FEW')   showError('Za mało piosenek tego artysty z podglądem audio (min. 3).');
                    else showError('Błąd pobierania: ' + msg);
                    return;
                }
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
            showError('Błąd połączenia. Spróbuj ponownie.');
            console.error(e);
        } finally {
            itunesLoadBtn.disabled = false;
            itunesLoadBtn.textContent = 'Szukaj i graj';
        }
    }

    // ── Error display ─────────────────────────────────────
    function showError(msg) {
        let el = document.getElementById('itunesError');
        if (!el) {
            el = document.createElement('div');
            el.id = 'itunesError';
            el.style.cssText = `
                font-size:.7rem; color:#ff3366; letter-spacing:.08em;
                text-align:center; padding:.4rem 0; min-height:1.2rem;
            `;
            itunesLoadBtn.parentNode.insertBefore(el, itunesLoadBtn);
        }
        el.textContent = msg;
    }

    function clearError() {
        const el = document.getElementById('itunesError');
        if (el) el.textContent = '';
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
        audioEl.play().catch(() => {});
        pauseTimer = setTimeout(() => {
            if (audioEl) audioEl.pause();
        }, playDurations[currentRound] * 1000 + 300);
    }

    // ── Game ──────────────────────────────────────────────
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

    // ── Listenery gry ─────────────────────────────────────
    function onPlay(e) {
        if (!active) return;
        e.stopImmediatePropagation();
        playBtn.disabled = true;
        setTimeout(() => { playBtn.disabled = false; }, 200);
        playFragment();
    }

    function onNextRound(e) {
        if (!active) return;
        e.stopImmediatePropagation();
        nextRoundBtn.disabled = true;
        setTimeout(() => { nextRoundBtn.disabled = false; }, 200);
        stopAudio();
        if (currentRound < playDurations.length - 1) {
            currentRound++;
            timeDisplay.textContent = playDurations[currentRound];
            timeProgressFill.style.width = timeProgressPercents[currentRound] + '%';
        } else {
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
            if (typeof Auth !== 'undefined') Auth.addScore(currentRound);
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

    function showHome() {
        deactivate();
        setupUI.style.display = 'none';
        loginBtn.style.display = 'none';
        gameUI.style.display = 'none';
        itunesSetupUI.style.display = 'none';
        landingUI.style.display = 'flex';
    }

    // ── Init ──────────────────────────────────────────────
    function init() {
        buildGenreChips();
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
            if (active) { deactivate(); }
        });

        const homeBtn = document.getElementById('menuHome');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                document.getElementById('menuDropdown').classList.add('hidden');
                if (gameUI.style.display !== 'none') { location.reload(); return; }
                showHome();
            });
        }
    }

    return { init, activate, deactivate, isActive: () => active, goToSetup, stopAudio };

})();