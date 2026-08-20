let chartCategory = null;
let chartStatus   = null;
let chartValue    = null;
let chartAvgPrice = null;
let chartStacked  = null;
let chartTopValue = null;

let inventoryData = [];

window.onload = async function () {
    setTodayDate();
    await loadProfile();
    await loadInventory();
};

function setTodayDate() {
    const el = document.getElementById('todayDate');
    if (el) el.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

// Profile menu toggle
function toggleMenu() {
    const menu = document.getElementById('menu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}
document.addEventListener('click', function (e) {
    const profileDiv = document.querySelector('.profile');
    const menu = document.getElementById('menu');
    if (menu && profileDiv && !profileDiv.contains(e.target)) {
        menu.style.display = 'none';
    }
});

async function logout() {
    await fetch('api/logout.php');
    window.location.href = 'login.html';
}

async function loadProfile() {
    try {
        const res = await fetch('api/profile.php');
        if (res.status === 401) { window.location.href = 'login.html'; return; }
        const data = await res.json();
        if (!data.success) return;

        const u = data.data;
        document.getElementById('name').value    = u.name    || '';
        document.getElementById('email').value   = u.email   || '';
        document.getElementById('company').value = u.company || '';
        document.getElementById('role').value    = u.role    || '';
        document.getElementById('role2').textContent = u.role || 'User';

        const nameEl  = document.getElementById('user-display-name');
        const nameEl2 = document.getElementById('user-display-name2');
        if (nameEl)  nameEl.textContent  = u.name;
        if (nameEl2) nameEl2.textContent = u.name;

        if (u.profile_pic) document.getElementById('defaultPfp').src = u.profile_pic;
    } catch (err) { console.error('Profile load error:', err); }
}

async function loadInventory() {
    try {
        const res = await fetch('api/inventory.php');
        if (res.status === 401) { window.location.href = 'login.html'; return; }
        const data = await res.json();
        if (!data.success) { console.error(data.message); return; }

        inventoryData = data.data;
        renderInventoryTable(inventoryData);
        syncCategoryDropdown(inventoryData);
        renderDashboard(inventoryData);
    } catch (err) { console.error('Inventory load error:', err); }
}

function renderInventoryTable(items) {
    const tbody   = document.getElementById('invenTable');
    const noInven = document.getElementById('noInven');
    tbody.innerHTML = '';

    if (items.length === 0) {
        noInven.style.display = 'block';
        return;
    }
    noInven.style.display = 'none';

    items.forEach(item => {
        tbody.innerHTML += `
            <tr id="row-${item.id}" data-id="${item.id}">
                <td>${item.id}</td>
                <td>${escHtml(item.product_name)}</td>
                <td>${escHtml(item.category)}</td>
                <td class="qty">${item.quantity}</td>
                <td class="price">₹${parseFloat(item.unit_price).toFixed(2)}</td>
                <td class="total">₹${parseFloat(item.total_value).toFixed(2)}</td>
                <td class="status">${getStatusBadge(item.stock_status)}</td>
            </tr>`;
    });
}

function getStatusBadge(status) {
    if (status === 'Out of Stock') return '<span class="badge bg-danger">Out of Stock</span>';
    if (status === 'Low Stock')    return '<span class="badge bg-warning text-dark">Low Stock</span>';
    return '<span class="badge bg-success">In Stock</span>';
}

function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

document.getElementById('searchBar').addEventListener('input', function () {
    const val = this.value.trim();
    if (!val) return;
    const id  = parseInt(val);
    if (isNaN(id)) return;
    const found = inventoryData.find(i => i.id === id);
    const row   = document.getElementById('row-' + id);
    if (row && found) {
        row.style.outline = '2px solid #079fce';
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { row.style.outline = ''; }, 5000);
    } else {
        showToast('Product ID not found!', 'error');
    }
});

function renderDashboard(items) {
    const total   = items.length;
    const inStock = items.filter(i => i.stock_status === 'In Stock').length;
    const low     = items.filter(i => i.stock_status === 'Low Stock').length;
    const out     = items.filter(i => i.stock_status === 'Out of Stock').length;

    document.getElementById('stat-total').textContent   = total;
    document.getElementById('stat-instock').textContent = inStock;
    document.getElementById('stat-low').textContent     = low;
    document.getElementById('stat-out').textContent     = out;

    const catMap    = {};
    const valueMap  = {};
    const priceMap  = {};
    const countMap  = {};
    const healthMap = {};

    items.forEach(i => {
        const cat = i.category;
        catMap[cat]   = (catMap[cat]   || 0) + parseInt(i.quantity);
        valueMap[cat] = (valueMap[cat] || 0) + parseFloat(i.total_value);
        priceMap[cat] = (priceMap[cat] || 0) + parseFloat(i.unit_price);
        countMap[cat] = (countMap[cat] || 0) + 1;
        if (!healthMap[cat]) healthMap[cat] = { in: 0, low: 0, out: 0 };
        if (i.stock_status === 'In Stock')       healthMap[cat].in++;
        else if (i.stock_status === 'Low Stock') healthMap[cat].low++;
        else                                     healthMap[cat].out++;
    });

    const cats         = Object.keys(catMap);
    const catQtys      = cats.map(c => catMap[c]);
    const catValues    = cats.map(c => parseFloat(valueMap[c].toFixed(2)));
    const catAvgPrices = cats.map(c => parseFloat((priceMap[c] / countMap[c]).toFixed(2)));
    const palette      = ['#0ea5e9','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];

    renderBar('categoryChart', cats, catQtys, palette, 'Quantity', chartCategory, c => chartCategory = c);

    renderDoughnut('statusChart',
        ['In Stock', 'Low Stock', 'Out of Stock'],
        [inStock, low, out],
        ['#22c55e', '#f59e0b', '#ef4444'],
        chartStatus, c => chartStatus = c
    );

    renderHBar('valueChart', cats, catValues, palette, 'Total Value (₹)', chartValue, c => chartValue = c);

    renderBar('avgPriceChart', cats, catAvgPrices, palette, 'Avg Price (₹)', chartAvgPrice, c => chartAvgPrice = c);

    renderStacked('stackedChart', cats, healthMap, chartStacked, c => chartStacked = c);

    const top10 = [...items].sort((a, b) => parseFloat(b.total_value) - parseFloat(a.total_value)).slice(0, 10);
    renderHBar('topValueChart', top10.map(i => i.product_name), top10.map(i => parseFloat(i.total_value)),
        palette, 'Total Value (₹)', chartTopValue, c => chartTopValue = c);
}

function destroyChart(chart) { if (chart) chart.destroy(); }

function renderBar(canvasId, labels, data, colors, label, existing, setter) {
    destroyChart(existing);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    setter(new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label,
                data,
                backgroundColor: colors.slice(0, labels.length).map(c => c + 'cc'),
                borderColor:     colors.slice(0, labels.length),
                borderWidth: 1.5,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
                x: { grid: { display: false }, ticks: { font: { size: 11 } } }
            }
        }
    }));
}

