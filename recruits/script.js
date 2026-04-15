const PROFILE_LINK_KEYS = {
  userId:      { nameKey: 'username',      idKey: 'userId' },
  recruiterId: { nameKey: 'recruiterName', idKey: 'recruiterId' },
};
const DATE_KEYS = new Set(['sentAt', 'resolvedAt']);
const SKIP_KEYS = new Set(['username', 'recruiterName']);
const LABELS = {
  userId:       'User',
  recruiterId:  'Recruiter',
  level:        'Level',
  age:          'Age',
  rank:         'Rank',
  property:     'Property',
  awards:       'Awards',
  donatorStatus:'Donator',
  lastAction:   'Last Action',
  sentAt:       'Sent',
  resolvedAt:   'Resolved',
  joined:       'Joined',
};

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d)) return '—';
  const yyyy = d.getUTCFullYear();
  const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
}

function renderProfileLink(td, name, id) {
  if (!name || !id) { td.textContent = 'Unknown User'; return; }
  const a = document.createElement('a');
  a.href = `https://www.torn.com/profiles.php?XID=${id}`;
  a.className = 'profile-link';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = name;
  const idSpan = document.createElement('span');
  idSpan.className = 'profile-id';
  idSpan.textContent = `[${id}]`;
  td.appendChild(a);
  td.appendChild(idSpan);
}

function renderCell(key, record) {
  const td = document.createElement('td');
  const val = record[key];

  if (PROFILE_LINK_KEYS[key]) {
    const { nameKey, idKey } = PROFILE_LINK_KEYS[key];
    td.className = 'col-left';
    renderProfileLink(td, record[nameKey], record[idKey]);
    return td;
  }

  if (DATE_KEYS.has(key)) {
    td.textContent = formatDate(val);
    return td;
  }

  if (key === 'joined') {
    const badge = document.createElement('span');
    badge.className = val ? 'badge badge-yes' : 'badge badge-no';
    badge.textContent = val ? 'Yes' : 'No';
    td.appendChild(badge);
    return td;
  }

  if (key === 'donatorStatus') {
    const status = val ? val.toLowerCase() : '';
    if (status === 'donator' || status === 'subscriber') {
      const star = document.createElement('span');
      star.className = `star star-${status}`;
      star.textContent = '★';
      star.title = status.charAt(0).toUpperCase() + status.slice(1);
      td.appendChild(star);
    } else {
      td.textContent = val || '—';
    }
    return td;
  }

  td.textContent = val !== undefined && val !== null ? val : '—';
  return td;
}

function getColumns(record) {
  return Object.keys(record).filter(k => !SKIP_KEYS.has(k));
}

function buildHeader(columns) {
  const thead = document.getElementById('table-head');
  thead.innerHTML = '';
  const tr = document.createElement('tr');
  columns.forEach(key => {
    const th = document.createElement('th');
    th.textContent = LABELS[key] || key;
    if (PROFILE_LINK_KEYS[key]) th.classList.add('col-left');
    tr.appendChild(th);
  });
  thead.appendChild(tr);
}

function buildRows(recruits, columns) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  recruits.forEach(r => {
    const tr = document.createElement('tr');
    columns.forEach(key => tr.appendChild(renderCell(key, r)));
    tbody.appendChild(tr);
  });
}

function updateStats(recruits) {
  const total  = recruits.length;
  const joined = recruits.filter(r => r.joined).length;
  document.getElementById('stat-total').textContent   = total;
  document.getElementById('stat-joined').textContent  = joined;
  document.getElementById('stat-pending').textContent = total - joined;
}

async function init() {
  try {
    const res = await fetch('data/recruits.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const recruits = await res.json();
    if (!recruits.length) throw new Error('No records found');

    const columns = getColumns(recruits[0]);
    buildHeader(columns);
    buildRows(recruits, columns);
    updateStats(recruits);
  } catch (e) {
    document.getElementById('table-body').innerHTML =
      `<tr class="error-row"><td colspan="99">Failed to load data/recruits.json — ${e.message}</td></tr>`;
  }
}

init();
