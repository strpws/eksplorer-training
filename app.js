let RAW = [];
let filtered = [];
let sortField = 'peminat_num';
let sortDir = -1;
let currentPage = 1;
let PAGE_SIZE = window.innerWidth < 480 ? 5 : 10;

const selProv = document.getElementById('sel-provinsi');
const selUni = document.getElementById('sel-uni');
const selBidang = document.getElementById('sel-bidang');
const selJenjang = document.getElementById('sel-jenjang');

function init(data) {
  RAW = data;
  RAW.forEach(d => {
    if (d.rasio && d.rasio.startsWith('1:')) {
      d.rasio_num = parseInt(d.rasio.split(':')[1]) || 0;
    } else {
      d.rasio_num = -1;
    }
    d.peminat_num = d.peminat_num || 0;
  });
  filtered = [...RAW];

  const provSet = [...new Set(RAW.map(d => d.provinsi))].sort();
  const bidangSet = [...new Set(RAW.map(d => d.bidang_ilmu))].sort();
  const jenjangSet = [...new Set(RAW.map(d => d.jenjang))].sort();

  provSet.forEach(p => {
    const o = document.createElement('option');
    o.value = p; o.textContent = p;
    selProv.appendChild(o);
  });
  bidangSet.forEach(b => {
    const o = document.createElement('option');
    o.value = b; o.textContent = b;
    selBidang.appendChild(o);
  });
  jenjangSet.forEach(j => {
    const o = document.createElement('option');
    o.value = j; o.textContent = j;
    selJenjang.appendChild(o);
  });

  selProv.addEventListener('change', () => {
    updateUniDropdown(selProv.value);
    applyFilters();
  });
  selUni.addEventListener('change', applyFilters);
  selBidang.addEventListener('change', applyFilters);
  selJenjang.addEventListener('change', applyFilters);
  document.getElementById('inp-search').addEventListener('input', applyFilters);

  updateUniDropdown('');
  applyFilters();
}

function updateUniDropdown(prov) {
  selUni.innerHTML = '<option value="">Semua PTN</option>';
  const unis = [...new Set(RAW.filter(d => !prov || d.provinsi === prov).map(d => d.universitas))].sort();
  unis.forEach(u => {
    const o = document.createElement('option');
    o.value = u; o.textContent = u;
    selUni.appendChild(o);
  });
}

function applyFilters() {
  const prov = selProv.value;
  const uni = selUni.value;
  const bidang = selBidang.value;
  const jenjang = selJenjang.value;
  const q = document.getElementById('inp-search').value.toLowerCase().trim();

  filtered = RAW.filter(d => {
    if (prov && d.provinsi !== prov) return false;
    if (uni && d.universitas !== uni) return false;
    if (bidang && d.bidang_ilmu !== bidang) return false;
    if (jenjang && d.jenjang !== jenjang) return false;
    if (q && !d.prodi.toLowerCase().includes(q) && !d.universitas.toLowerCase().includes(q)) return false;
    return true;
  });

  currentPage = 1;
  sortAndRender();
}

function sortBy(field) {
  if (sortField === field) sortDir *= -1;
  else { sortField = field; sortDir = field === 'peminat_num' || field === 'rasio_num' || field === 'daya_tampung' ? -1 : 1; }
  sortAndRender();
}

function sortAndRender() {
  filtered.sort((a, b) => {
    let va = a[sortField], vb = b[sortField];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return -1 * sortDir;
    if (va > vb) return 1 * sortDir;
    return 0;
  });
  renderStats();
  renderTable();
  renderPagination();
  updateSortIcons();
}

function renderStats() {
  const hasPeminat = filtered.filter(d => d.peminat_num > 0);
  document.getElementById('stat-total').textContent = filtered.length.toLocaleString('id');
  document.getElementById('stat-uni').textContent = new Set(filtered.map(d => d.universitas)).size.toLocaleString('id');
  document.getElementById('stat-dt').textContent = filtered.reduce((s, d) => s + (d.daya_tampung || 0), 0).toLocaleString('id');
  document.getElementById('stat-peminat').textContent = hasPeminat.reduce((s, d) => s + d.peminat_num, 0).toLocaleString('id');
}

