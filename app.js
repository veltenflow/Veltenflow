// Supabase Configuration
const SUPABASE_URL = 'https://ehtdmfpubjupdxeuoqsc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0WMzOxZ88SpifDg11-xZwA_TFrQkBx-';

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let apps = [];
let currentUploadedIcon = "";
let isAdmin = false;
let editingAppId = null;

// DOM Elements
const appGrid = document.getElementById('appGrid');
const appSearch = document.getElementById('appSearch');
const openUpload = document.getElementById('openUpload');
const modalOverlay = document.getElementById('modalOverlay');
const closeModal = document.getElementById('closeModal');
const uploadForm = document.getElementById('uploadForm');
const appIconFile = document.getElementById('appIconFile');
const iconPreview = document.getElementById('iconPreview');
const loginBtn = document.getElementById('loginBtn');
const loginStatus = document.getElementById('loginStatus');

// --- DATABASE FUNCTIONS ---

async function fetchApps() {
    if (!supabase) return;
    const { data, error } = await supabase
        .from('apps')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching apps:', error);
    } else {
        apps = data;
        renderApps();
    }
}

async function saveApp(appData) {
    if (!supabase) {
        // Fallback for demo if no supabase keys
        appData.id = Date.now();
        apps.unshift(appData);
        renderApps();
        return;
    }

    const { data, error } = await supabase
        .from('apps')
        .upsert([appData])
        .select();

    if (error) {
        alert('Error saving app: ' + error.message);
    } else {
        fetchApps();
    }
}

async function deleteAppFromDB(id) {
    if (!supabase) {
        apps = apps.filter(app => app.id !== id);
        renderApps();
        return;
    }

    const { error } = await supabase
        .from('apps')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Error deleting app: ' + error.message);
    } else {
        fetchApps();
    }
}

// --- UI LOGIC ---

// Admin Login Logic
loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!isAdmin) {
        const password = prompt("Enter Admin Password:");
        if (password === "admin") {
            isAdmin = true;
            loginStatus.innerText = "Admin On";
            loginBtn.classList.add('active');
            openUpload.style.display = 'flex';
            renderApps();
            alert("Welcome Admin! You can now add, edit, or delete apps.");
        } else {
            alert("Incorrect Password!");
        }
    } else {
        isAdmin = false;
        loginStatus.innerText = "Login";
        loginBtn.classList.remove('active');
        openUpload.style.display = 'none';
        renderApps();
    }
});

// Handle Icon Selection
iconPreview.addEventListener('click', () => appIconFile.click());

appIconFile.addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
        // Validation: Keep it under 1MB for direct DB storage or use URL
        if (file.size > 1024 * 1024) {
            alert("Icon file too large! Please use an image under 1MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            currentUploadedIcon = e.target.result;
            iconPreview.innerHTML = `<img src="${currentUploadedIcon}" alt="Preview">`;
        }
        reader.readAsDataURL(file);
    }
});

// Render Apps
function renderApps(filteredApps = apps) {
    appGrid.innerHTML = filteredApps.map(app => `
        <div class="app-card glass">
            <img src="${app.icon || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + app.id}" alt="${app.name}" class="app-icon">
            <div class="app-info">
                <h3>${app.name}</h3>
                <div class="app-meta">
                    <span><i class="fas fa-tag"></i> ${app.version}</span>
                    <span><i class="fas fa-database"></i> ${app.size || 'N/A'}</span>
                </div>
            </div>
            <a href="${app.url}" target="_blank" class="download-btn">
                <i class="fas fa-download"></i> Download APK
            </a>
            <div class="admin-controls" style="display: ${isAdmin ? 'flex' : 'none'}">
                <button class="edit-btn" onclick="editApp(${app.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="delete-btn" onclick="deleteApp(${app.id})"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `).join('');
}

// Delete App Action
window.deleteApp = (id) => {
    if (confirm("Are you sure you want to delete this app?")) {
        deleteAppFromDB(id);
    }
};

// Edit App Action
window.editApp = (id) => {
    const app = apps.find(a => a.id === id);
    if (app) {
        editingAppId = id;
        document.getElementById('appName').value = app.name;
        document.getElementById('appVersion').value = app.version;
        document.getElementById('apkUrl').value = app.url;
        currentUploadedIcon = app.icon;
        iconPreview.innerHTML = app.icon ? `<img src="${app.icon}" alt="Preview">` : `<i class="fas fa-camera"></i><span>Select Icon</span>`;
        modalOverlay.style.display = 'flex';
        document.querySelector('.modal h2').innerText = "Edit APK";
    }
};

// Search Logic
appSearch.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = apps.filter(app =>
        app.name.toLowerCase().includes(term)
    );
    renderApps(filtered);
});

// Modal UI Logic
openUpload.addEventListener('click', () => {
    editingAppId = null;
    uploadForm.reset();
    currentUploadedIcon = "";
    iconPreview.innerHTML = `<i class="fas fa-camera"></i><span>Select Icon</span>`;
    document.querySelector('.modal h2').innerText = "Add New APK";
    modalOverlay.style.display = 'flex';
});

closeModal.addEventListener('click', () => {
    modalOverlay.style.display = 'none';
});

// Helper to convert GDrive view link to direct download link
function formatGDriveLink(url) {
    const driveRegex = /drive\.google\.com\/file\/d\/([^\/\?]+)/;
    const match = url.match(driveRegex);
    if (match && match[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
    return url;
}

// Form Submission (Add or Update)
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let rawUrl = document.getElementById('apkUrl').value;
    const appData = {
        name: document.getElementById('appName').value,
        version: document.getElementById('appVersion').value,
        url: formatGDriveLink(rawUrl),
        icon: currentUploadedIcon,
        size: "APK Hub",
        category: "User Uploaded"
    };

    if (editingAppId) {
        appData.id = editingAppId;
    }

    await saveApp(appData);

    modalOverlay.style.display = 'none';
    uploadForm.reset();
    currentUploadedIcon = "";
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Initial Fetch
if (supabase) {
    fetchApps();
} else {
    renderApps(); // Initialize empty grid if no DB
}
