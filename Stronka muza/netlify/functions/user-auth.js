// netlify/functions/user-auth.js
// Zero npm dependencies – używa tylko wbudowanego crypto + fetch
// Baza danych: JSONBin.io (darmowe konto, jeden bin = cała baza)
//
// Wymagane zmienne środowiskowe w Netlify Dashboard:
//   JSONBIN_API_KEY  – Master Key z jsonbin.io (zaczyna się od $2b$...)
//   JSONBIN_BIN_ID   – ID bina (stwórz jeden bin ręcznie, wklej tu jego ID)

const crypto = require('crypto');

const BIN_URL = `https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}`;
const HEADERS = {
    'Content-Type':   'application/json',
    'X-Master-Key':   process.env.JSONBIN_API_KEY,
    'X-Bin-Versioning': 'false',   // nadpisuj zamiast tworzyć wersje
};

const POINTS_PER_ROUND = [10, 8, 5, 3, 1];

function hash(password) {
    return crypto.createHash('sha256')
        .update('quizski2024' + password)
        .digest('hex');
}

// ── Odczytaj całą bazę ────────────────────────────────────
async function readDB() {
    const res = await fetch(BIN_URL + '/latest', { headers: HEADERS });
    if (!res.ok) throw new Error('DB read failed: ' + res.status);
    const json = await res.json();
    return json.record || { users: {}, tokens: {} };
}

// ── Zapisz całą bazę ──────────────────────────────────────
async function writeDB(db) {
    const res = await fetch(BIN_URL, {
        method: 'PUT',
        headers: HEADERS,
        body: JSON.stringify(db),
    });
    if (!res.ok) throw new Error('DB write failed: ' + res.status);
}

// ── Handler ───────────────────────────────────────────────
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
            const db = await readDB();
            const list = Object.values(db.users || {})
                .map(u => ({ nick: u.nick, points: u.points }))
                .sort((a, b) => b.points - a.points)
                .slice(0, 50);
            return { statusCode: 200, headers: cors, body: JSON.stringify(list) };
        }

        let body = {};
        try { body = JSON.parse(event.body || '{}'); } catch {}

        const db = await readDB();

        // ── REGISTER ──────────────────────────────────────
        if (action === 'register') {
            const { nick, password } = body;
            if (!nick || !password)       return err(cors, 400, 'Brak nicku lub hasła.');
            if (nick.length < 2 || nick.length > 20) return err(cors, 400, 'Nick: 2–20 znaków.');
            if (password.length < 4)      return err(cors, 400, 'Hasło: min. 4 znaki.');

            const key = nick.toLowerCase();
            if (db.users[key])            return err(cors, 409, 'Nick zajęty.');

            const token = crypto.randomBytes(24).toString('hex');
            db.users[key] = { nick, passwordHash: hash(password), points: 0 };
            db.tokens[token] = { key, expires: Date.now() + 30 * 86400 * 1000 };

            await writeDB(db);
            return ok(cors, { token, nick, points: 0 });
        }

        // ── LOGIN ─────────────────────────────────────────
        if (action === 'login') {
            const { nick, password } = body;
            if (!nick || !password) return err(cors, 400, 'Brak nicku lub hasła.');

            const key = nick.toLowerCase();
            const user = db.users[key];
            if (!user || user.passwordHash !== hash(password))
                return err(cors, 401, 'Nieprawidłowy nick lub hasło.');

            const now = Date.now();
            for (const t in db.tokens) {
                if (db.tokens[t].expires < now || db.tokens[t].key === key) delete db.tokens[t];
            }

            const token = crypto.randomBytes(24).toString('hex');
            db.tokens[token] = { key, expires: Date.now() + 30 * 86400 * 1000 };

            await writeDB(db);
            return ok(cors, { token, nick: user.nick, points: user.points });
        }

        // ── ADD SCORE ─────────────────────────────────────
        if (action === 'addScore') {
            const { token, round } = body;
            if (!token) return err(cors, 401, 'Brak tokenu.');

            const session = db.tokens[token];
            if (!session || Date.now() > session.expires)
                return err(cors, 401, 'Sesja wygasła, zaloguj się ponownie.');

            const pts = POINTS_PER_ROUND[round] ?? 0;
            const user = db.users[session.key];
            if (!user) return err(cors, 404, 'Użytkownik nie istnieje.');

            user.points += pts;
            await writeDB(db);
            return ok(cors, { points: user.points, added: pts });
        }

        return err(cors, 400, 'Nieznana akcja.');

    } catch (e) {
        console.error('user-auth error:', e.message);
        return err(cors, 500, 'Błąd serwera: ' + e.message);
    }
};

function ok(headers, data)       { return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ...data }) }; }
function err(headers, code, msg) { return { statusCode: code, headers, body: JSON.stringify({ ok: false, error: msg }) }; }