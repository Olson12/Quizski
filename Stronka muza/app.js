const clientId = '2ef82c165944460a99767da883f3eb23';
const redirectUri = 'http://127.0.0.1:5500/index.html';
const scopes = 'streaming user-read-email user-read-private user-modify-playback-state playlist-read-private playlist-read-collaborative';

const loginBtn = document.getElementById('loginBtn');
const setupUI = document.getElementById('setupUI');
const playlistInput = document.getElementById('playlistInput');
const loadPlaylistBtn = document.getElementById('loadPlaylistBtn');
const gameUI = document.getElementById('gameUI');
const playBtn = document.getElementById('playBtn');
const nextRoundBtn = document.getElementById('nextRoundBtn');
const timeDisplay = document.getElementById('timeDisplay');
const trackCounterDisplay = document.getElementById('trackCounterDisplay');
const secretDisplay = document.getElementById('secretDisplay');
const guessInput = document.getElementById('guessInput');
const submitGuessBtn = document.getElementById('submitGuessBtn');

let player;
let deviceId;
const playDurations = [1, 2, 3, 5, 10];
let currentRound = 0;
let token = localStorage.getItem('access_token');
let pauseTimeout;
let expectedPlaying = false;
let playlistTracks = [];
let currentTrackIndex = 0;
let isAlbumMode = false;
let currentArtist = "";
let currentTitle = "";
let isArtistGuessed = false;
let isTitleGuessed = false;

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

const base64encode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const authenticate = async () => {
    const codeVerifier = generateRandomString(64);
    window.localStorage.setItem('code_verifier', codeVerifier);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);
    const authUrl = new URL("https://accounts.spotify.com/authorize");
    const params = {
        response_type: 'code', client_id: clientId, scope: scopes,
        code_challenge_method: 'S256', code_challenge: codeChallenge,
        redirect_uri: redirectUri, show_dialog: 'true'
    };
    authUrl.search = new URLSearchParams(params).toString();
    window.location.href = authUrl.toString();
};

const getToken = async (code) => {
    const codeVerifier = localStorage.getItem('code_verifier');
    const payload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId, grant_type: 'authorization_code',
            code: code, redirect_uri: redirectUri, code_verifier: codeVerifier,
        }),
    };
    const response = await fetch("https://accounts.spotify.com/api/token", payload);
    const data = await response.json();
    if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        token = data.access_token;
        window.history.replaceState({}, document.title, "/index.html");
        initGame();
        initSpotifyPlayer();
    }
};

function initSpotifyPlayer() {
    if (!token) return;
    if (player) player.disconnect();

    player = new Spotify.Player({
        name: 'Music Quiz Player',
        getOAuthToken: cb => { cb(token); },
        volume: 0.5
    });

    player.addListener('ready', ({ device_id }) => {
        deviceId = device_id;
        playBtn.disabled = false;
        nextRoundBtn.disabled = false;
    });

    player.addListener('player_state_changed', state => {
        if (state && !state.paused && expectedPlaying) {
            expectedPlaying = false;
            pauseTimeout = setTimeout(() => player.pause(), (playDurations[currentRound] * 1000) + 500);
        }
    });

    player.connect();
}

window.onSpotifyWebPlaybackSDKReady = () => {
    if (token) initSpotifyPlayer();
};

const urlParams = new URLSearchParams(window.location.search);
let code = urlParams.get('code');
if (code) {
    getToken(code);
} else if (token) {
    initGame();
}

loginBtn.addEventListener('click', authenticate);

