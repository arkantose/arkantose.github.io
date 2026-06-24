// Fetch renderer logic.
// Talks to window.fetchAPI when running inside Electron (real backend),
// otherwise falls back to MockAPI so the whole flow is clickable in a browser.

// ---------- Mock backend (browser / preview mode) ----------
const MockAPI = (() => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  let headset = [
    { name: 'Module C Review-2026-06-20.mp4', sizeBytes: 412_000_000, modifiedAt: '2026-06-20 14:02', pulled: false },
    { name: 'Module B Review-2026-06-21.mp4', sizeBytes: 305_000_000, modifiedAt: '2026-06-21 09:41', pulled: false },
    { name: 'Module A Review-2026-06-22.mp4', sizeBytes: 528_000_000, modifiedAt: '2026-06-22 16:18', pulled: false },
  ];
  let library = [];
  let published = [];
  let vimeoFolders = [
    { uri: '/folders/1', name: 'Fixes' },
    { uri: '/folders/2', name: 'Module Walkthroughs' },
    { uri: '/folders/3', name: 'ModuleC videos' },
    { uri: '/folders/4', name: 'Nvrt SDK Walkthroughs' },
  ];
  let deviceList = ['Alaris Pump', 'Patient Monitor', 'ModuleC'];
  let procedureList = ['Annual PM', 'Quarterly PM', 'Repair QA'];

  const sampleChecklist = () => ({
    changes: [
      { id: cryptoId(), ts: '01:12', text: 'Front intake panel is using a plastic shader, it should be brushed metal to match the real device.', quote: 'change the front intake panel, plastic, should be metal', confidence: 'high' },
      { id: cryptoId(), ts: '03:47', text: 'Battery cover has four screws but the storyboard only calls for three, remove the bottom one.', quote: 'four screws but should be three, remove the bottom', confidence: 'high' },
      { id: cryptoId(), ts: '06:05', text: 'Power cable grab outline is red, it should be the standard cyan highlight color.', quote: 'outline is red, should be cyan', confidence: 'medium' },
    ],
    other: [
      { id: cryptoId(), text: 'Overall lighting feels darker than the other modules, worth a pass across all of them.' },
      { id: cryptoId(), text: 'Question: is the cart supposed to be locked in place during step 4?' },
    ],
  });

  return {
    async getDeviceStatus() { await wait(500); return { connected: true, authorized: true, deviceName: 'Quest 3 (Riley)' }; },
    async listHeadsetVideos() { await wait(300); return headset.map(v => ({ ...v })); },
    async deleteHeadsetVideo(name) { await wait(250); headset = headset.filter(v => v.name !== name); library = library.filter(v => v.name !== name); return { headsetDeleted: true, removedFromLibrary: true }; },
    async pull(mode, names, onProgress) {
      let toPull = headset.filter(v => !v.pulled);
      if (mode === 'newest') toPull = toPull.slice(-1);
      if (mode === 'selected') toPull = headset.filter(v => names.includes(v.name) && !v.pulled);
      for (let i = 0; i < toPull.length; i++) {
        await wait(700);
        onProgress && onProgress({ label: `Pulling ${toPull[i].name}`, pct: ((i + 1) / toPull.length) * 100 });
        toPull[i].pulled = true;
        library.push({ name: toPull[i].name, path: 'C:/.../inbox/' + toPull[i].name, durationSec: 480 + i * 60, pulledAt: 'just now', transcribed: false, published: false });
      }
      return { pulled: toPull.length };
    },
    async listLibrary() { await wait(200); return library.map(v => ({ ...v })); },
    async transcribe(name, onProgress) {
      const steps = ['Extracting audio', 'Loading model', 'Transcribing', 'Building checklist'];
      for (let i = 0; i < steps.length; i++) { await wait(750); onProgress && onProgress({ label: steps[i] + '...', pct: ((i + 1) / steps.length) * 100 }); }
      const v = library.find(x => x.name === name); if (v) v.transcribed = true;
      return sampleChecklist();
    },
    async publish(name, checklist, meta, onProgress) {
      meta = meta || {};
      await wait(900); onProgress && onProgress({ label: 'Uploading to Vimeo...', pct: 55 });
      await wait(1100); onProgress && onProgress({ label: 'Posting to Teams...', pct: 90 });
      await wait(500);
      const v = library.find(x => x.name === name); if (v) v.published = true;
      published.unshift({ id: cryptoId(), title: meta.title || name.replace(/\.[^.]+$/, ''), vimeoUrl: 'https://vimeo.com/000000000', device: meta.device || '', procedure: meta.procedure || '', description: meta.description || '', notes: meta.notes || '', changes: checklist.changes || [], other: checklist.other || [], publishedAt: 'just now' });
      return { vimeoUrl: 'https://vimeo.com/000000000', teamsPosted: true };
    },
    async listPublished() { await wait(150); return published.map(p => ({ ...p })); },
    async deletePublished(id, deleteVimeo) { published = published.filter(p => p.id !== id); return { deleted: true }; },
    async listVimeoFolders() { await wait(150); return vimeoFolders.map(f => ({ ...f })); },
    async createVimeoFolder(name) { await wait(200); const f = { uri: '/folders/new-' + cryptoId(), name }; vimeoFolders.push(f); return f; },
    async listDeviceProcedure() { await wait(120); return { devices: [...deviceList], procedures: [...procedureList] }; },
    async addToList(kind, name) { await wait(120); const lst = kind === 'device' ? deviceList : procedureList; if (!lst.includes(name)) lst.push(name); lst.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())); return { devices: [...deviceList], procedures: [...procedureList] }; },
    async removeFromList(kind, name) { await wait(120); if (kind === 'device') deviceList = deviceList.filter(x => x !== name); else procedureList = procedureList.filter(x => x !== name); return { devices: [...deviceList], procedures: [...procedureList] }; },
    async togglePublishedItem(pubId, itemId, done) { for (const p of published) { for (const arr of ['changes', 'other']) { for (const c of (p[arr] || [])) { if (c.id === itemId) c.done = done; } } } return { ok: true }; },
    async deletePublishedGroup(device, deleteVimeo) { published = published.filter(p => (p.device || '') !== (device || '')); return { ok: true }; },
  };
})();

