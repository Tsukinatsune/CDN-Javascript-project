const t1000qrd10201th = (() => {

  const NAME      = 't1000qrd10201th';
  const SIGNATURE = 't1000qrd10201th::';
  const SIG_LEN   = SIGNATURE.length;

  async function sha1(str) {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
    return new Uint8Array(buf);
  }

  async function sha1Xor(bytes, passphrase) {
    const key = await sha1(passphrase);
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ key[i % key.length];
    return out;
  }

  async function deriveAesKey(passphrase, usage) {
    const digest = await sha1(passphrase + NAME + 'AES');
    return crypto.subtle.importKey(
      'raw', digest.slice(0, 16), { name: 'AES-CTR' }, false, [usage]
    );
  }

  async function deriveCounter(passphrase) {
    return (await sha1(passphrase + NAME + 'CTR')).slice(0, 16);
  }

  async function aesCtr(bytes, passphrase, usage) {
    const key     = await deriveAesKey(passphrase, usage);
    const counter = await deriveCounter(passphrase);
    const buf = await crypto.subtle[usage](
      { name: 'AES-CTR', counter, length: 64 }, key, bytes
    );
    return new Uint8Array(buf);
  }

  function toBase64(bytes) {
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  }

  function fromBase64(str) {
    const bin = atob(str.replace(/\s/g, ''));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function encrypt(plaintext, passphrase) {
    let data = new TextEncoder().encode(plaintext);
    data = await sha1Xor(data, passphrase);
    data = await aesCtr(data, passphrase, 'encrypt');
    return SIGNATURE + toBase64(data);
  }

  async function decrypt(token, passphrase) {
    token = token.trim();
    if (!token.startsWith(SIGNATURE))
      throw new Error('Invalid token — missing t1000qrd10201th signature.');
    let data = fromBase64(token.slice(SIG_LEN));
    data = await aesCtr(data, passphrase, 'decrypt');
    data = await sha1Xor(data, passphrase);
    return new TextDecoder().decode(data);
  }

  return { encrypt, decrypt, NAME, SIGNATURE };

})();

if (typeof module !== 'undefined') module.exports = t1000qrd10201th;
