// Sealing: what only one page may read (11-10). Pubsub hands every message to everyone on the topic,
// so a secret can't be kept by not sending it; it is sent sealed. Each tab makes an ECDH key pair
// (P-256) when it loads and puts its public half in every presence message. Two tabs derive the same
// AES-GCM key from their pairs; a sealed box carries what it is and who it's from and to as
// additional data, so it can't be passed off as something else.
//
// Whose key is whose rests on presence: a player's name is what they say it is (as everywhere in
// this mockup), and the GM's key is taken only from messages its daemon signed.

const b64 = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const enc = new TextEncoder(), dec = new TextDecoder();
export const KEY = /^[\w-]{80,100}$/;

let pair = null, pubText = null;
export const ready = crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey'])
  .then(async k => { pair = k; pubText = b64(new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey))); });
export const pub = () => pubText;

const shared = new Map();                               // their public key -> Promise<AES key>
function keyWith(theirs) {
  if (!KEY.test(theirs || '')) return Promise.reject(new Error('no key'));
  let k = shared.get(theirs);
  if (!k) {
    k = ready.then(async () => {
      const p = await crypto.subtle.importKey('raw', unb64(theirs), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
      return crypto.subtle.deriveKey({ name: 'ECDH', public: p }, pair.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
    k.catch(() => shared.delete(theirs));
    if (shared.size > 200) shared.clear();
    shared.set(theirs, k);
  }
  return k;
}
export async function seal(theirs, ad, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(ad) }, await keyWith(theirs), enc.encode(JSON.stringify(obj)));
  return { iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}
export async function open(theirs, ad, box) {
  if (!box || typeof box.iv !== 'string' || typeof box.ct !== 'string' || box.iv.length > 24 || box.ct.length > 2e6) throw new Error('bad box');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv), additionalData: enc.encode(ad) }, await keyWith(theirs), unb64(box.ct));
  return JSON.parse(dec.decode(pt));
}