function cryptoId() { return 'id-' + Math.random().toString(36).slice(2, 9); }

const API = window.fetchAPI || MockAPI;
const MODE = window.fetchAPI ? 'electron' : 'mock';

// ---------- State ----------
const state = { device: null, headset: [], library: [], selected: null, checklist: null };
let jobs = [];

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
const fmtSize = (b) => (b / 1_000_000_000 >= 1) ? (b / 1_000_000_000).toFixed(1) + ' GB' : Math.round(b / 1_000_000) + ' MB';
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); }

function switchView(name) {
  document.querySelectorAll('.rail-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  if (name === 'library') renderLibrary();
  if (name === 'transcribe') renderTranscribeSelected();
  if (name === 'review') renderReview();
  if (name === 'publish') renderPublish();
  if (name === 'history') renderHistory();
  if (name === 'jobs') renderJobs();
}

// ---------- Connect ----------
async function refreshDevice() {
  $('deviceText').textContent = 'Checking...';
  $('deviceDot').className = 'dot warn';
  const d = await API.getDeviceStatus();
  state.device = d;
  const dot = $('deviceDot'), text = $('deviceText');
  if (!d.connected) { dot.className = 'dot bad'; text.textContent = 'No headset'; $('statusIcon').textContent = '🔌'; $('statusTitle').textContent = 'No headset detected'; $('statusMeta').textContent = 'Plug in the Quest over USB and unlock it.'; }
  else if (!d.authorized) { dot.className = 'dot warn'; text.textContent = 'Unauthorized'; $('statusIcon').textContent = '🔒'; $('statusTitle').textContent = 'Allow USB debugging'; $('statusMeta').textContent = 'Accept the prompt inside the headset, then Refresh.'; }
  else { dot.className = 'dot ok'; text.textContent = d.deviceName; $('statusIcon').textContent = '🎧'; $('statusTitle').textContent = d.deviceName + ' connected'; $('statusMeta').textContent = 'Ready to pull recordings.'; }
  await refreshHeadset();
}

async function refreshHeadset() {
  state.headset = await API.listHeadsetVideos();
  state.headset.sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : a.modifiedAt > b.modifiedAt ? -1 : 0)); // newest first
  const list = $('headsetList'); list.innerHTML = '';
  const newCount = state.headset.filter(v => !v.pulled).length;
  $('headsetCount').textContent = `${state.headset.length} recordings, ${newCount} new`;
  state.headset.forEach(v => {
    const row = document.createElement('label'); row.className = 'item' + (v.pulled ? ' pulled' : '');
    row.innerHTML = `
      <input type="checkbox" class="check" data-name="${v.name}" ${v.pulled ? 'disabled' : ''}/>
      <div class="thumb">${v.pulled ? '✅' : '🎬'}</div>
      <div class="meta"><div class="name">${v.name}</div><div class="sub">${fmtSize(v.sizeBytes)} · ${v.modifiedAt}</div></div>
      <span class="tag ${v.pulled ? 'pulled' : 'new'}">${v.pulled ? 'pulled' : 'new'}</span>
      <button type="button" class="icon-btn hs-del" title="Delete from the headset (and Library). Anything already published stays in History.">🗑️</button>`;
    row.querySelector('.hs-del').onclick = async (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!confirm(`Delete "${v.name}" from your Quest?\n\nThis also removes the pulled copy from your Library. Anything already published stays in History.`)) return;
      const btn = e.currentTarget; btn.disabled = true;
      if (window.SFX) SFX.play('click');
      Dog.say('Clearing it off the headset...');
      try { await API.deleteHeadsetVideo(v.name); toast('Deleted from headset'); }
      catch (err) { toast('Could not delete'); }
      await refreshHeadset();
    };
    list.appendChild(row);
  });
}

