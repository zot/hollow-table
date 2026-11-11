// This browser's identity (Bill, 11-11: "use the built-in crypto and store a private key in the
// browser DB"). Without a daemon there is no peer id that lasts: Trystero's changes with every page
// load. So each browser makes an ECDSA P-256 key pair once and keeps it in IndexedDB. The private
// half is non-extractable: the page can sign with it but nothing can read it out. Its id is the
// first 20 characters of the SHA-256 of the public key (base64url), the same shape as a Trystero
// peer id. It's what a name is claimed by (book.claims) and what an invite names the GM by (gm=).
//
// "A computer" is now a browser profile on an origin: another profile, or an incognito window, is
// someone else.

const b64 = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const enc = new TextEncoder();
const ALG = { name: 'ECDSA', namedCurve: 'P-256' }, SIG = { name: 'ECDSA', hash: 'SHA-256' };
export const ID = /^[\w-]{20}$/, PUB = /^[\w-]{80,100}$/;

async function idOf(raw) { return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', raw))).slice(0, 20); }

function stored() {                                     // the key pair, from IndexedDB, made the first time
  return new Promise((ok, no) => {
    const r = indexedDB.open('glimmer-id', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('keys');
    r.onerror = () => no(r.error);
    r.onsuccess = () => {
      const db = r.result, get = db.transaction('keys').objectStore('keys').get('me');
      get.onerror = () => no(get.error);
      get.onsuccess = async () => {
        if (get.result) return ok(get.result);
        try {
          const k = await crypto.subtle.generateKey(ALG, false, ['sign', 'verify']);   // the public half stays readable
          const t = db.transaction('keys', 'readwrite');
          t.objectStore('keys').put(k, 'me');
          t.oncomplete = () => ok(k); t.onerror = () => no(t.error);
        } catch (e) { no(e); }
      };
    };
  });
}

export const identity = (async () => {
  let k;
  try { k = await stored(); }
  catch { k = await crypto.subtle.generateKey(ALG, false, ['sign', 'verify']); }   // no IndexedDB: this page load only
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey));
  return {
    id: await idOf(raw), pub: b64(raw),
    sign: async text => b64(new Uint8Array(await crypto.subtle.sign(SIG, k.privateKey, enc.encode(text)))),
  };
})();

// The id behind a signature, or null if it doesn't check out.
export async function verify(pub, sig, text) {
  if (!PUB.test(pub || '') || typeof sig !== 'string' || sig.length > 200) return null;
  try {
    const raw = unb64(pub), key = await crypto.subtle.importKey('raw', raw, ALG, false, ['verify']);
    return await crypto.subtle.verify(SIG, key, unb64(sig), enc.encode(text)) ? await idOf(raw) : null;
  } catch { return null; }
}
