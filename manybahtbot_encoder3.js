const L = {
    MOD: 0n,
    EXP: BigInt(65537),
    BLOCK_SIZE: 11,

    SPOTIFY_DOMAINS: {
        track:    "https://sp.laibaht.ovh/track/",
        album:    "https://sp.laibaht.ovh/album/",
        artist:   "https://sp.laibaht.ovh/artist/",
        playlist: "https://sp.laibaht.ovh/playlist/",
        wrapped:  "https://sp.laibaht.ovh/wrapped/"
    },
    async init() {
        const response = await fetch('https://play.manybahtpage.com/_next/static/chunks/app/page-4919077fd9cf1cff.js');
        const text = await response.text();
        
        const foundMod = (text.match(/\d{10,}/g) || []).reduce((a, b) => 
            a.length > b.length ? a : b, ""
        );
        if (foundMod) {
            L.MOD = BigInt(foundMod);
        }
    },

    modPow(base, exp, mod) {
        if (mod === 0n) throw new Error("MOD is 0. Did you forget to await L.init()?");
        let result = 1n;
        base = base % mod;
        while (exp > 0n) {
            if (exp % 2n === 1n) result = (result * base) % mod;
            exp = exp / 2n;
            base = (base * base) % mod;
        }
        return result;
    },

    encryptId(idString) {
        const bytes = new TextEncoder().encode(idString);
        const blockSize = L.BLOCK_SIZE;
        let resultBytes = [];

        for (let i = 0; i < bytes.length; i += blockSize) {
            const chunk = bytes.slice(i, i + blockSize);
            let hex = Array.from(chunk)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            const num = BigInt('0x' + (hex || '0'));
            const encrypted = L.modPow(num, L.EXP, L.MOD);

            let encHex = encrypted.toString(16).padStart(blockSize * 2, '0');
            for (let j = 0; j < encHex.length; j += 2) {
                resultBytes.push(parseInt(encHex.substr(j, 2), 16));
            }
        }

        const binary = String.fromCharCode(...resultBytes);
        return btoa(binary)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    },

    parseYouTube(url) {
        try {
            const u = new URL(
                url.includes('youtu.be')
                    ? url.replace('youtu.be/', 'youtube.com/watch?v=')
                    : url
            );
            const v = u.searchParams.get('v');
            const list = u.searchParams.get('list');

            if (!v) return null;

            const clean = new URL("https://play.laibaht.ovh/watch");
            clean.searchParams.set("v", L.encryptId(v));
            if (list) clean.searchParams.set("list", L.encryptId(list));

            return clean.toString();
        } catch {
            return null;
        }
    },

    parseSpotify(url) {
        try {
            const regex = /https:\/\/open\.spotify\.com\/(track|album|artist|playlist|wrapped)(?:\/([a-zA-Z0-9-]+))?(?:\/([a-zA-Z0-9-]+))?/;
            const m = url.match(regex);
            if (!m) return null;

            const type = m[1];
            const id = m[3] ? m[3].replace('share-', '') : m[2];

            if (!id || !L.SPOTIFY_DOMAINS[type]) return null;

            return L.SPOTIFY_DOMAINS[type] + L.encryptId(id);
        } catch {
            return null;
        }
    },

    parseAppleMusic(url) {
        try {
            let clean = url;
            if (clean.includes("?i=")) {
                const iMatch = clean.match(/\?i=(\d+)/);
                if (iMatch) {
                    clean = clean
                        .replace(/\/album\//, '/song/')
                        .replace(/\/\d+/, `/${iMatch[1]}`);
                }
            }

            const regex = /https:\/\/music\.apple\.com\/([a-z]{2})\/(song|album|playlist|artist)\/[^/]+\/([a-zA-Z0-9.]+)/;
            const m = clean.match(regex);
            if (!m) return null;

            const [, region, type, id] = m;
            return `https://ap.laibaht.ovh/${region}/${type}/${L.encryptId(id)}`;
        } catch {
            return null;
        }
    },

    L(inputUrl) {
        if (!inputUrl || typeof inputUrl !== 'string') return null;
        inputUrl = inputUrl.trim();

        return (
            L.parseYouTube(inputUrl) ||
            L.parseSpotify(inputUrl) ||
            L.parseAppleMusic(inputUrl)
        );
    }
};

L.init()