async function doPull(mode) {
  const names = [...document.querySelectorAll('#headsetList .check:checked')].map(c => c.dataset.name);
  if (mode === 'selected' && names.length === 0) { toast('Pick at least one video first'); return; }
  showProgress('transcribe', false);
  Dog.say('Fetching... 🐕');
  if (window.SFX) SFX.play('fetch');
  await API.pull(mode, names, (p) => toast(p.label));
  await refreshHeadset();
  state.library = await API.listLibrary();
  if (window.SFX) SFX.play('success');
  Dog.happy('Got them! Check your Library.');
  toast('Pull complete');
}

// ---------- Library ----------
async function renderLibrary() {
  const list = $('libraryList'); list.innerHTML = '<div class="muted">Loading...</div>';
  try { state.library = await API.listLibrary(); } catch (e) { state.library = []; }
  list.innerHTML = '';
  if (state.library.length === 0) { list.innerHTML = '<div class="muted">Nothing here yet. Pull a recording in Connect. Anything you pull stays here until you publish it.</div>'; return; }
  state.library.forEach(v => {
    const row = document.createElement('div'); row.className = 'item' + (state.selected === v.name ? ' selected' : '');
    row.innerHTML = `
      <div class="thumb">🎞️</div>
      <div class="meta"><div class="name">${v.name}</div><div class="sub">${Math.round(v.durationSec / 60)} min · pulled ${v.pulledAt}</div></div>
      ${v.published ? '<span class="tag done">published</span>' : v.transcribed ? '<span class="tag new">transcribed</span>' : ''}
      <button class="btn small">${state.selected === v.name ? 'Selected' : 'Select'}</button>`;
    row.querySelector('button').onclick = () => { state.selected = v.name; renderLibrary(); switchView('transcribe'); };
    list.appendChild(row);
  });
}

// ---------- Transcribe ----------
function renderTranscribeSelected() {
  const c = $('transcribeSelected'); const btn = $('runTranscribe');
  if (!state.selected) { c.innerHTML = '<div class="muted">No video selected. Head to the Library and pick one.</div>'; btn.disabled = true; return; }
  c.innerHTML = `<div class="name">🎞️ ${state.selected}</div>`; btn.disabled = false;
}

