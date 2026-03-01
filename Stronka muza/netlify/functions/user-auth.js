// netlify/functions/user-auth.js
// Baza danych: Upstash Redis (REST API, zero npm)
//
// Wymagane env vars w Netlify Dashboard:
//   UPSTASH_URL    – np. https://eu1-xxx-yyy.upstash.io
//   UPSTASH_TOKEN  – REST Token z konsoli Upstash

const crypto = require('crypto');

const POINTS_PER_ROUND = [10, 8, 5, 3, 1];

// ── Upstash REST helpers ───────────────────────────────────
// Każde polecenie Redis to POST na /{COMMAND}/{arg1}/{arg2}/...

async function redis(command, ...args) {
    const url = process.env.UPSTASH_URL + '/' + [command, ...args.map(a => encodeURIComponent(String(a)))].join('/');
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + process.env.UPSTASH_TOKEN,
        },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Redis ${command} failed (${res.status}): ${text}`);
    }
    const json = await res.json();
    return json.result;
}

// Zapisz JSON pod kluczem (z opcjonalnym EX = sekundy do wygaśnięcia)
async function setJSON(key, value, exSeconds) {
    if (exSeconds) {
        return redis('SET', key, JSON.stringify(value), 'EX', exSeconds);
    }
    return redis('SET', key, JSON.stringify(value));
}

// Odczytaj JSON spod klucza (null jeśli nie istnieje)
async function getJSON(key) {
    const raw = await redis('GET', key);
    if (raw === null || raw === undefined) return null;
    try { return JSON.parse(raw); } catch { return raw; }
}

// Usuń klucz
async function del(key) {
    return redis('DEL', key);
}

// Pobierz wszystkie klucze pasujące do wzorca
async function keys(pattern) {
    return redis('KEYS', pattern);
}

// ── Schemat kluczy ─────────────────────────────────────────
//   user:{nick_lowercase}   → { nick, passwordHash, points }
//   token:{token}           → { key (nick_lower), expires }

function userKey(nick)  { return 'user:'  + nick.toLowerCase(); }
function tokenKey(tok)  { return 'token:' + tok; }

// ── Crypto ─────────────────────────────────────────────────
function hash(password) {
    return crypto.createHash('sha256')
        .update('quizski2024' + password)
        .digest('hex');
}

function generateToken() {
    return crypto.randomBytes(24).toString('hex');
}

// ── Handler ────────────────────────────────────────────────
exports.handler = async (event) => {
    const cors = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

    const action = event.queryStringParameters?.action;

    try {

        // ── GET scoreboard ────────────────────────────────
        if (event.httpMethod === 'GET' && action === 'scoreboard') {
            const allKeys = await keys('user:*');

            if (!allKeys || allKeys.length === 0) {
                return { statusCode: 200, headers: cors, body: JSON.stringify([]) };
            }

            const users = await Promise.all(
                allKeys.map(k => getJSON(k))
            );

            const list = users
                .filter(Boolean)
                .map(u => ({ nick: u.nick, points: u.points }))
                .sort((a, b) => b.points - a.points)
                .slice(0, 50);

            return { statusCode: 200, headers: cors, body: JSON.stringify(list) };
        }

        let body = {};
        try { body = JSON.parse(event.body || '{}'); } catch {}

        // ── REGISTER ──────────────────────────────────────
        if (action === 'register') {
            const { nick, password } = body;
            if (!nick || !password)
                return err(cors, 400, 'Brak nicku lub hasła.');
            if (nick.length < 2 || nick.length > 20)
                return err(cors, 400, 'Nick: 2–20 znaków.');
            if (password.length < 4)
                return err(cors, 400, 'Hasło: min. 4 znaki.');
            // Nick może zawierać tylko litery, cyfry, _, -
            if (!/^[\p{L}\d_\-]+$/u.test(nick))
                return err(cors, 400, 'Nick: tylko litery, cyfry, _ i -');

            const existing = await getJSON(userKey(nick));
            if (existing) return err(cors, 409, 'Nick zajęty.');

            const token = generateToken();
            const TOKEN_TTL = 30 * 24 * 3600; // 30 dni w sekundach

            await setJSON(userKey(nick), {
                nick,
                passwordHash: hash(password),
                points: 0,
            });

            await setJSON(tokenKey(token), {
                key: nick.toLowerCase(),
                expires: Date.now() + TOKEN_TTL * 1000,
            }, TOKEN_TTL);

            return ok(cors, { token, nick, points: 0 });
        }

        // ── LOGIN ──────────────────────────────────────────
        if (action === 'login') {
            const { nick, password } = body;
            if (!nick || !password) return err(cors, 400, 'Brak nicku lub hasła.');

            const user = await getJSON(userKey(nick));
            if (!user || user.passwordHash !== hash(password))
                return err(cors, 401, 'Nieprawidłowy nick lub hasło.');

            const token = generateToken();
            const TOKEN_TTL = 30 * 24 * 3600;

            await setJSON(tokenKey(token), {
                key: nick.toLowerCase(),
                expires: Date.now() + TOKEN_TTL * 1000,
            }, TOKEN_TTL);
            // Redis sam usunie token po TTL – nie trzeba ręcznie sprzątać

            return ok(cors, { token, nick: user.nick, points: user.points });
        }

        // ── ADD SCORE ──────────────────────────────────────
        if (action === 'addScore') {
            const { token, round } = body;
            if (!token) return err(cors, 401, 'Brak tokenu.');

            const session = await getJSON(tokenKey(token));
            if (!session)
                return err(cors, 401, 'Sesja wygasła, zaloguj się ponownie.');

            const pts = POINTS_PER_ROUND[round] ?? 0;
            const user = await getJSON(userKey(session.key));
            if (!user) return err(cors, 404, 'Użytkownik nie istnieje.');

            user.points += pts;
            await setJSON(userKey(session.key), user);

            return ok(cors, { points: user.points, added: pts });
        }

        // ── LOG VISIT ──────────────────────────────────────
        if (action === 'logVisit') {
            const ip = event.headers['x-forwarded-for']?.split(',')[0].trim()
                    || event.headers['client-ip']
                    || 'unknown';

            const visitKey = 'visit:' + ip;

            // NX = zapisz TYLKO jeśli klucz nie istnieje – ochrona przed duplikatami
            const result = await redis('SET', visitKey, JSON.stringify({
                ip,
                date: new Date().toISOString(),
            }), 'NX');

            // result === 'OK' jeśli zapisano po raz pierwszy, null jeśli IP już było
            return ok(cors, { logged: result === 'OK', duplicate: result !== 'OK' });
        }

        // ── GET VISITS (admin) ─────────────────────────────
        if (event.httpMethod === 'GET' && action === 'visits') {
            const allKeys = await keys('visit:*');

            if (!allKeys || allKeys.length === 0) {
                return { statusCode: 200, headers: cors, body: JSON.stringify({ count: 0, visits: [] }) };
            }

            const visits = (await Promise.all(allKeys.map(k => getJSON(k)))).filter(Boolean);
            visits.sort((a, b) => new Date(b.date) - new Date(a.date));

            return { statusCode: 200, headers: cors, body: JSON.stringify({ count: visits.length, visits }) };
        }

        return err(cors, 400, 'Nieznana akcja.');

    } catch (e) {
        console.error('user-auth error:', e.message);
        return err(cors, 500, 'Błąd serwera: ' + e.message);
    }
};

function ok(headers, data)       { return { statusCode: 200, headers, body: JSON.stringify({ ok: true,  ...data }) }; }
function err(headers, code, msg) { return { statusCode: code, headers, body: JSON.stringify({ ok: false, error: msg }) }; }