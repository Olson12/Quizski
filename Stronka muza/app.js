const redirectUri = 'https://quizski.pl';
const scopes = 'streaming user-read-email user-read-private user-modify-playback-state';

const loginBtn            = document.getElementById('loginBtn');
const landingUI           = document.getElementById('landingUI');
const setupUI             = document.getElementById('setupUI');
const playlistInput       = document.getElementById('playlistInput');
const loadPlaylistBtn     = document.getElementById('loadPlaylistBtn');
const gameUI              = document.getElementById('gameUI');
const playBtn             = document.getElementById('playBtn');
const nextRoundBtn        = document.getElementById('nextRoundBtn');
const timeDisplay         = document.getElementById('timeDisplay');
const trackCounterDisplay = document.getElementById('trackCounterDisplay');
const secretDisplay       = document.getElementById('secretDisplay');
const guessInput          = document.getElementById('guessInput');
const submitGuessBtn      = document.getElementById('submitGuessBtn');
const hideLengthToggle    = document.getElementById('hideLengthToggle');
const volumeSlider        = document.getElementById('volumeSlider');
const timeProgressFill    = document.getElementById('timeProgressFill');
const menuBtn             = document.getElementById('menuBtn');
const menuDropdown        = document.getElementById('menuDropdown');
const menuLogout          = document.getElementById('menuLogout');
const historyList         = document.getElementById('historyList');

let player;
let deviceId;
const playDurations = [1, 2, 3, 5, 10];
const timeProgressPercents = [10, 20, 30, 50, 100];

let currentRound = 0;
let pauseTimeout;
let expectedPlaying = false;
let playlistTracks = [];
let currentTrackIndex = 0;
let isAlbumMode = false;
let currentArtist = "";
let currentTitle = "";
let isArtistGuessed = false;
let isTitleGuessed = false;
let spotifyToken = null;

const urlParams = new URLSearchParams(window.location.search);
const pendingCode = urlParams.get('code');
const expiry = localStorage.getItem('token_expiry');
const isExpired = !expiry || Date.now() > parseInt(expiry);
if (isExpired && !pendingCode) localStorage.clear();
let userToken = (isExpired && !pendingCode) ? null : localStorage.getItem('access_token');

async function fetchSpotifyToken() {
    try {
        const res = await fetch('/.netlify/functions/spotify-token');
        const data = await res.json();
        spotifyToken = data.access_token;
    } catch (e) { console.error(e); }
}

menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown.classList.toggle('hidden');
});

document.addEventListener('click', () => menuDropdown.classList.add('hidden'));

document.getElementById('menuTrybOG').addEventListener('click', () => {
    menuDropdown.classList.add('hidden');
    if (ItunesMode.isActive()) {
        ItunesMode.deactivate();
    }
    gameUI.style.display = 'none';
    landingUI.style.display = 'none';
    loginBtn.style.display = userToken ? 'none' : 'block';
    setupUI.style.display = userToken ? 'block' : 'none';
    playlistTracks = [];
    currentTrackIndex = 0;
    historyList.innerHTML = '';
});

menuLogout.addEventListener('click', () => {
    if (userToken) {
        localStorage.clear();
        location.reload();
    } else {
        authenticate();
    }
});

document.getElementById('landingOGBtn').addEventListener('click', () => {
    landingUI.style.display = 'none';
    if (userToken) { setupUI.style.display = 'block'; }
    else { loginBtn.style.display = 'block'; }
});

function addToHistory(artist, title, guessed, secondsUsed) {
    const item = document.createElement('div');
    item.classList.add('history-item', guessed ? 'guessed' : 'failed');
    const artistEl = document.createElement('div'); artistEl.classList.add('h-artist'); artistEl.textContent = artist;
    const titleEl  = document.createElement('div'); titleEl.classList.add('h-title');  titleEl.textContent = title;
    const timeEl   = document.createElement('div'); timeEl.classList.add('h-time');
    timeEl.textContent = guessed ? `✓ ${secondsUsed}s` : '✕ nie zgadnięto';
    item.appendChild(artistEl); item.appendChild(titleEl); item.appendChild(timeEl);
    historyList.appendChild(item);
    historyList.scrollTop = historyList.scrollHeight;
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSuccessSound() {
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.08, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 8);
    const source = audioCtx.createBufferSource(); source.buffer = buffer;
    const filter = audioCtx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1800; filter.Q.value = 0.8;
    const gain = audioCtx.createGain(); gain.gain.value = 2.5;
    source.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    source.start();
}