async function runTranscribe() {
  if (!state.selected) return;
  showProgress('transcribe', true);
  Dog.sleep('Napping while I listen... 💤');
  state.checklist = await API.transcribe(state.selected, (p) => updateProgress('transcribe', p));
  showProgress('transcribe', false);
  if (window.SFX) SFX.play('success');
  Dog.happy('All done! Have a look.');
  switchView('review');
}

// ---------- Review ----------
function renderReview() {
  if (!state.checklist) { $('changesList').innerHTML = '<div class="muted">Transcribe a video first.</div>'; $('otherList').innerHTML = ''; return; }
  const cl = state.checklist;
  $('changeCount').textContent = cl.changes.length;
  $('otherCount').textContent = cl.other.length;
  const cList = $('changesList'); cList.innerHTML = '';
  cl.changes.forEach((it) => cList.appendChild(changeRow(it)));
  const oList = $('otherList'); oList.innerHTML = '';
  cl.other.forEach((it) => oList.appendChild(otherRow(it)));
}

function changeRow(it) {
  const row = document.createElement('div'); row.className = 'ci';
  row.innerHTML = `<span class="ts">${it.ts}</span><textarea>${it.text}</textarea>
    <div class="ci-actions"><button class="icon-btn" title="Move to Other">↧</button><button class="icon-btn" title="Delete">🗑️</button></div>`;
  row.querySelector('textarea').oninput = (e) => it.text = e.target.value;
  const [moveBtn, delBtn] = row.querySelectorAll('.icon-btn');
  moveBtn.onclick = () => { state.checklist.changes = state.checklist.changes.filter(x => x.id !== it.id); state.checklist.other.push({ id: it.id, text: it.text }); renderReview(); };
  delBtn.onclick = () => { state.checklist.changes = state.checklist.changes.filter(x => x.id !== it.id); renderReview(); };
  return row;
}

function otherRow(it) {
  const row = document.createElement('div'); row.className = 'ci';
  row.innerHTML = `<textarea>${it.text}</textarea>
    <div class="ci-actions"><button class="icon-btn" title="Delete">🗑️</button></div>`;
  row.querySelector('textarea').oninput = (e) => it.text = e.target.value;
  row.querySelector('.icon-btn').onclick = () => { state.checklist.other = state.checklist.other.filter(x => x.id !== it.id); renderReview(); };
  return row;
}

// ---------- Publish ----------
function renderPublish() {
  populateFolders();
  populateDeviceProcedure();
  const s = $('publishSummary');
  if (!state.checklist || !state.selected) { s.innerHTML = '<div class="muted">Nothing ready to publish yet.</div>'; $('publishBtn').disabled = true; return; }
  if (!$('pubTitle').value) $('pubTitle').value = state.selected.replace(/\.[^.]+$/, '');
  s.innerHTML = `
    <div class="srow"><span>Video</span><b>${state.selected}</b></div>
    <div class="srow"><span>Timestamp callouts</span><b>${state.checklist.changes.length}</b></div>
    <div class="srow"><span>Other notes</span><b>${state.checklist.other.length}</b></div>
    <div class="srow"><span>Destination</span><b>Vimeo + Teams</b></div>`;
  $('publishBtn').disabled = false;
  $('publishSuccess').classList.add('hidden');
}

async function populateFolders() {
  const sel = $('pubFolder');
  if (!sel || sel.dataset.loaded === '1') return;
  sel.innerHTML = '<option value="">Loading folders...</option>';
  let folders = [];
  try { folders = await API.listVimeoFolders(); } catch (e) { folders = []; }
  const saved = localStorage.getItem('fetch_vimeo_folder') || '';
  sel.innerHTML = '<option value="">No folder (My Videos)</option>' + folders.map(f => `<option value="${escapeHtml(f.uri)}">${escapeHtml(f.name)}</option>`).join('');
  sel.value = saved;
  sel.onchange = () => localStorage.setItem('fetch_vimeo_folder', sel.value);
  if (folders.length) sel.dataset.loaded = '1'; // retry next visit if it came back empty
}

function addCreatedFolder(folder) {
  const sel = $('pubFolder');
  const opt = document.createElement('option');
  opt.value = folder.uri; opt.textContent = folder.name;
  sel.appendChild(opt);
  sel.value = folder.uri;
  localStorage.setItem('fetch_vimeo_folder', folder.uri);
}