function renderHBar(canvasId, labels, data, colors, label, existing, setter) {
    destroyChart(existing);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    setter(new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label,
                data,
                backgroundColor: colors.slice(0, labels.length).map(c => c + 'cc'),
                borderColor:     colors.slice(0, labels.length),
                borderWidth: 1.5,
                borderRadius: 6,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
                y: { grid: { display: false }, ticks: { font: { size: 11 } } }
            }
        }
    }));
}

function renderDoughnut(canvasId, labels, data, colors, existing, setter) {
    destroyChart(existing);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    setter(new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.map(c => c + 'cc'),
                borderColor:     colors,
                borderWidth: 2,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 }, padding: 14, usePointStyle: true }
                }
            }
        }
    }));
}

function renderStacked(canvasId, cats, healthMap, existing, setter) {
    destroyChart(existing);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    setter(new Chart(ctx, {
        type: 'bar',
        data: {
            labels: cats,
            datasets: [
                {
                    label: 'In Stock',
                    data: cats.map(c => healthMap[c].in),
                    backgroundColor: '#22c55ecc',
                    borderColor: '#22c55e',
                    borderWidth: 1.5,
                    borderRadius: 4,
                },
                {
                    label: 'Low Stock',
                    data: cats.map(c => healthMap[c].low),
                    backgroundColor: '#f59e0bcc',
                    borderColor: '#f59e0b',
                    borderWidth: 1.5,
                    borderRadius: 4,
                },
                {
                    label: 'Out of Stock',
                    data: cats.map(c => healthMap[c].out),
                    backgroundColor: '#ef4444cc',
                    borderColor: '#ef4444',
                    borderWidth: 1.5,
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 }, padding: 12, usePointStyle: true }
                }
            },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 } } },
                y: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } }
            }
        }
    }));
}

let toastTimer = null;
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon  = type === 'success' ? '✓' : '✕';
    toast.innerHTML  = `<span>${icon}</span><span>${message}</span>`;
    toast.className  = `toast ${type}`;
    toast.style.display = 'flex';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3200);
}

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
    });
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
});

// Add item
function openAddModal() {
    document.getElementById('addForm').reset();
    document.getElementById('add-custom-cat-wrap').style.display = 'none';
    openModal('addModal');
    document.getElementById('add-name').focus();
}