function triggerEdgeGlow() {
    document.body.classList.remove('correct-flash');
    void document.body.offsetWidth;
    document.body.classList.add('correct-flash');
    document.body.addEventListener('animationend', () => document.body.classList.remove('correct-flash'), { once: true });
}

const generateRandomString = (l) => {
    const p = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const v = crypto.getRandomValues(new Uint8Array(l));
    return v.reduce((acc, x) => acc + p[x % p.length], "");
};

const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) =>
    btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const authenticate = async () => {
    const codeVerifier = generateRandomString(64);
    localStorage.setItem('code_verifier', codeVerifier);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);
    const clientId = (await fetch('/.netlify/functions/spotify-token?clientId=true').then(r => r.json())).client_id;
    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.search = new URLSearchParams({
        response_type: 'code', client_id: clientId, scope: scopes,
        code_challenge_method: 'S256', code_challenge: codeChallenge,
        redirect_uri: redirectUri, show_dialog: 'true'
    }).toString();
    window.location.href = authUrl.toString();
};

const getToken = async (code) => {
    const codeVerifier = localStorage.getItem('code_verifier');
    const clientId = (await fetch('/.netlify/functions/spotify-token?clientId=true').then(r => r.json())).client_id;
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: codeVerifier }),
    });
    const data = await response.json();
    if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('token_expiry', Date.now() + 3600 * 1000);
        localStorage.removeItem('code_verifier');
        userToken = data.access_token;
        window.history.replaceState({}, document.title, "/");
        landingUI.style.display = 'none';
        setupUI.style.display = 'block';
        initSpotifyPlayer();
    }
};

function initSpotifyPlayer() {
    if (!userToken) return;
    if (player) player.disconnect();
    player = new Spotify.Player({
        name: 'Music Quiz Player',
        getOAuthToken: cb => { cb(userToken); },
        volume: volumeSlider.value / 100
    });
    player.addListener('ready', ({ device_id }) => {
        deviceId = device_id;
        playBtn.disabled = false;
        nextRoundBtn.disabled = false;
    });
    player.addListener('player_state_changed', state => {
        if (state && !state.paused && expectedPlaying) {
            expectedPlaying = false;
            pauseTimeout = setTimeout(() => player.pause(), playDurations[currentRound] * 1000 + 500);
        }
    });
    player.connect();
}

window.onSpotifyWebPlaybackSDKReady = () => { if (userToken) initSpotifyPlayer(); };

volumeSlider.addEventListener('input', () => {
    if (ItunesMode.isActive()) return;
    if (player) player.setVolume(volumeSlider.value / 100);
});

async function init() {
    Auth.init();
    ItunesMode.init();
    const code = urlParams.get('code');
    if (code) {
        await fetchSpotifyToken();
        await getToken(code);
        return;
    }
    if (userToken) {
        await fetchSpotifyToken();
        initSpotifyPlayer();
    }
    landingUI.style.display = 'flex';
}

init();

fetch('/.netlify/functions/user-auth?action=logVisit', { method: 'POST' }).catch(() => {});
loginBtn.addEventListener('click', authenticate);
hideLengthToggle.addEventListener('change', () => { if (!ItunesMode.isActive()) updateSecretDisplay(); });

playlistInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadPlaylistBtn.click(); });
guessInput.addEventListener('keydown',   e => { if (e.key === 'Enter') submitGuessBtn.click(); });

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

