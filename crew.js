/* Mars Navigator: crew chat and field camera (shared by every page).
   DEMO MODE: there is no real satellite link on a public website. Messages, photos and videos are kept
   in this browser (IndexedDB / localStorage) and shared live between open tabs of the site.
   A real mission would send them through the Mars orbiter relay network.
   Code drafted with help from an SI assistant (Claude) and reviewed by the team. */
(function () {
  'use strict';
  const CFG = Object.assign({ fab: 'right:14px;bottom:44px', panel: 'right:14px;bottom:110px', row: true }, window.CREW_CFG || {});
  const loc = () => (CFG.loc ? CFG.loc() : { lat: -4.58947, lon: 137.44163, label: 'Bradbury Landing (base)' });
  const fmtLL = (a, b) => Math.abs(a).toFixed(3) + '°' + (a >= 0 ? 'N' : 'S') + ' ' + Math.abs(b).toFixed(3) + '°' + (b >= 0 ? 'E' : 'W');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hm = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  /* Earth to Mars radio delay today (JPL approximate planet positions, valid 1800 to 2050) */
  function earthDelayMin(date) {
    const EL = { e: [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0, 0],
      m: [1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343] };
    const T = (date.getTime() / 86400000 + 2440587.5 - 2451545) / 36525, r = Math.PI / 180;
    const P = q => { const a = q[0] + q[1] * T, e = q[2] + q[3] * T, I = (q[4] + q[5] * T) * r, L = q[6] + q[7] * T, w = q[8] + q[9] * T, O = q[10] + q[11] * T;
      let M = ((((L - w) % 360) + 540) % 360 - 180) * r; const om = (w - O) * r, Om = O * r; let E = M + e * Math.sin(M); for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      const x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E), co = Math.cos(om), so = Math.sin(om), cO = Math.cos(Om), sO = Math.sin(Om), cI = Math.cos(I);
      return [(co * cO - so * sO * cI) * x + (-so * cO - co * sO * cI) * y, (co * sO + so * cO * cI) * x + (-so * sO + co * cO * cI) * y, so * Math.sin(I) * x + co * Math.sin(I) * y]; };
    const a = P(EL.e), b = P(EL.m); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 149597870.7 / 299792.458 / 60;
  }

  /* ---------- storage ---------- */
  const LS = 'marsnav_chat_v1', ME = 'marsnav_me_v1';
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('marsnav') : null;
  let msgs = []; try { msgs = JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) { msgs = []; }
  let me = { name: 'Explorer', team: 'Team Gale' }; try { Object.assign(me, JSON.parse(localStorage.getItem(ME) || '{}')); } catch (e) {}
  const saveMsgs = () => { try { localStorage.setItem(LS, JSON.stringify(msgs.slice(-300))); } catch (e) {} };
  if (!msgs.length) {
    const t0 = Date.now() - 40 * 60000;
    msgs = [
      { id: 'd1', ch: 'all', team: 'Team Jezero', name: 'Jezero crew (demo)', text: 'Morning from the delta. Dust is low today, starting our walk at 10:30.', t: t0, demo: true },
      { id: 'd2', ch: 'all', team: 'Team Gale', name: 'Gale rover (demo)', text: 'Rover leaving base for the Murray Buttes shelter run. Back by 15:30.', t: t0 + 9 * 60000, demo: true },
      { id: 'd3', ch: 'earth', team: 'Mission Control', name: 'Mission Control (demo)', text: 'Solar storm watch for tomorrow. Know your nearest shelter before you leave.', t: t0 + 20 * 60000, demo: true }];
    saveMsgs();
  }
  let db = null;
  const dbReady = new Promise(res => { try { const rq = indexedDB.open('marsnav', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('media', { keyPath: 'id' }); rq.onsuccess = () => { db = rq.result; res(db); }; rq.onerror = () => res(null); } catch (e) { res(null); } });
  const putMedia = rec => dbReady.then(d => d && new Promise(r => { const tx = d.transaction('media', 'readwrite'); tx.objectStore('media').put(rec); tx.oncomplete = r; tx.onerror = r; }));
  const getMedia = id => dbReady.then(d => d ? new Promise(r => { const q = d.transaction('media').objectStore('media').get(id); q.onsuccess = () => r(q.result); q.onerror = () => r(null); }) : null);
  const allMedia = () => dbReady.then(d => d ? new Promise(r => { const q = d.transaction('media').objectStore('media').getAll(); q.onsuccess = () => r(q.result || []); q.onerror = () => r([]); }) : []);
  const delMedia = id => dbReady.then(d => d && new Promise(r => { const tx = d.transaction('media', 'readwrite'); tx.objectStore('media').delete(id); tx.oncomplete = r; }));
  const urls = {}; const urlFor = rec => urls[rec.id] || (urls[rec.id] = URL.createObjectURL(rec.blob));

  /* ---------- styles ---------- */
  const css = `
  .crew-fabs{position:fixed;z-index:1200;display:flex;gap:10px;${CFG.row ? '' : 'flex-direction:column;'}${CFG.fab}}
  .crew-fab{position:relative;width:52px;height:52px;border-radius:50%;border:2px solid #e3a857;background:#c1440e;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.5)}
  .crew-fab:hover{background:#d8582a}.crew-fab svg{width:26px;height:26px}
  .crew-fab .lbl2{position:absolute;bottom:-17px;left:50%;transform:translateX(-50%);font:600 11px "Segoe UI",Arial;color:#f2e3cc;text-shadow:0 0 3px #000;white-space:nowrap}
  .crew-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:#7fa37a;color:#1c1110;font:700 11px Arial;display:none;align-items:center;justify-content:center;padding:0 4px}
  .crew-panel{position:fixed;z-index:1250;width:min(370px,92vw);height:min(540px,78vh);${CFG.panel};background:#2b1a16;border:1px solid #6b4a3a;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.6);display:none;flex-direction:column;color:#f2e3cc;font:14px/1.4 "Segoe UI",Calibri,Arial,sans-serif;overflow:hidden}
  .crew-panel.open{display:flex}
  .crew-hd{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#1c1110;border-bottom:1px solid #4a2f26}
  .crew-hd b{font:700 16px Georgia,serif;flex:1}
  .crew-x{background:none;border:1px solid #4a2f26;color:#f2e3cc;border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:16px;line-height:1}
  .crew-note{font-size:11.5px;color:#d9c2a3;background:#3a241d;padding:6px 12px}
  .crew-tabs{display:flex;gap:4px;padding:8px 10px 0;flex-wrap:wrap}
  .crew-tabs button{background:none;border:1px solid #4a2f26;color:#d9c2a3;border-radius:999px;padding:3px 10px;font:12px inherit;cursor:pointer}
  .crew-tabs button.on{border-color:#e3a857;color:#e3a857}
  .crew-list{flex:1;overflow:auto;padding:8px 10px;display:flex;flex-direction:column;gap:8px}
  .crew-m{background:#3a241d;border-radius:10px;padding:7px 10px;max-width:88%}
  .crew-m.mine{align-self:flex-end;background:#5a2a17}
  .crew-m .who{font-size:11.5px;color:#e3a857}.crew-m .meta{font-size:11px;color:#d9c2a3;margin-top:3px}
  .crew-m img,.crew-m video{max-width:100%;border-radius:6px;margin-top:5px;display:block;cursor:pointer}
  .crew-me{display:flex;gap:6px;padding:6px 10px;border-top:1px solid #4a2f26;font-size:12px}
  .crew-me input,.crew-me select,.crew-in input,.crew-cap{background:#1f1412;color:#f2e3cc;border:1px solid #4a2f26;border-radius:6px;padding:5px 7px;font:13px inherit;min-width:0}
  .crew-panel select,.crew-panel input{width:auto}.crew-me input{flex:1 1 auto;width:auto}.crew-me select{flex:0 0 auto}
  .crew-in{display:flex;gap:6px;padding:8px 10px;border-top:1px solid #4a2f26}
  .crew-in input{flex:1}
  .crew-btn{background:#c1440e;color:#fff;border:0;border-radius:6px;padding:7px 11px;font:600 13px inherit;cursor:pointer}
  .crew-btn.g{background:transparent;border:1px solid #6b4a3a;color:#f2e3cc}
  .crew-btn:disabled{opacity:.5;cursor:default}
  .crew-body{flex:1;overflow:auto;padding:10px 12px}
  .crew-row{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
  .crew-prev{margin-top:8px;background:#1f1412;border-radius:8px;min-height:60px;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .crew-prev video,.crew-prev img{max-width:100%;max-height:220px;display:block}
  .crew-cap{width:100%;margin-top:8px}
  .crew-bar{height:6px;background:#3a241d;border-radius:4px;overflow:hidden;margin-top:8px;display:none}.crew-bar i{display:block;height:100%;width:0;background:#7fa37a;transition:width .2s}
  .crew-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
  .crew-grid div{position:relative;aspect-ratio:1;background:#1f1412;border-radius:6px;overflow:hidden;cursor:pointer}
  .crew-grid img,.crew-grid video{width:100%;height:100%;object-fit:cover}
  .crew-grid span{position:absolute;left:3px;bottom:3px;font-size:10px;background:rgba(0,0,0,.6);padding:0 4px;border-radius:3px}
  .crew-lb{position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:#f2e3cc;font:14px "Segoe UI",Arial}
  .crew-lb.open{display:flex}.crew-lb img,.crew-lb video{max-width:90vw;max-height:75vh;border-radius:8px}
  h5.crew-h{margin:12px 0 4px;font:700 14px Georgia,serif;color:#e3a857}
  @media (max-width:899px), (max-aspect-ratio:13/10){
    .crew-fabs{left:auto!important;top:auto!important;right:12px!important;bottom:26px!important;position:fixed!important}
    .crew-fab{width:48px;height:48px}
    .crew-panel{left:8px!important;right:8px!important;top:auto!important;bottom:92px!important;width:auto!important;height:min(70vh,560px)!important}
  }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>';
  const ICON_CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.6"/></svg>';

  /* ---------- buttons ---------- */
  const fabs = document.createElement('div'); fabs.className = 'crew-fabs';
  fabs.innerHTML = `<button class="crew-fab" id="crewChatBtn" title="Crew chat (all teams on the ground)" aria-label="Open crew chat">${ICON_CHAT}<span class="crew-badge" id="crewBadge"></span><span class="lbl2">Chat</span></button>
    <button class="crew-fab" id="crewCamBtn" title="Field camera: take or upload photos and videos" aria-label="Open field camera">${ICON_CAM}<span class="lbl2">Camera</span></button>`;
  document.body.appendChild(fabs);

  /* ---------- chat panel ---------- */
  const CH = [['all', 'All teams'], ['team', 'My team'], ['earth', 'Mission Control (Earth)']];
  let ch = 'all', unread = 0;
  const chat = document.createElement('div'); chat.className = 'crew-panel'; chat.setAttribute('role', 'dialog'); chat.setAttribute('aria-label', 'Crew chat');
  chat.innerHTML = `<div class="crew-hd">${ICON_CHAT.replace('<svg', '<svg width="20" height="20"')}<b>Crew chat</b><button class="crew-x" data-x title="Close">×</button></div>
    <div class="crew-note">Demo mode: no real satellite link. Messages stay in this browser and appear in its other open tabs.</div>
    <div class="crew-tabs">${CH.map(([k, n]) => `<button data-ch="${k}" class="${k === ch ? 'on' : ''}">${n}</button>`).join('')}</div>
    <div class="crew-list" id="crewList"></div>
    <div class="crew-me"><span style="align-self:center;color:#d9c2a3">You:</span><input id="crewName" maxlength="24" aria-label="Your name" style="flex:1"><select id="crewTeam" aria-label="Your team"><option>Team Gale</option><option>Team Jezero</option><option>Team Arcadia</option><option>Rover crew</option></select></div>
    <div class="crew-in"><input id="crewText" maxlength="400" placeholder="Message…" aria-label="Message"><button class="crew-btn" id="crewSend">Send</button></div>`;
  document.body.appendChild(chat);
  const $ = (id, root = document) => root.querySelector('#' + id);
  $('crewName').value = me.name; $('crewTeam').value = me.team;
  const saveMe = () => { me.name = $('crewName').value.trim() || 'Explorer'; me.team = $('crewTeam').value; try { localStorage.setItem(ME, JSON.stringify(me)); } catch (e) {} renderChat(); };
  $('crewName').onchange = saveMe; $('crewTeam').onchange = saveMe;
  chat.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { ch = b.dataset.ch; chat.querySelectorAll('[data-ch]').forEach(x => x.classList.toggle('on', x === b)); renderChat(); });

  async function renderChat() {
    const list = $('crewList'); const show = msgs.filter(m => (ch === 'team' ? m.ch === 'team' && m.team === me.team : m.ch === ch));
    const now = Date.now();
    list.innerHTML = show.length ? show.map(m => {
      const mine = !m.demo && m.name === me.name && m.team === me.team;
      let meta = hm(m.t) + (m.loc ? ' · ' + fmtLL(m.loc[0], m.loc[1]) : '');
      if (m.deliverAt) meta += m.deliverAt > now ? ` · reaches Earth at ${hm(m.deliverAt)} (radio delay)` : ' · delivered to Earth';
      return `<div class="crew-m${mine ? ' mine' : ''}"><div class="who">${esc(m.name)} · ${esc(m.team)}</div>${esc(m.text)}${m.media ? `<div data-media="${m.media}"></div>` : ''}<div class="meta">${meta}</div></div>`;
    }).join('') : '<div style="color:#d9c2a3;font-size:13px">No messages here yet.</div>';
    list.querySelectorAll('[data-media]').forEach(async el => { const rec = await getMedia(el.dataset.media); if (!rec) { el.textContent = '(file not on this device)'; return; }
      el.innerHTML = rec.type.startsWith('video') ? `<video src="${urlFor(rec)}" muted playsinline></video>` : `<img src="${urlFor(rec)}" alt="${esc(rec.caption || 'Field photo')}">`;
      el.firstChild.onclick = () => openLB(rec); });
    list.scrollTop = list.scrollHeight;
  }
  function post(m) { msgs.push(m); saveMsgs(); if (bc) bc.postMessage({ k: 'msg', m }); renderChat(); }
  function send() {
    const text = $('crewText').value.trim(); if (!text) return; saveMe();
    const L = loc(), m = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ch, team: me.team, name: me.name, text, t: Date.now(), loc: [L.lat, L.lon] };
    if (ch === 'earth') m.deliverAt = Date.now() + earthDelayMin(new Date()) * 60000;
    post(m); $('crewText').value = '';
  }
  $('crewSend').onclick = send; $('crewText').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
  if (bc) bc.onmessage = e => { if (e.data.k === 'msg' && !msgs.find(x => x.id === e.data.m.id)) { msgs.push(e.data.m); if (!chat.classList.contains('open')) { unread++; badge(); } renderChat(); } if (e.data.k === 'media' && CFG.onMedia) getMedia(e.data.id).then(r => r && CFG.onMedia(r)); };
  function badge() { const b = $('crewBadge'); b.textContent = unread; b.style.display = unread ? 'flex' : 'none'; }
  const earthNote = () => { const tab = chat.querySelector('[data-ch="earth"]'); tab.title = `One-way radio delay today: about ${earthDelayMin(new Date()).toFixed(1)} min`; };
  earthNote(); setInterval(() => { if (chat.classList.contains('open')) renderChat(); }, 30000);

  /* ---------- camera panel ---------- */
  const cam = document.createElement('div'); cam.className = 'crew-panel'; cam.setAttribute('role', 'dialog'); cam.setAttribute('aria-label', 'Field camera');
  cam.innerHTML = `<div class="crew-hd">${ICON_CAM.replace('<svg', '<svg width="20" height="20"')}<b>Field camera</b><button class="crew-x" data-x title="Close">×</button></div>
    <div class="crew-note">Demo mode: files are saved in this browser and tagged with your map position. A real mission would send them up through an orbiter relay.</div>
    <div class="crew-body">
      <div class="crew-row"><button class="crew-btn" id="camLive">Use camera</button><button class="crew-btn g" id="camPhoto">Photo from device</button><button class="crew-btn g" id="camVideo">Video from device</button></div>
      <input type="file" id="camFileP" accept="image/*" capture="environment" hidden><input type="file" id="camFileV" accept="video/*" capture="environment" hidden>
      <div class="crew-prev" id="camPrev"><span style="color:#d9c2a3;font-size:13px;padding:14px;text-align:center">Take a photo or video, or pick one from the device.</span></div>
      <div class="crew-row" id="camLiveCtl" style="display:none"><button class="crew-btn" id="camSnap">Snap photo</button><button class="crew-btn g" id="camRec">Record video</button><button class="crew-btn g" id="camStop">Stop camera</button></div>
      <input class="crew-cap" id="camCap" maxlength="140" placeholder="Caption, e.g. layered rock near the dunes">
      <div style="font-size:12px;color:#d9c2a3;margin-top:6px" id="camLoc"></div>
      <div class="crew-row"><button class="crew-btn" id="camUp" disabled>Upload and share with all teams</button></div>
      <div class="crew-bar" id="camBar"><i></i></div><div id="camMsg" style="font-size:12.5px;margin-top:4px"></div>
      <h5 class="crew-h">Field photos and videos <span id="camCount"></span></h5><div class="crew-grid" id="camGrid"></div>
    </div>`;
  document.body.appendChild(cam);
  const lb = document.createElement('div'); lb.className = 'crew-lb'; lb.innerHTML = '<div id="lbMedia"></div><div id="lbTxt" style="max-width:80vw;text-align:center"></div><div class="crew-row"><button class="crew-btn g" id="lbMap">Show on map</button><button class="crew-btn g" id="lbDel">Delete</button><button class="crew-btn" id="lbClose">Close</button></div>';
  document.body.appendChild(lb);

  let pending = null, stream = null, recorder = null, chunks = [];
  function setPending(blob, kind) {
    pending = { blob, type: blob.type || (kind === 'video' ? 'video/webm' : 'image/jpeg') };
    const u = URL.createObjectURL(blob);
    $('camPrev').innerHTML = pending.type.startsWith('video') ? `<video src="${u}" controls playsinline></video>` : `<img src="${u}" alt="Preview">`;
    $('camUp').disabled = false; $('camMsg').textContent = '';
  }
  const showLoc = () => { const L = loc(); $('camLoc').textContent = 'Location tag: ' + fmtLL(L.lat, L.lon) + (L.label ? ' · ' + L.label : ''); };
  $('camPhoto').onclick = () => $('camFileP').click(); $('camVideo').onclick = () => $('camFileV').click();
  $('camFileP').onchange = e => { const f = e.target.files[0]; if (f) setPending(f, 'photo'); e.target.value = ''; };
  $('camFileV').onchange = e => { const f = e.target.files[0]; if (f) setPending(f, 'video'); e.target.value = ''; };
  function stopCam() { if (recorder && recorder.state === 'recording') recorder.stop(); if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; $('camLiveCtl').style.display = 'none'; }
  $('camLive').onclick = async () => {
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true }); }
    catch (e) { try { stream = await navigator.mediaDevices.getUserMedia({ video: true }); } catch (e2) { $('camMsg').textContent = 'No camera available or permission refused. Use "Photo from device" instead.'; return; } }
    $('camPrev').innerHTML = '<video id="camVid" autoplay muted playsinline></video>'; $('camVid').srcObject = stream; $('camLiveCtl').style.display = 'flex'; $('camRec').textContent = 'Record video';
  };
  $('camSnap').onclick = () => { const v = $('camVid'); if (!v) return; const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); c.toBlob(b => { stopCam(); setPending(b, 'photo'); }, 'image/jpeg', 0.9); };
  $('camRec').onclick = () => {
    if (!stream) return;
    if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
    if (!('MediaRecorder' in window)) { $('camMsg').textContent = 'Video recording is not supported in this browser.'; return; }
    chunks = []; recorder = new MediaRecorder(stream); recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    recorder.onstop = () => { const b = new Blob(chunks, { type: recorder.mimeType || 'video/webm' }); stopCam(); setPending(b, 'video'); };
    recorder.start(); $('camRec').textContent = 'Stop recording';
  };
  $('camStop').onclick = stopCam;
  $('camUp').onclick = async () => {
    if (!pending) return; saveMe();
    const L = loc(), rec = { id: 'm' + Date.now().toString(36), blob: pending.blob, type: pending.type, caption: $('camCap').value.trim(), lat: L.lat, lon: L.lon, place: L.label || '', t: Date.now(), name: me.name, team: me.team };
    $('camUp').disabled = true; const bar = $('camBar'); bar.style.display = 'block'; $('camMsg').textContent = 'Sending to orbiter relay (demo)…';
    let p = 0; await new Promise(res => { const iv = setInterval(() => { p += 12; bar.firstChild.style.width = Math.min(100, p) + '%'; if (p >= 100) { clearInterval(iv); res(); } }, 120); });
    await putMedia(rec);
    post({ id: rec.id + 'c', ch: 'all', team: me.team, name: me.name, text: (rec.type.startsWith('video') ? 'Shared a video' : 'Shared a photo') + (rec.caption ? ': ' + rec.caption : ''), t: rec.t, loc: [rec.lat, rec.lon], media: rec.id });
    if (bc) bc.postMessage({ k: 'media', id: rec.id });
    if (CFG.onMedia) CFG.onMedia(rec);
    $('camMsg').textContent = 'Saved, tagged at ' + fmtLL(rec.lat, rec.lon) + ' and shared in crew chat.';
    setTimeout(() => { bar.style.display = 'none'; bar.firstChild.style.width = '0'; }, 800);
    pending = null; $('camCap').value = ''; $('camPrev').innerHTML = '<span style="color:#d9c2a3;font-size:13px;padding:14px">Uploaded. Take another?</span>'; renderGrid();
  };
  async function renderGrid() {
    const all = (await allMedia()).sort((a, b) => b.t - a.t); $('camCount').textContent = `(${all.length})`;
    $('camGrid').innerHTML = all.map(r => `<div data-id="${r.id}" title="${esc(r.caption || '')}">${r.type.startsWith('video') ? `<video src="${urlFor(r)}" muted></video><span>video</span>` : `<img src="${urlFor(r)}" alt="${esc(r.caption || 'Field photo')}">`}</div>`).join('') || '<span style="font-size:12.5px;color:#d9c2a3;grid-column:1/-1">Nothing uploaded yet.</span>';
    $('camGrid').querySelectorAll('[data-id]').forEach(el => el.onclick = async () => openLB(await getMedia(el.dataset.id)));
  }
  let lbRec = null;
  function openLB(rec) {
    if (!rec) return; lbRec = rec;
    $('lbMedia').innerHTML = rec.type.startsWith('video') ? `<video src="${urlFor(rec)}" controls autoplay playsinline></video>` : `<img src="${urlFor(rec)}" alt="${esc(rec.caption || 'Field photo')}">`;
    $('lbTxt').innerHTML = `<b>${esc(rec.caption || 'Field ' + (rec.type.startsWith('video') ? 'video' : 'photo'))}</b><br>${esc(rec.name)} · ${esc(rec.team)} · ${new Date(rec.t).toLocaleString()}<br>${fmtLL(rec.lat, rec.lon)}${rec.place ? ' · ' + esc(rec.place) : ''}`;
    $('lbMap').style.display = CFG.showOnMap ? '' : 'none'; lb.classList.add('open');
  }
  $('lbClose').onclick = () => { lb.classList.remove('open'); $('lbMedia').innerHTML = ''; };
  $('lbMap').onclick = () => { if (CFG.showOnMap && lbRec) CFG.showOnMap(lbRec); $('lbClose').onclick(); };
  $('lbDel').onclick = async () => { if (!lbRec) return; await delMedia(lbRec.id); if (CFG.onDelete) CFG.onDelete(lbRec.id); $('lbClose').onclick(); renderGrid(); renderChat(); };

  /* ---------- open / close ---------- */
  function toggle(p, other) { const open = !p.classList.contains('open'); other.classList.remove('open'); p.classList.toggle('open', open); if (!open) stopCam(); return open; }
  $('crewChatBtn').onclick = () => { if (toggle(chat, cam)) { unread = 0; badge(); earthNote(); renderChat(); setTimeout(() => $('crewText').focus(), 50); } };
  $('crewCamBtn').onclick = () => { if (toggle(cam, chat)) { showLoc(); renderGrid(); } else stopCam(); };
  chat.querySelector('[data-x]').onclick = () => chat.classList.remove('open');
  cam.querySelector('[data-x]').onclick = () => { cam.classList.remove('open'); stopCam(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { chat.classList.remove('open'); cam.classList.remove('open'); lb.classList.remove('open'); stopCam(); } });

  window.CREW = { allMedia, urlFor };
  /* offline helper: keeps the site and viewed map tiles for use without internet */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (CFG.onMedia) allMedia().then(list => list.forEach(r => CFG.onMedia(r)));
})();
