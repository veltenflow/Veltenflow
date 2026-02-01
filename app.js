// Supabase Configuration
const SUPABASE_URL = 'https://ehtdmfpubjupdxeuoqsc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0WMzOxZ88SpifDg11-xZwA_TFrQkBx-';

let sbClient = null;
try {
    if (window.supabase) {
        sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.error("Supabase Error:", e);
}

let apps = [];
let currentUploadedIcon = "";
let isAdmin = false;
let editingAppId = null;

// DOM Elements
const appGrid = document.getElementById('appGrid');
const searchGrid = document.getElementById('searchGrid');
const appSearchMobile = document.getElementById('appSearchMobile');
const openUpload = document.getElementById('openUpload');
const modalOverlay = document.getElementById('modalOverlay');
const closeModal = document.getElementById('closeModal');
const uploadForm = document.getElementById('uploadForm');
const appIconFile = document.getElementById('appIconFile');
const iconPreview = document.getElementById('iconPreview');
const loginBtn = document.getElementById('loginBtn');
const loginStatus = document.getElementById('loginStatus');
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const loginModalOverlay = document.getElementById('loginModalOverlay');
const closeLoginModal = document.getElementById('closeLoginModal');
const submitLogin = document.getElementById('submitLogin');
const adminPassInput = document.getElementById('adminPass');
const tabIndicator = document.getElementById('tabIndicator');
const toast = document.getElementById('toast');

// --- UTILS ---

function showToast(message) {
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- DATABASE FUNCTIONS ---

async function fetchApps() {
    // Show Skeletons
    appGrid.innerHTML = Array(4).fill(0).map(() => `<div class="skeleton-card skeleton"></div>`).join('');

    if (!sbClient) {
        apps = [];
        renderApps();
        return;
    }
    const { data, error } = await sbClient
        .from('apps')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        showToast("Error loading apps");
    } else {
        apps = data;
        renderApps();
    }
}

async function saveApp(appData) {
    if (!sbClient) return;
    const { error } = await sbClient.from('apps').upsert([appData]);
    if (error) {
        showToast("Save failed");
    } else {
        showToast(editingAppId ? "App updated" : "App published");
        fetchApps();
    }
}

async function deleteAppFromDB(id) {
    if (!sbClient) return;
    const { error } = await sbClient.from('apps').delete().eq('id', id);
    if (error) {
        showToast("Delete failed");
    } else {
        showToast("App deleted");
        fetchApps();
    }
}

// --- UI LOGIC ---

// Tab Switching
navItems.forEach((item, index) => {
    item.addEventListener('click', (e) => {
        if (item.id === 'loginBtn') return;
        e.preventDefault();
        const tabId = item.getAttribute('data-tab');

        // Move Indicator
        tabIndicator.style.transform = `translateX(${index * 100}%)`;

        // Update Classes
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Show Content
        tabContents.forEach(content => {
            content.style.display = content.id === tabId ? 'block' : 'none';
        });

        if (tabId === 'searchSection') renderSearchApps();
    });
});

// Admin Login
if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!isAdmin) {
            loginModalOverlay.style.display = 'flex';
            adminPassInput.focus();
        } else {
            isAdmin = false;
            loginStatus.innerText = "Login";
            loginBtn.classList.remove('active');
            openUpload.style.display = 'none';
            showToast("Admin logged out");
            renderApps();
            if (tabContents[1].style.display !== 'none') renderSearchApps();
        }
    });
}

closeLoginModal.addEventListener('click', () => {
    loginModalOverlay.style.display = 'none';
    adminPassInput.value = "";
});

submitLogin.addEventListener('click', () => {
    if (adminPassInput.value === "admin") {
        isAdmin = true;
        loginStatus.innerText = "Admin Info";
        loginBtn.classList.add('active');
        openUpload.style.display = 'flex';
        loginModalOverlay.style.display = 'none';
        adminPassInput.value = "";
        showToast("Welcome Admin!");
        renderApps();
        if (tabContents[1].style.display !== 'none') renderSearchApps();
    } else {
        showToast("Wrong password!");
    }
});

adminPassInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitLogin.click();
});

// Icon logic
iconPreview.addEventListener('click', () => appIconFile.click());
appIconFile.addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentUploadedIcon = e.target.result;
            iconPreview.innerHTML = `<img src="${currentUploadedIcon}" alt="Icon">`;
        };
        reader.readAsDataURL(file);
    }
});

// App Card Template
function createAppCard(app) {
    return `
        <div class="app-card glass">
            <img src="${app.icon || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + app.id}" class="app-icon">
            <div class="app-info">
                <h3>${app.name}</h3>
                <div class="app-meta">
                    <span>${app.version}</span>
                </div>
            </div>
            <a href="${app.url}" target="_blank" class="download-btn">Download</a>
            <div class="admin-controls" style="display: ${isAdmin ? 'flex' : 'none'}">
                <button class="edit-btn" onclick="editApp(${app.id})"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" onclick="deleteApp(${app.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `;
}

function renderApps() { appGrid.innerHTML = apps.map(createAppCard).join(''); }
function renderSearchApps(filtered = apps) { if (searchGrid) searchGrid.innerHTML = filtered.map(createAppCard).join(''); }

window.deleteApp = (id) => { if (confirm("Delete app?")) deleteAppFromDB(id); };

window.editApp = (id) => {
    const app = apps.find(a => a.id === id);
    if (app) {
        editingAppId = id;
        document.getElementById('appName').value = app.name;
        document.getElementById('appVersion').value = app.version;
        document.getElementById('apkUrl').value = app.url;
        currentUploadedIcon = app.icon;
        iconPreview.innerHTML = app.icon ? `<img src="${app.icon}" alt="Icon">` : `<i class="fas fa-camera"></i>`;
        modalOverlay.style.display = 'flex';
    }
};

appSearchMobile.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    renderSearchApps(apps.filter(app => app.name.toLowerCase().includes(term)));
});

openUpload.addEventListener('click', () => {
    editingAppId = null;
    uploadForm.reset();
    currentUploadedIcon = "";
    iconPreview.innerHTML = `<i class="fas fa-camera"></i>`;
    modalOverlay.style.display = 'flex';
});

closeModal.addEventListener('click', () => modalOverlay.style.display = 'none');

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const appData = {
        name: document.getElementById('appName').value,
        version: document.getElementById('appVersion').value,
        url: document.getElementById('apkUrl').value,
        icon: currentUploadedIcon,
    };
    if (editingAppId) appData.id = editingAppId;
    await saveApp(appData);
    modalOverlay.style.display = 'none';
});

fetchApps();