document.getElementById('add-category').addEventListener('change', function () {
    document.getElementById('add-custom-cat-wrap').style.display = this.value === 'Other' ? 'block' : 'none';
});

async function submitAddForm(e) {
    e.preventDefault();
    const btn = document.getElementById('addSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding…';

    let category = document.getElementById('add-category').value;
    if (category === 'Other' || category === '') category = document.getElementById('add-custom-cat').value.trim();
    if (!category) { showToast('Please enter a category.', 'error'); btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Item'; return; }

    const formData = new FormData();
    formData.append('action',       'add');
    formData.append('product_name', document.getElementById('add-name').value.trim());
    formData.append('category',     category);
    formData.append('quantity',     parseInt(document.getElementById('add-qty').value));
    formData.append('unit_price',   parseFloat(document.getElementById('add-price').value));

    try {
        const res  = await fetch('api/inventory.php', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) { closeModal('addModal'); showToast('Item added successfully!', 'success'); await loadInventory(); }
        else showToast(data.message || 'Failed to add item.', 'error');
    } catch (err) { showToast('Server error. Is XAMPP running?', 'error'); }

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Item';
}

// Edit item
function openEditModal() {
    document.getElementById('edit-search-id').value = '';
    document.getElementById('editFormFields').style.display = 'none';
    openModal('editModal');
    document.getElementById('edit-search-id').focus();
}

function loadEditItem() {
    const id   = parseInt(document.getElementById('edit-search-id').value);
    const item = inventoryData.find(i => i.id === id);
    if (!item) { showToast('Product ID not found!', 'error'); return; }

    document.getElementById('edit-id').value       = item.id;
    document.getElementById('edit-name').value     = item.product_name;
    document.getElementById('edit-category').value = item.category;
    document.getElementById('edit-qty').value      = item.quantity;
    document.getElementById('edit-price').value    = parseFloat(item.unit_price).toFixed(2);
    document.getElementById('editFormFields').style.display = 'block';
    document.getElementById('edit-name').focus();
}

async function submitEditForm(e) {
    e.preventDefault();
    const btn = document.getElementById('editSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

    const formData = new FormData();
    formData.append('action',       'edit');
    formData.append('id',           document.getElementById('edit-id').value);
    formData.append('product_name', document.getElementById('edit-name').value.trim());
    formData.append('category',     document.getElementById('edit-category').value.trim());
    formData.append('quantity',     parseInt(document.getElementById('edit-qty').value));
    formData.append('unit_price',   parseFloat(document.getElementById('edit-price').value));

    try {
        const res  = await fetch('api/inventory.php', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) { closeModal('editModal'); showToast('Item updated!', 'success'); await loadInventory(); }
        else showToast(data.message || 'Update failed.', 'error');
    } catch (err) { showToast('Server error. Is XAMPP running?', 'error'); }

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
}

// Delete item
function openDeleteModal() {
    document.getElementById('del-id').value = '';
    document.getElementById('del-preview').style.display  = 'none';
    document.getElementById('delSubmitBtn').style.display = 'none';
    openModal('deleteModal');
    document.getElementById('del-id').focus();
}

function previewDeleteItem() {
    const id   = parseInt(document.getElementById('del-id').value);
    const item = inventoryData.find(i => i.id === id);
    if (!item) { showToast('Product ID not found!', 'error'); return; }

    document.getElementById('del-preview-name').textContent = `🗑 ${item.product_name}`;
    document.getElementById('del-preview-info').textContent =
        `Category: ${item.category} • Qty: ${item.quantity} • ₹${parseFloat(item.unit_price).toFixed(2)} each`;
    document.getElementById('del-preview').style.display  = 'block';
    document.getElementById('delSubmitBtn').style.display = 'inline-flex';
}

async function submitDeleteForm() {
    const id   = parseInt(document.getElementById('del-id').value);
    const item = inventoryData.find(i => i.id === id);
    if (!item) { showToast('Product ID not found!', 'error'); return; }

    const btn = document.getElementById('delSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting…';

    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('id',     id);

    try {
        const res  = await fetch('api/inventory.php', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) { closeModal('deleteModal'); showToast(`"${item.product_name}" deleted.`, 'success'); await loadInventory(); }
        else showToast(data.message || 'Delete failed.', 'error');
    } catch (err) { showToast('Server error. Is XAMPP running?', 'error'); }

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete';
}

// Reports
function openReport() {
    const selected      = document.getElementById('select').value;
    const selectedStock = document.getElementById('stockSelect').value;

    const filtered = inventoryData.filter(item => {
        const catMatch   = selected === 'ALL'      || item.category     === selected;
        const stockMatch = selectedStock === 'ALL' || item.stock_status === selectedStock;
        return catMatch && stockMatch;
    });

    const tableR = document.getElementById('repoTable');
    tableR.innerHTML = '';
    filtered.forEach(item => {
        tableR.innerHTML += `
            <tr>
                <td>${item.id}</td>
                <td>${escHtml(item.product_name)}</td>
                <td>${escHtml(item.category)}</td>
                <td>${item.quantity}</td>
                <td>₹${parseFloat(item.unit_price).toFixed(2)}</td>
                <td>₹${parseFloat(item.total_value).toFixed(2)}</td>
                <td>${getStatusBadge(item.stock_status)}</td>
            </tr>`;
    });
}

function syncCategoryDropdown(items) {
    const select = document.getElementById('select');
    while (select.options.length > 1) select.remove(1);
    [...new Set(items.map(i => i.category))].forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat; opt.text = cat;
        select.appendChild(opt);
    });
}

// Settings
function edit() {
    ['name', 'email', 'company', 'role'].forEach(id => document.getElementById(id).removeAttribute('readonly'));
}

async function save() {
    const name    = document.getElementById('name').value.trim();
    const email   = document.getElementById('email').value.trim();
    const company = document.getElementById('company').value.trim();
    const role    = document.getElementById('role').value.trim();

    ['name', 'email', 'company', 'role'].forEach(id => document.getElementById(id).setAttribute('readonly', true));

    const formData = new FormData();
    formData.append('name', name); formData.append('email', email);
    formData.append('company', company); formData.append('role', role);

    try {
        const res  = await fetch('api/profile.php', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            document.getElementById('role2').textContent = role;
            const nameEl  = document.getElementById('user-display-name');
            const nameEl2 = document.getElementById('user-display-name2');
            if (nameEl)  nameEl.textContent  = name;
            if (nameEl2) nameEl2.textContent = name;
            showToast('Profile saved!', 'success');
        } else showToast(data.message || 'Save failed.', 'error');
    } catch (err) { showToast('Server error.', 'error'); }
}

function changePfp() { document.getElementById('imageUpload').click(); }

document.getElementById('imageUpload').addEventListener('change', async function () {
    const file = this.files[0];
    if (!file) return;
    document.getElementById('defaultPfp').src = URL.createObjectURL(file);
    const formData = new FormData();
    formData.append('profile_pic', file);
    try {
        const res  = await fetch('api/upload_pfp.php', { method: 'POST', body: formData });
        const data = await res.json();
        if (!data.success) showToast('Upload failed: ' + data.message, 'error');
        else showToast('Profile picture updated!', 'success');
    } catch (err) { showToast('Server error during upload.', 'error'); }
});

// Sidebar navigation
const dashlink = document.getElementById('dashboard');
const dashSec  = document.getElementById('dash-sec');
const invenlink = document.getElementById('inven');
const invenSec  = document.getElementById('inven-sec');
const repolink  = document.getElementById('report');
const repoSec   = document.getElementById('repo-sec');
const settlink  = document.getElementById('setting');
const settSec   = document.getElementById('sett-sec');

function removeBackColor() {
    [dashlink, invenlink, repolink, settlink].forEach(el => {
        el.style.backgroundColor = '';
        el.style.color           = 'black';
        el.style.boxShadow       = '';
    });
}
function setActiveLink(el) {
    removeBackColor();
    el.style.backgroundColor = 'rgb(84, 205, 253)';
    el.style.boxShadow       = '0 4px 10px rgba(255,255,255,0.3),0 0 8px rgba(55,223,245,0.4),0 0 16px rgba(20,114,209,0.4)';
    el.style.color           = 'white';
}
function showSection(show, ...hide) {
    show.style.display = 'block';
    hide.forEach(s => s.style.display = 'none');
}

invenlink.addEventListener('click', e => { e.preventDefault(); setActiveLink(invenlink); showSection(invenSec, dashSec, repoSec, settSec); });
dashlink.addEventListener('click',  e => { e.preventDefault(); setActiveLink(dashlink);  showSection(dashSec, invenSec, repoSec, settSec); });
repolink.addEventListener('click',  e => { e.preventDefault(); setActiveLink(repolink);  showSection(repoSec, dashSec, invenSec, settSec); openReport(); });
settlink.addEventListener('click',  e => { e.preventDefault(); setActiveLink(settlink);  showSection(settSec, dashSec, invenSec, repoSec); });

function profile() {
    setActiveLink(settlink);
    showSection(settSec, dashSec, invenSec, repoSec);
}