function initGame() {
    loginBtn.style.display = 'none';
    setupUI.style.display = 'block';
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

loadPlaylistBtn.addEventListener('click', async () => {
    console.log('--- KLIK loadPlaylistBtn ---');

    const url = playlistInput.value;
    console.log('URL wpisany:', url);

    let id = null;
    let isAlbum = false;
    if (url.includes('playlist/')) { id = url.split('playlist/')[1].split('?')[0]; }
    else if (url.includes('album/')) { id = url.split('album/')[1].split('?')[0]; isAlbum = true; }

    console.log('Wykryty ID:', id, '| isAlbum:', isAlbum);

    if (!id) { alert("Wklej poprawny link."); return; }

    const endpoint = isAlbum
        ? `https://api.spotify.com/v1/albums/${id}/tracks`
        : `https://api.spotify.com/v1/playlists/${id}/items`;

    console.log('Endpoint:', endpoint);
    console.log('Token (pierwsze 20 znaków):', token?.substring(0, 20));

    try {
        const response = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${token}` } });

        console.log('Status odpowiedzi:', response.status);

        if (!response.ok) {
            if (response.status === 403) {
                alert("Błąd 403: Spotify odrzuca dostęp do playlisty. Spróbuj się wylogować i zalogować ponownie.");
            } else if (response.status === 401) {
                localStorage.clear();
                location.reload();
            }
            return;
        }

        const data = await response.json();
        console.log('PEŁNA ODPOWIEDŹ Z API:', JSON.stringify(data));

        const items = data.items || [];
        console.log('Liczba items:', items.length);
        console.log('Pierwszy item (surowy):', items[0]);

        playlistTracks = isAlbum
            ? items.filter(t => t && t.uri)
            : items.map(i => i.item).filter(t => t && t.uri && t.name);

        console.log('playlistTracks po filtrowaniu:', playlistTracks.length);
        console.log('Pierwszy track:', playlistTracks[0]);

        if (playlistTracks.length === 0) {
            alert("Nie znaleziono utworów na tej liście.");
            return;
        }

        isAlbumMode = isAlbum;
        shuffleArray(playlistTracks);
        setupUI.style.display = 'none';
        gameUI.style.display = 'block';
        currentTrackIndex = 0;
        loadNextSongData();
    } catch (e) {
        console.error('BŁĄD:', e);
        alert("Wystąpił błąd podczas ładowania playlisty.");
    }
});

function loadNextSongData() {
    currentRound = 0;
    timeDisplay.textContent = playDurations[0];
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
    const mask = (text) => text.replace(/[\p{L}\d]/gu, '*');
    const displayArtist = isArtistGuessed ? currentArtist : mask(currentArtist);
    const displayTitle = isTitleGuessed ? currentTitle : mask(currentTitle);
    secretDisplay.textContent = `${displayArtist} - ${displayTitle}`;
}

function clean(str) { return str.toLowerCase().replace(/[^\p{L}\d\s]/gu, ""); }

submitGuessBtn.addEventListener('click', () => {
    const inputWords = clean(guessInput.value).split(/\s+/).filter(w => w.length > 0);
    if (!isArtistGuessed && clean(currentArtist).split(/\s+/).some(w => inputWords.includes(w))) isArtistGuessed = true;
    if (!isTitleGuessed && clean(currentTitle).split(/\s+/).some(w => inputWords.includes(w))) isTitleGuessed = true;
    guessInput.value = '';
    updateSecretDisplay();
    if (isArtistGuessed && isTitleGuessed) {
        setTimeout(() => { alert("Zgadłeś wszystko!"); nextSong(); }, 300);
    }
});

function nextSong() {
    currentTrackIndex++;
    if (currentTrackIndex >= playlistTracks.length) {
        alert("To była ostatnia piosenka!");
        location.reload();
        return;
    }
    loadNextSongData();
}

playBtn.addEventListener('click', () => {
    if (!deviceId) return;
    clearTimeout(pauseTimeout);
    expectedPlaying = true;
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [playlistTracks[currentTrackIndex].uri], position_ms: 0 }),
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
});

nextRoundBtn.addEventListener('click', () => {
    if (currentRound < playDurations.length - 1) {
        currentRound++;
        timeDisplay.textContent = playDurations[currentRound];
    } else {
        isArtistGuessed = true; isTitleGuessed = true; updateSecretDisplay();
        setTimeout(() => { alert("Koniec prób! Następny utwór."); nextSong(); }, 300);
    }
});