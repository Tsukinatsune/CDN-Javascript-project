const Z = {
        exp: 65537n, 
        mod: 192837004201283148238666363n
    };

    function modPow(base, exp, mod) {
        let result = 1n;
        base = base % mod;
        while (exp > 0n) {
            if (exp % 2n === 1n) result = (result * base) % mod;
            exp = exp / 2n;
            base = (base * base) % mod;
        }
        return result;
    }

    function textToBigInt(text) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);
        let hex = "0x";
        for (let b of bytes) hex += b.toString(16).padStart(2, '0');
        return BigInt(hex);
    }

    function bigIntToBytes(bn, length) {
        let hex = bn.toString(16);
        if (hex.length % 2) hex = '0' + hex;
        const bytes = [];
        for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
        while (bytes.length < length) bytes.unshift(0);
        return bytes;
    }

    function toBase64Url(bytes) {
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    function L(videoId) {
        const m = textToBigInt(videoId);
        const c = modPow(m, Z.exp, Z.mod);
        const bytes = bigIntToBytes(c, 11);
        return toBase64Url(bytes);
    }