loadPlaylistBtn.addEventListener('click', async () => {
    if (ItunesMode.isActive()) return;
    if (!spotifyToken) await fetchSpotifyToken();
    if (!spotifyToken) { alert("Błąd połączenia z Spotify. Odśwież stronę."); return; }

    loadPlaylistBtn.disabled = true;
    loadPlaylistBtn.textContent = 'Ładowanie...';

    const url = playlistInput.value;
    let id = null;
    
    if (url.includes('album/')) { 
        id = url.split('album/')[1].split('?')[0]; 
    }

    if (!id) {
        alert("Wklej poprawny link do albumu.");
        loadPlaylistBtn.disabled = false;
        loadPlaylistBtn.textContent = 'Zatwierdź album';
        return;
    }

    const endpoint = `https://api.spotify.com/v1/albums/${id}/tracks`;

    try {
        const response = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${spotifyToken}` } });
        if (!response.ok) {
            if (response.status === 429) alert(`Spotify rate limit – poczekaj ${response.headers.get('Retry-After') || '30'}s.`);
            else if (response.status === 401) { await fetchSpotifyToken(); alert("Token odświeżony, spróbuj ponownie."); }
            else alert(`Błąd ${response.status}.`);
            return;
        }
        const data = await response.json();
        const items = data.items || [];
        playlistTracks = items.filter(t => t && t.uri);

        if (playlistTracks.length === 0) { alert("Nie znaleziono utworów."); return; }

        isAlbumMode = true;
        shuffleArray(playlistTracks);
        setupUI.style.display = 'none';
        gameUI.style.display = 'flex';
        currentTrackIndex = 0;
        loadNextSongData();
    } catch (e) {
        console.error(e);
        alert("Błąd podczas ładowania albumu.");
    } finally {
        loadPlaylistBtn.disabled = false;
        loadPlaylistBtn.textContent = 'Zatwierdź album';
    }
});

function updateTimeProgress() {
    timeProgressFill.style.width = timeProgressPercents[currentRound] + '%';
}

function loadNextSongData() {
    currentRound = 0;
    timeDisplay.textContent = playDurations[0];
    updateTimeProgress();
    const track = playlistTracks[currentTrackIndex];
    currentTitle = track.name;
    currentArtist = track.artists[0].name;
    isArtistGuessed = isAlbumMode;
    isTitleGuessed = false;
    guessInput.value = '';
    updateSecretDisplay();
    trackCounterDisplay.textContent = `${currentTrackIndex + 1} / ${playlistTracks.length}`;
}

function updateSecretDisplay() {
    const hideLength = hideLengthToggle.checked;
    const mask = t => hideLength ? '*****' : t.replace(/[\p{L}\d]/gu, '*');
    secretDisplay.textContent = `${isArtistGuessed ? currentArtist : mask(currentArtist)} - ${isTitleGuessed ? currentTitle : mask(currentTitle)}`;
}

function clean(str) { return str.toLowerCase().replace(/[^\p{L}\d\s]/gu, ""); }

submitGuessBtn.addEventListener('click', () => {
    if (ItunesMode.isActive()) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const inputWords = clean(guessInput.value).split(/\s+/).filter(w => w.length > 0);
    if (!isArtistGuessed && clean(currentArtist).split(/\s+/).some(w => inputWords.includes(w))) isArtistGuessed = true;
    if (!isTitleGuessed && clean(currentTitle).split(/\s+/).some(w => inputWords.includes(w))) isTitleGuessed = true;
    guessInput.value = '';
    updateSecretDisplay();
    if (isArtistGuessed && isTitleGuessed) {
        playSuccessSound(); triggerEdgeGlow();
        addToHistory(currentArtist, currentTitle, true, playDurations[currentRound]);
        Auth.addScore(currentRound);
        setTimeout(() => nextSong(), 2000);
    }
});

function nextSong(failed = false) {
    if (failed) addToHistory(currentArtist, currentTitle, false, null);
    currentTrackIndex++;
    if (currentTrackIndex >= playlistTracks.length) { alert("To była ostatnia piosenka!"); location.reload(); return; }
    loadNextSongData();
}

playBtn.addEventListener('click', () => {
    if (ItunesMode.isActive()) return;
    
    playBtn.disabled = true;
    setTimeout(() => { playBtn.disabled = false; }, 200);

    if (!deviceId || !userToken) { localStorage.clear(); location.reload(); return; }
    clearTimeout(pauseTimeout);
    expectedPlaying = true;
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [playlistTracks[currentTrackIndex].uri], position_ms: 0 }),
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
    });
});

nextRoundBtn.addEventListener('click', () => {
    if (ItunesMode.isActive()) return;

    nextRoundBtn.disabled = true;
    setTimeout(() => { nextRoundBtn.disabled = false; }, 200);

    clearTimeout(pauseTimeout);
    if (player) player.pause();

    if (currentRound < playDurations.length - 1) {
        currentRound++;
        timeDisplay.textContent = playDurations[currentRound];
        updateTimeProgress();
    } else {
        isArtistGuessed = true; isTitleGuessed = true; updateSecretDisplay();
        setTimeout(() => { nextSong(true); alert("Koniec prób! Następny utwór."); }, 300);
    }
});