function rasioLabel(rasio, rasio_num) {
  if (!rasio || rasio === 'Prodi baru/tidak ada data') return '<span class="badge badge-new">Prodi baru</span>';
  let cls = 'badge-low';
  if (rasio_num >= 15) cls = 'badge-hot';
  else if (rasio_num >= 5) cls = 'badge-mid';
  return `<span class="badge ${cls}">${rasio}</span>`;
}

function renderTable() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = filtered.slice(start, start + PAGE_SIZE);
  const tbody = document.getElementById('table-body');
  if (page.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:#999">Tidak ada data yang sesuai filter.</td></tr>';
    return;
  }
  tbody.innerHTML = page.map(d => `
    <tr>
      <td class="td-uni">${d.universitas}</td>
      <td class="td-prodi">
        ${d.situs ? `<a href="${d.situs}" target="_blank" rel="noopener">${d.prodi}</a>` : d.prodi}
      </td>
      <td>${d.bidang_ilmu}</td>
      <td>${d.jenjang}</td>
      <td class="td-num">${(d.daya_tampung || 0).toLocaleString('id')}</td>
      <td class="td-num">${d.peminat_num > 0 ? d.peminat_num.toLocaleString('id') : '<span style="color:#bbb">—</span>'}</td>
      <td class="td-rasio">${rasioLabel(d.rasio, d.rasio_num)}</td>
    </tr>
  `).join('');
}

function renderPagination() {
  const total = filtered.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, total);
  document.getElementById('page-info').textContent = total > 0 ? `Menampilkan ${start}–${end} dari ${total} prodi` : '';

  const wrap = document.getElementById('page-btns');
  wrap.innerHTML = '';

  const addBtn = (label, page, disabled, active) => {
    const b = document.createElement('button');
    b.className = 'page-btn' + (active ? ' active' : '');
    b.textContent = label;
    b.disabled = disabled;
    b.onclick = () => { currentPage = page; renderTable(); renderPagination(); window.scrollTo({top: 0, behavior: 'smooth'}); };
    wrap.appendChild(b);
  };

  addBtn('‹', currentPage - 1, currentPage === 1, false);

  let pagesToShow = [];
  if (pages <= 7) {
    pagesToShow = Array.from({length: pages}, (_, i) => i + 1);
  } else {
    pagesToShow = [1];
    if (currentPage > 3) pagesToShow.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(pages - 1, currentPage + 1); i++) pagesToShow.push(i);
    if (currentPage < pages - 2) pagesToShow.push('...');
    pagesToShow.push(pages);
  }

  pagesToShow.forEach(p => {
    if (p === '...') {
      const s = document.createElement('span');
      s.textContent = '…'; s.style.padding = '5px 4px'; s.style.color = '#999';
      wrap.appendChild(s);
    } else {
      addBtn(p, p, false, p === currentPage);
    }
  });

  addBtn('›', currentPage + 1, currentPage === pages, false);
}

function updateSortIcons() {
  document.querySelectorAll('thead th').forEach(th => {
    th.classList.remove('sorted');
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.textContent = '↕';
  });
  const active = document.getElementById('th-' + sortField);
  if (active) {
    active.classList.add('sorted');
    active.querySelector('.sort-icon').textContent = sortDir === 1 ? '↑' : '↓';
  }
}

function resetFilters() {
  selProv.value = '';
  updateUniDropdown('');
  selUni.value = '';
  selBidang.value = '';
  selJenjang.value = '';
  document.getElementById('inp-search').value = '';
  applyFilters();
}

fetch('data.json')
  .then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(init)
  .catch(err => {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#c00">Gagal memuat data: ${err.message}</td></tr>`;
  });
