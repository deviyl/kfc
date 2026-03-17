const CATEGORIES = [
  {
    label: "Items & Consumables",
    keys: [
      { key: "canUseMedicalItem",    label: "Use Medical Items" },
      { key: "canUseBoosterItem",    label: "Use Booster Items" },
      { key: "canUseDrugItem",       label: "Use Drug Items" },
      { key: "canUseConsumableItem", label: "Use Consumable Items" },
      { key: "canUseEnergyRefill",   label: "Use Energy Refills" },
      { key: "canUseNerveRefill",    label: "Use Nerve Refills" },
    ]
  },
  {
    label: "Armory & Loans",
    keys: [
      { key: "canLoanWeaponAndArmory",  label: "Loan Weapons & Armory" },
      { key: "canRetrieveLoanedArmory", label: "Retrieve Loaned Armory" },
      { key: "canLoanTemporaryItem",    label: "Loan Temporary Items" },
      { key: "canLoanUtilityItem",      label: "Loan Utility Items" },
      { key: "canLoanMedicalItem",      label: "Loan Medical Items" },
      { key: "canLoanBoosterItem",      label: "Loan Booster Items" },
      { key: "canLoanConsumableItem",   label: "Loan Consumable Items" },
      { key: "canLoanDragItem",         label: "Loan Drug Items" },
    ]
  },
  {
    label: "Giving",
    keys: [
      { key: "canGiveItem",   label: "Give Items" },
      { key: "canGiveMoney",  label: "Give Money" },
      { key: "canGivePoints", label: "Give Points" },
    ]
  },
  {
    label: "Management",
    keys: [
      { key: "canManageApplications",  label: "Manage Applications" },
      { key: "canKickMembers",         label: "Kick Members" },
      { key: "canAdjustMemberBalance", label: "Adjust Member Balance" },
      { key: "canManageWars",          label: "Manage Wars" },
      { key: "canManageUpgrades",      label: "Manage Upgrades" },
      { key: "canManageOC2",           label: "Manage Organized Crime" },
    ]
  },
  {
    label: "Communication & Info",
    keys: [
      { key: "canAccessFactionApi",   label: "Access Faction API" },
      { key: "canManageForum",        label: "Manage Forum" },
      { key: "canSendNewsletter",     label: "Send Newsletter" },
      { key: "canChangeAnnouncement", label: "Change Announcement" },
      { key: "canChangeDescription",  label: "Change Description" },
    ]
  },
];

async function init() {
  let data;
  try {
    const res = await fetch('data/positions.json');
    data = await res.json();
  } catch (e) {
    document.getElementById('table-body').innerHTML =
      '<tr><td colspan="99" style="padding:24px;color:#ff4500;font-family:monospace">Failed to load data/positions.json</td></tr>';
    return;
  }

  const positions = data.positions || {};
  const roles = Object.keys(positions);

  const tag = document.getElementById('updated-tag');
  try {
    const headRes = await fetch('data/positions.json', { method: 'HEAD' });
    const lm = headRes.headers.get('last-modified');
    tag.textContent = lm
      ? 'Updated ' + new Date(lm).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Data loaded';
  } catch { tag.textContent = 'Data loaded'; }

  buildFilterBar(roles, positions);
  buildTable(roles, positions, 'all');
}

function buildFilterBar(roles, positions) {
  const bar = document.getElementById('filter-bar');
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.cat = cat.label;
    btn.textContent = cat.label;
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      buildTable(roles, positions, cat.label);
    };
    bar.appendChild(btn);
  });

  bar.querySelector('[data-cat="all"]').onclick = function () {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    buildTable(roles, positions, 'all');
  };
}

function buildTable(roles, positions, filterCat) {
  const thead = document.getElementById('table-head');
  const tbody = document.getElementById('table-body');

  thead.innerHTML = '';
  const headerRow = document.createElement('tr');
  const th0 = document.createElement('th');
  th0.className = 'col-label';
  th0.textContent = 'Permission';
  headerRow.appendChild(th0);

  roles.forEach(role => {
    const th = document.createElement('th');
    th.className = 'col-perm';
    const isDefault = positions[role].default === 1;
    th.innerHTML = `<span class="role-name">${role}</span>${isDefault ? '<span class="default-badge">DEFAULT</span>' : ''}`;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  tbody.innerHTML = '';
  const cats = filterCat === 'all' ? CATEGORIES : CATEGORIES.filter(c => c.label === filterCat);

  cats.forEach(cat => {
    const catRow = document.createElement('tr');
    catRow.className = 'category-header';
    const catTd = document.createElement('td');
    catTd.colSpan = roles.length + 1;
    catTd.textContent = cat.label;
    catRow.appendChild(catTd);
    tbody.appendChild(catRow);

    cat.keys.forEach(({ key, label }) => {
      const tr = document.createElement('tr');

      const labelTd = document.createElement('td');
      labelTd.className = 'perm-label';
      labelTd.textContent = label;
      tr.appendChild(labelTd);

      roles.forEach(role => {
        const val = positions[role][key];
        const td = document.createElement('td');
        td.className = 'perm-cell';
        td.innerHTML = val
          ? '<span class="yes-mark">✓</span>'
          : '<span class="no-mark">–</span>';
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  });
}

init();
