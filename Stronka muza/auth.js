// ─────────────────────────────────────────────────────────
//  AUTH & SCORE MODULE
//  Ładowany przed app.js i itunes.js
// ─────────────────────────────────────────────────────────

const Auth = (() => {

    const POINTS_PER_ROUND = [10, 8, 5, 3, 1]; // indeks = runda (0-4)

    const RANKS = [
        { min: 500, label: 'GOAT',       color: '#ffd700' },
        { min: 300, label: 'Brochacho',  color: '#ff3366' },
        { min: 200, label: 'Ziomal',     color: '#00aaff' },
        { min: 100, label: 'Nowicjusz',  color: '#aa88ff' },
        { min: 0,   label: 'Frajer',     color: '#5a5a72' },
    ];

    function getRank(points) {
        return RANKS.find(r => points >= r.min) || RANKS[RANKS.length - 1];
    }

    // ── Stan ──────────────────────────────────────────────
    let token    = localStorage.getItem('qsk_token')    || null;
    let nick     = localStorage.getItem('qsk_nick')     || null;
    let points   = parseInt(localStorage.getItem('qsk_points')) || 0;
    let authMode = 'login'; // 'login' | 'register'
    let sessionPts = 0;

    // ── DOM ───────────────────────────────────────────────
    const authModal        = document.getElementById('authModal');
    const authModalClose   = document.getElementById('authModalClose');
    const authModalTitle   = document.getElementById('authModalTitle');
    const tabLoginBtn      = document.getElementById('tabLogin');
    const tabRegisterBtn   = document.getElementById('tabRegister');
    const authNick         = document.getElementById('authNick');
    const authPassword     = document.getElementById('authPassword');
    const authError        = document.getElementById('authError');
    const authSubmitBtn    = document.getElementById('authSubmitBtn');

    const scoreboardModal  = document.getElementById('scoreboardModal');
    const scoreboardClose  = document.getElementById('scoreboardClose');
    const scoreboardList   = document.getElementById('scoreboardList');
    const userBadge        = document.getElementById('userBadge');
    const logoutFromScore  = document.getElementById('logoutFromScore');

    const menuAuthBtn      = document.getElementById('menuAuthBtn');
    const menuDropdown     = document.getElementById('menuDropdown');

    const sessionPtsDisplay = document.getElementById('sessionPtsDisplay');
    const sessionPtsVal     = document.getElementById('sessionPtsVal');

    // ── API ───────────────────────────────────────────────
    async function api(action, body = {}) {
        const isGet = action === 'scoreboard';
        const url = `/.netlify/functions/user-auth?action=${action}`;
        const res = await fetch(url, isGet
            ? { method: 'GET' }
            : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        );
        return res.json();
    }

    // ── Rangi ─────────────────────────────────────────────
    function rankBadge(pts) {
        const r = getRank(pts);
        return `<span class="rank-badge" style="color:${r.color};border-color:${r.color}">${r.label}</span>`;
    }

    // ── UI helpers ────────────────────────────────────────
    function updateMenuBtn() {
        if (token && nick) {
            menuAuthBtn.innerHTML = `🏆 Scoreboard`;
        } else {
            menuAuthBtn.innerHTML = `👤 Zaloguj / Zarejestruj`;
        }
    }

    function setError(msg) { authError.textContent = msg; }

    function setAuthMode(mode) {
        authMode = mode;
        if (mode === 'login') {
            tabLoginBtn.classList.add('active');
            tabRegisterBtn.classList.remove('active');
            authModalTitle.textContent = 'Zaloguj się';
            authSubmitBtn.textContent = 'Zaloguj';
        } else {
            tabRegisterBtn.classList.add('active');
            tabLoginBtn.classList.remove('active');
            authModalTitle.textContent = 'Zarejestruj się';
            authSubmitBtn.textContent = 'Zarejestruj';
        }
        setError('');
    }

    function openAuthModal() {
        authNick.value = '';
        authPassword.value = '';
        setError('');
        authModal.classList.remove('hidden');
        setTimeout(() => authNick.focus(), 50);
    }

    function closeAuthModal() { authModal.classList.add('hidden'); }

    async function openScoreboard() {
        scoreboardModal.classList.remove('hidden');
        const rank = getRank(points);
        userBadge.innerHTML = `
            <span class="sb-nick">${nick}</span>
            ${rankBadge(points)}
            <span class="sb-pts">${points} pkt</span>
        `;
        scoreboardList.innerHTML = '<div class="sb-loading">Ładowanie...</div>';

        try {
            const data = await api('scoreboard');
            if (!Array.isArray(data)) throw new Error();
            if (data.length === 0) {
                scoreboardList.innerHTML = '<div class="sb-loading">Brak wyników.</div>';
                return;
            }
            scoreboardList.innerHTML = data.map((u, i) => {
                const isMe = u.nick === nick;
                return `
                    <div class="sb-row ${isMe ? 'sb-me' : ''}">
                        <span class="sb-pos">${i + 1}</span>
                        <span class="sb-name">${u.nick}</span>
                        ${rankBadge(u.points)}
                        <span class="sb-score">${u.points}</span>
                    </div>
                `;
            }).join('');
        } catch {
            scoreboardList.innerHTML = '<div class="sb-loading">Błąd ładowania.</div>';
        }
    }

    function closeScoreboard() { scoreboardModal.classList.add('hidden'); }

    // ── Submit auth ────────────────────────────────────────
    async function submitAuth() {
        const n = authNick.value.trim();
        const p = authPassword.value;
        if (!n || !p) { setError('Wpisz nick i hasło.'); return; }

        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = '...';
        setError('');

        try {
            const data = await api(authMode === 'login' ? 'login' : 'register', { nick: n, password: p });
            if (data.ok) {
                token  = data.token;
                nick   = data.nick;
                points = data.points;
                localStorage.setItem('qsk_token',  token);
                localStorage.setItem('qsk_nick',   nick);
                localStorage.setItem('qsk_points', points);
                closeAuthModal();
                updateMenuBtn();
                showSessionPts();
            } else {
                setError(data.error || 'Błąd.');
            }
        } catch {
            setError('Błąd połączenia.');
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = authMode === 'login' ? 'Zaloguj' : 'Zarejestruj';
        }
    }

    // ── Wyloguj ────────────────────────────────────────────
    function logout() {
        token = null; nick = null; points = 0; sessionPts = 0;
        localStorage.removeItem('qsk_token');
        localStorage.removeItem('qsk_nick');
        localStorage.removeItem('qsk_points');
        updateMenuBtn();
        closeScoreboard();
        hideSessionPts();
    }

    // ── Punkty sesyjne ─────────────────────────────────────
    function showSessionPts() {
        if (!token) return;
        sessionPtsDisplay.classList.remove('hidden');
        sessionPtsVal.textContent = sessionPts;
    }

    function hideSessionPts() {
        sessionPtsDisplay.classList.add('hidden');
    }

    // ── Dodaj punkty ────────────────────────────────────────
    async function addScore(round) {
        if (!token) return;
        try {
            const data = await api('addScore', { token, round });
            if (data.ok) {
                points = data.points;
                sessionPts += data.added;
                localStorage.setItem('qsk_points', points);
                sessionPtsVal.textContent = sessionPts;

                // Krótki flash na stat-value
                sessionPtsDisplay.classList.add('pts-flash');
                setTimeout(() => sessionPtsDisplay.classList.remove('pts-flash'), 600);
            }
        } catch (e) {
            console.warn('addScore error:', e);
        }
    }

    // ── Listenery ─────────────────────────────────────────
    function init() {
        updateMenuBtn();
        if (token) showSessionPts();

        tabLoginBtn.addEventListener('click',    () => setAuthMode('login'));
        tabRegisterBtn.addEventListener('click', () => setAuthMode('register'));
        authSubmitBtn.addEventListener('click', submitAuth);
        authModalClose.addEventListener('click', closeAuthModal);
        scoreboardClose.addEventListener('click', closeScoreboard);
        logoutFromScore.addEventListener('click', logout);

        // Enter w polach
        authNick.addEventListener('keydown',     e => { if (e.key === 'Enter') authPassword.focus(); });
        authPassword.addEventListener('keydown', e => { if (e.key === 'Enter') submitAuth(); });

        // Klik poza modalem zamyka
        authModal.addEventListener('click',      e => { if (e.target === authModal) closeAuthModal(); });
        scoreboardModal.addEventListener('click', e => { if (e.target === scoreboardModal) closeScoreboard(); });

        menuAuthBtn.addEventListener('click', () => {
            menuDropdown.classList.add('hidden');
            if (token && nick) { openScoreboard(); }
            else { setAuthMode('login'); openAuthModal(); }
        });
    }

    return {
        init,
        addScore,
        isLoggedIn: () => !!token,
        getNick: () => nick,
        getPoints: () => points,
    };

})();