async function populateDeviceProcedure() {
  let data = { devices: [], procedures: [] };
  try { data = await API.listDeviceProcedure(); } catch (e) {}
  fillPicker('pubDevice', data.devices, 'fetch_device');
  fillPicker('pubProcedure', data.procedures, 'fetch_procedure');
}

function fillPicker(selId, items, storageKey) {
  const sel = $(selId);
  if (!sel) return;
  const saved = localStorage.getItem(storageKey) || '';
  sel.innerHTML = '<option value="">None</option>' + (items || []).map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  sel.value = saved;
  sel.onchange = () => localStorage.setItem(storageKey, sel.value);
}

function wireListPicker(kind, newBtn, newRow, nameInput, createBtn, cancelBtn, selId, storageKey, delBtn) {
  $(newBtn).onclick = () => { $(newRow).classList.remove('hidden'); $(nameInput).focus(); };
  $(cancelBtn).onclick = () => { $(newRow).classList.add('hidden'); $(nameInput).value = ''; };
  $(createBtn).onclick = async () => {
    const nm = ($(nameInput).value || '').trim();
    if (!nm) return;
    $(createBtn).disabled = true;
    try {
      const data = await API.addToList(kind, nm);
      fillPicker(selId, kind === 'device' ? data.devices : data.procedures, storageKey);
      $(selId).value = nm; localStorage.setItem(storageKey, nm);
      $(newRow).classList.add('hidden'); $(nameInput).value = '';
      if (window.SFX) SFX.play('success');
    } catch (e) { toast('Could not add'); }
    $(createBtn).disabled = false;
  };
  if (delBtn && $(delBtn)) $(delBtn).onclick = async () => {
    const sel = $(selId); const val = sel.value;
    if (!val) { toast(`Pick a ${kind} to delete first`); return; }
    if (!confirm(`Delete "${val}" from the saved ${kind} list? This won't touch anything already published.`)) return;
    $(delBtn).disabled = true;
    try {
      const data = await API.removeFromList(kind, val);
      localStorage.setItem(storageKey, '');
      fillPicker(selId, kind === 'device' ? data.devices : data.procedures, storageKey);
      sel.value = '';
      if (window.SFX) SFX.play('click');
      toast(`Removed "${val}"`);
    } catch (e) { toast('Could not delete'); }
    $(delBtn).disabled = false;
  };
}

function doPublish() {
  if (!state.selected || !state.checklist) return;
  const meta = {
    title: ($('pubTitle').value || '').trim() || (state.selected ? state.selected.replace(/\.[^.]+$/, '') : 'Module review'),
    description: ($('pubDescription').value || '').trim(),
    notes: ($('pubNotes').value || '').trim(),
    folder: ($('pubFolder') ? $('pubFolder').value : '') || '',
    device: ($('pubDevice') ? $('pubDevice').value : '') || '',
    procedure: ($('pubProcedure') ? $('pubProcedure').value : '') || '',
  };
  const name = state.selected, checklist = state.checklist;
  const job = { id: cryptoId(), title: meta.title, device: meta.device, status: 'running', label: 'Starting...', pct: 5, vimeoUrl: null };
  jobs.unshift(job);
  if (window.SFX) SFX.play('fetch');
  Dog.say('Queued it up! 🚀');
  switchView('jobs');
  API.publish(name, checklist, meta, (p) => { if (p.label) job.label = p.label; if (typeof p.pct === 'number') job.pct = p.pct; renderJobs(); })
    .then(res => { job.status = 'done'; job.pct = 100; job.vimeoUrl = res && res.vimeoUrl; job.label = (res && res.teamsPosted === false) ? 'Uploaded to Vimeo. Teams post failed, see History.' : 'Published to Teams'; if (window.SFX) SFX.play('success'); Dog.happy('Sent! You did great. 🦴'); renderJobs(); })
    .catch(err => { job.status = 'failed'; job.label = 'Failed: ' + (err && err.message ? err.message : 'error'); if (window.SFX) SFX.play('bark'); Dog.say('That one tripped up. 🐾'); renderJobs(); });
  renderJobs();
}

