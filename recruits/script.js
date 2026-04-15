const PROFILE_LINK_KEYS = {
  userId:      { nameKey: 'username',      idKey: 'userId' },
  recruiterId: { nameKey: 'recruiterName', idKey: 'recruiterId' },
};

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

const DATE_KEYS = new Set(['sentAt', 'resolvedAt']);
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d)) return '—';
  const yyyy = d.getUTCFullYear();
  const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
}

function toTitleCase(str) {
  if (!str) return '—';
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function renderProfileLink(td, name, id) {
  if (!name || !id) { td.textContent = 'Unknown User'; return; }
  const a = document.createElement('a');
  a.href = `https://www.torn.com/profiles.php?XID=${id}`;
  a.className = 'profile-link';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = `${name} [${id}]`;
  td.appendChild(a);
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
    if (val === null || val === undefined) {
      badge.className = 'badge badge-pending';
      badge.textContent = 'Pending';
    } else if (val) {
      badge.className = 'badge badge-yes';
      badge.textContent = 'Yes';
    } else {
      badge.className = 'badge badge-no';
      badge.textContent = 'No';
    }
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

  if (key === 'property') {
    td.textContent = toTitleCase(val);
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

async function init() {
  try {
    const res = await fetch('data/recruits.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const all = await res.json();
    if (!all.length) throw new Error('No records found');

    const cutoff = Date.now() - THIRTY_DAYS_MS;
    const recruits = all.filter(r => {
      if (!r.sentAt) return false;
      return new Date(r.sentAt).getTime() >= cutoff;
    });

    const columns = getColumns(all[0]);
    buildHeader(columns);

    if (!recruits.length) {
      document.getElementById('table-body').innerHTML =
        `<tr class="error-row"><td colspan="${columns.length}">No recruits in the last 30 days.</td></tr>`;
      return;
    }

    buildRows(recruits, columns);
  } catch (e) {
    document.getElementById('table-body').innerHTML =
      `<tr class="error-row"><td colspan="99">No recruits found!</td></tr>`;
  }
}

init();