function renderJobs() {
  updateJobBadge();
  const list = $('jobsList');
  if (!list) return;
  if (!jobs.length) { list.innerHTML = '<div class="muted">No jobs yet. Publish a review and it shows up here with a live status bar.</div>'; return; }
  list.innerHTML = '';
  jobs.forEach(j => list.appendChild(jobRow(j)));
}

function jobRow(j) {
  const row = document.createElement('div'); row.className = 'job ' + j.status;
  const icon = j.status === 'done' ? '✅' : j.status === 'failed' ? '⚠️' : '⏳';
  const pct = j.status === 'done' ? 100 : (j.pct || 0);
  row.innerHTML = `
    <div class="job-head">
      <div class="job-meta">
        <div class="job-title">${escapeHtml(j.title)}</div>
        <div class="job-sub">${j.device ? escapeHtml(j.device) + ' · ' : ''}${escapeHtml(j.label)}</div>
      </div>
      <span class="job-status">${icon}</span>
    </div>
    <div class="bar"><div class="bar-fill ${j.status === 'running' ? 'running' : ''}" style="width:${pct}%"></div></div>
    ${j.status === 'done' && j.vimeoUrl ? `<a class="job-link" href="${escapeHtml(j.vimeoUrl)}">▶ View on Vimeo</a>` : ''}`;
  const link = row.querySelector('.job-link');
  if (link) link.onclick = (e) => { e.preventDefault(); if (window.fetchAPI && window.fetchAPI.openExternal) window.fetchAPI.openExternal(j.vimeoUrl); else window.open(j.vimeoUrl, '_blank'); };
  return row;
}

function updateJobBadge() {
  const badge = $('jobBadge'); if (!badge) return;
  const running = jobs.filter(j => j.status === 'running').length;
  if (running) { badge.textContent = running; badge.classList.remove('hidden'); }
  else { badge.classList.add('hidden'); }
}

// ---------- History ----------
function escapeHtml(s) { return (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function openDeleteModal(title, text, vimeoLabel) {
  return new Promise(resolve => {
    const m = $('deleteModal');
    $('deleteTitle').textContent = title;
    $('deleteText').textContent = text;
    $('deleteVimeoLabel').textContent = vimeoLabel;
    $('deleteVimeoChk').checked = false;
    m.classList.remove('hidden');
    const done = (res) => { m.classList.add('hidden'); $('deleteConfirmBtn').onclick = null; $('deleteCancelBtn').onclick = null; m.onclick = null; resolve(res); };
    $('deleteConfirmBtn').onclick = () => done({ ok: true, vimeo: $('deleteVimeoChk').checked });
    $('deleteCancelBtn').onclick = () => done({ ok: false });
    m.onclick = (e) => { if (e.target === m) done({ ok: false }); };
  });
}

async function renderHistory() {
  const list = $('historyList'); list.innerHTML = '<div class="muted">Loading...</div>';
  const items = await API.listPublished();
  list.innerHTML = '';
  if (!items.length) { list.innerHTML = '<div class="muted">Nothing published yet. Publish a review and it shows up here.</div>'; return; }
  const order = []; const byDevice = {};
  items.forEach(it => { const d = it.device || ''; if (!(d in byDevice)) { byDevice[d] = []; order.push(d); } byDevice[d].push(it); });
  order.forEach(d => list.appendChild(deviceGroup(d, byDevice[d])));
}

function deviceGroup(device, entries) {
  const wrap = document.createElement('div'); wrap.className = 'devgroup';
  const label = device || 'No device';
  const head = document.createElement('div'); head.className = 'devgroup-head';
  head.innerHTML = `
    <button class="devgroup-toggle"><span class="chev">▾</span><span class="devgroup-title">${escapeHtml(label)}</span><span class="devgroup-count">${entries.length}</span></button>
    <button class="icon-btn devgroup-del" title="Delete this device and all its reviews">🗑️</button>`;
  const body = document.createElement('div'); body.className = 'devgroup-body';
  entries.forEach(it => body.appendChild(historyRow(it)));
  wrap.appendChild(head); wrap.appendChild(body);
  const chev = head.querySelector('.chev');
  head.querySelector('.devgroup-toggle').onclick = () => { body.classList.toggle('hidden'); chev.textContent = body.classList.contains('hidden') ? '▸' : '▾'; };
  head.querySelector('.devgroup-del').onclick = async (e) => {
    e.stopPropagation();
    const r = await openDeleteModal(`Delete ${label}`, `Delete "${label}" and all ${entries.length} review(s)?`, `Also delete all ${entries.length} Vimeo video(s)`);
    if (!r.ok) return;
    if (window.SFX) SFX.play('click');
    await API.deletePublishedGroup(device || '', r.vimeo);
    renderHistory();
  };
  return wrap;
}

function historyRow(it) {
  const all = [...(it.changes || []), ...(it.other || [])];
  const doneCount = all.filter(c => c.done).length;
  const row = document.createElement('div'); row.className = 'acc';
  row.innerHTML = `
    <div class="acc-head">
      <button class="acc-toggle"><span class="chev">▸</span><span class="acc-title">${escapeHtml(it.title)}</span></button>
      <span class="acc-done">${doneCount}/${all.length}</span>
      <span class="acc-date">${escapeHtml(it.publishedAt || '')}</span>
      <button class="icon-btn acc-del" title="Delete this review">🗑️</button>
    </div>
    <div class="acc-body hidden">
      ${it.procedure ? `<div class="acc-meta">Procedure: ${escapeHtml(it.procedure)}</div>` : ''}
      ${it.description ? `<div class="acc-desc">${escapeHtml(it.description)}</div>` : ''}
      ${it.vimeoUrl ? `<a class="acc-link" href="${escapeHtml(it.vimeoUrl)}">▶ Watch on Vimeo</a>` : ''}
      <div class="acc-section">Timestamp callouts (${(it.changes || []).length})</div>
      <div class="acc-checks" data-arr="changes"></div>
      <div class="acc-section">Other notes (${(it.other || []).length})</div>
      <div class="acc-checks" data-arr="other"></div>
      ${it.notes ? `<div class="acc-section">Notes</div><div class="acc-notes">${escapeHtml(it.notes)}</div>` : ''}
    </div>`;
  const cBox = row.querySelector('.acc-checks[data-arr="changes"]');
  (it.changes || []).forEach(c => cBox.appendChild(checkItem(it, c, true)));
  const oBox = row.querySelector('.acc-checks[data-arr="other"]');
  (it.other || []).forEach(o => oBox.appendChild(checkItem(it, o, false)));
  const body = row.querySelector('.acc-body');
  const chev = row.querySelector('.chev');
  row.querySelector('.acc-toggle').onclick = () => { body.classList.toggle('hidden'); chev.textContent = body.classList.contains('hidden') ? '▸' : '▾'; };
  row.querySelector('.acc-del').onclick = async (e) => {
    e.stopPropagation();
    const r = await openDeleteModal('Delete review', `Remove "${it.title}" from History?`, 'Also delete the Vimeo video');
    if (!r.ok) return;
    if (window.SFX) SFX.play('click');
    await API.deletePublished(it.id, r.vimeo);
    renderHistory();
  };
  const link = row.querySelector('.acc-link');
  if (link) link.onclick = (e) => { e.preventDefault(); if (window.fetchAPI && window.fetchAPI.openExternal) window.fetchAPI.openExternal(it.vimeoUrl); else window.open(it.vimeoUrl, '_blank'); };
  return row;
}

function checkItem(entry, item, isChange) {
  const wrap = document.createElement('label'); wrap.className = 'check-item' + (item.done ? ' done' : '');
  const ts = (isChange && item.ts) ? `<span class="ts">${escapeHtml(item.ts)}</span>` : '';
  wrap.innerHTML = `<input type="checkbox" class="check" ${item.done ? 'checked' : ''}/>${ts}<span class="check-text">${escapeHtml(item.text)}</span>`;
  const cb = wrap.querySelector('input');
  cb.onchange = async () => {
    item.done = cb.checked;
    wrap.classList.toggle('done', cb.checked);
    try { await API.togglePublishedItem(entry.id, item.id, cb.checked); } catch (e) {}
    const allItems = [...(entry.changes || []), ...(entry.other || [])];
    const badge = wrap.closest('.acc').querySelector('.acc-done');
    if (badge) badge.textContent = `${allItems.filter(x => x.done).length}/${allItems.length}`;
  };
  return wrap;
}

// ---------- Progress helpers ----------
function showProgress(which, show) { const c = $(which + 'Progress'); c.classList.toggle('hidden', !show); if (show) updateProgress(which, { label: 'Starting...', pct: 5 }); }
function updateProgress(which, p) { $(which + 'Label').textContent = p.label; $(which + 'Bar').style.width = p.pct + '%'; }

// ---------- Wire up ----------
function init() {
  document.querySelectorAll('.rail-btn').forEach(b => b.onclick = () => { if (window.SFX) SFX.play('click'); switchView(b.dataset.view); });
  $('refreshDevice').onclick = refreshDevice;
  $('pullAllNew').onclick = () => doPull('all_new');
  $('pullNewest').onclick = () => doPull('newest');
  $('pullSelected').onclick = () => doPull('selected');
  $('runTranscribe').onclick = runTranscribe;
  $('addChange').onclick = () => { state.checklist = state.checklist || { changes: [], other: [] }; state.checklist.changes.push({ id: cryptoId(), ts: '00:00', text: '', quote: '', confidence: 'manual' }); renderReview(); };
  $('addOther').onclick = () => { state.checklist = state.checklist || { changes: [], other: [] }; state.checklist.other.push({ id: cryptoId(), text: '' }); renderReview(); };
  $('publishBtn').onclick = doPublish;
  $('clearJobsBtn').onclick = () => { jobs = jobs.filter(j => j.status === 'running'); renderJobs(); };
  $('newFolderBtn').onclick = () => { $('newFolderRow').classList.remove('hidden'); $('newFolderName').focus(); };
  $('cancelFolderBtn').onclick = () => { $('newFolderRow').classList.add('hidden'); $('newFolderName').value = ''; };
  $('createFolderBtn').onclick = async () => {
    const nm = ($('newFolderName').value || '').trim();
    if (!nm) return;
    $('createFolderBtn').disabled = true;
    try {
      const f = await API.createVimeoFolder(nm);
      addCreatedFolder(f);
      $('newFolderRow').classList.add('hidden'); $('newFolderName').value = '';
      if (window.SFX) SFX.play('success'); toast('Folder created');
    } catch (e) { toast('Could not create folder'); }
    $('createFolderBtn').disabled = false;
  };
  wireListPicker('device', 'newDeviceBtn', 'newDeviceRow', 'newDeviceName', 'createDeviceBtn', 'cancelDeviceBtn', 'pubDevice', 'fetch_device', 'delDeviceBtn');
  wireListPicker('procedure', 'newProcBtn', 'newProcRow', 'newProcName', 'createProcBtn', 'cancelProcBtn', 'pubProcedure', 'fetch_procedure', 'delProcBtn');
  const howModal = $('howModal');
  $('howItWorks').onclick = () => { if (window.SFX) SFX.play('click'); howModal.classList.remove('hidden'); };
  $('howClose').onclick = () => howModal.classList.add('hidden');
  howModal.onclick = (e) => { if (e.target === howModal) howModal.classList.add('hidden'); };
  const soundToggle = $('soundToggle');
  soundToggle.onclick = () => {
    const on = !SFX.isEnabled();
    SFX.setEnabled(on);
    soundToggle.classList.toggle('off', !on);
    soundToggle.innerHTML = on ? '<span class="ico">🔊</span><span>Sound on</span>' : '<span class="ico">🔇</span><span>Sound off</span>';
    if (on) SFX.play('click');
  };
  document.addEventListener('click', () => { if (window.SFX) SFX.ensure(); }, { once: true });
  Dog.init();
  if (MODE === 'mock') toast('Preview mode (mock data)');
  refreshDevice();
}
document.addEventListener('DOMContentLoaded', init);
