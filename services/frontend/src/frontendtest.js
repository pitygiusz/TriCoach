// All API calls go to the same origin (port 8080).
// The frontend server proxies /api/* to the gateway (port 3000) server-side,
// so the browser never makes a cross-origin request.

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const postsContainer      = document.getElementById('postsContainer');
const menuPanel           = document.getElementById('menuPanel');
const hamburgerBtn        = document.getElementById('hamburgerBtn');
const newPostBtn          = document.getElementById('newPostBtn');
const draftsBtn           = document.getElementById('draftsBtn');
const settingsBtn         = document.getElementById('settingsBtn');
const toggle              = document.getElementById('toggle');
const profileBtn          = document.getElementById('profileBtn');
const overlay             = document.getElementById('overlay');

// Create-post modal
const createPostModal     = document.getElementById('createPostModal');
const openCreatePostBtn   = document.getElementById('openCreatePostBtn');
const closePostModalBtn   = document.getElementById('closePostModalBtn');
const workoutSelect       = document.getElementById('workoutSelect');
const submitPostBtn       = document.getElementById('submitPostBtn');
const postContentInput    = document.getElementById('postContentInput');

// Create-training modal
const createTrainingModal  = document.getElementById('createTrainingModal');
const openCreateTrainingBtn= document.getElementById('openCreateTrainingBtn');
const closeTrainingModalBtn= document.getElementById('closeTrainingModalBtn');
const trainingType         = document.getElementById('trainingType');
const trainingDuration     = document.getElementById('trainingDuration');
const trainingDistance     = document.getElementById('trainingDistance');
const submitTrainingBtn    = document.getElementById('submitTrainingBtn');

// ─── Firebase Auth (Compat SDK loaded via <script> tags) ─────────────────────
// Initialize Firebase with config injected by the server
(function initFirebase() {
  try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
      const config = window.__FIREBASE_CONFIG__;
      if (config && config.apiKey) {
        firebase.initializeApp(config);
        console.log('🔥 Firebase initialized');
      } else {
        console.warn('🔥 Firebase config missing or incomplete', config);
      }
    } else if (typeof firebase === 'undefined') {
      console.warn('🔥 Firebase SDK not loaded');
    }
  } catch (e) {
    console.warn('🔥 Firebase init error:', e.message);
  }
})();

// ─── Firebase Auth (Compat SDK loaded via <script> tags) ─────────────────────
function isFirebaseReady() {
  try {
    return typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0;
  } catch (e) {
    return false;
  }
}

// Helper to get current token for API calls
async function getAuthHeaders() {
  if (isFirebaseReady()) {
    try {
      const user = firebase.auth().currentUser;
      if (user) {
        const token = await user.getIdToken();
        sessionStorage.setItem('firebaseToken', token);
        sessionStorage.setItem('firebaseUid', user.uid);
        sessionStorage.setItem('firebaseDisplayName', user.displayName || user.email);
        sessionStorage.setItem('firebaseEmail', user.email);
        return { 'Authorization': `Bearer ${token}` };
      }
    } catch (e) {
      // Firebase call failed – fallback to sessionStorage
    }
  }
  const token = sessionStorage.getItem('firebaseToken');
  if (!token) return {};
  return { 'Authorization': `Bearer ${token}` };
}

window.loginUser = async function loginUser() {
  const email = prompt('Email:') || 'test@example.com';
  const password = prompt('Password:') || 'test123';

  if (!isFirebaseReady()) {
    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`${response.status}: ${body}`);
      }
      const result = await response.json();
      sessionStorage.setItem('firebaseToken', result.token);
      sessionStorage.setItem('firebaseUid', result.user.uid);
      sessionStorage.setItem('firebaseDisplayName', result.user.username || result.user.email);
      sessionStorage.setItem('firebaseEmail', result.user.email);
      alert(`Logged in as ${result.user.email} (Backend Fallback)`);
      location.reload();
    } catch (e) {
      alert(`Login failed (Backend Fallback): ${e.message}`);
    }
    return;
  }

  try {
    const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
    await getAuthHeaders();
    alert(`Logged in as ${cred.user.email}`);
    location.reload();
  } catch (e) {
    alert(`Login failed: ${e.message}`);
  }
};

window.registerUser = async function registerUser() {
  const email = prompt('Email:') || 'newuser@example.com';
  const password = prompt('Password:') || 'test123';
  const displayName = prompt('Display name:') || 'New User';

  if (!isFirebaseReady()) {
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: displayName, email, password }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`${response.status}: ${body}`);
      }
      const result = await response.json();
      alert(`Registered as ${result.user.email} successfully! Please log in.`);
      location.reload();
    } catch (e) {
      alert(`Registration failed (Backend Fallback): ${e.message}`);
    }
    return;
  }

  try {
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName });
    await getAuthHeaders();
    alert(`Registered as ${email}`);
    location.reload();
  } catch (e) {
    alert(`Registration failed: ${e.message}`);
  }
};

window.logoutUser = async function logoutUser() {
  if (!isFirebaseReady()) {
    sessionStorage.clear();
    location.reload();
    return;
  }
  try {
    await firebase.auth().signOut();
    sessionStorage.clear();
    location.reload();
  } catch (e) {
    alert(`Logout failed: ${e.message}`);
  }
};

// Listen for auth state changes (only if Firebase loaded)
if (isFirebaseReady()) {
  try {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        console.log('🔥 Auth: logged in as', user.email);
        document.body.classList.add('authenticated');
        document.body.dataset.uid = user.uid;
        document.body.dataset.displayName = user.displayName || user.email;
        sessionStorage.setItem('firebaseUid', user.uid);
        sessionStorage.setItem('firebaseDisplayName', user.displayName || user.email);
        sessionStorage.setItem('firebaseEmail', user.email);
      } else {
        console.log('🔥 Auth: signed out');
        document.body.classList.remove('authenticated');
        delete document.body.dataset.uid;
        delete document.body.dataset.displayName;
        sessionStorage.clear();
      }
      updateProfileSidebar();
    });
  } catch (e) {
    console.warn('Firebase onAuthStateChanged failed');
  }
} else {
  console.warn('Firebase not available – running with sessionStorage only');
}

// ─── Current user from session ────────────────────────────────────────────────
function getCurrentUserId() {
  return sessionStorage.getItem('firebaseUid') || 
         document.body.dataset.uid || 
         'user_janedoe_47';
}

function getCurrentDisplayName() {
  return sessionStorage.getItem('firebaseDisplayName') || 
         document.body.dataset.displayName || 
         'Jane Doe';
}

// ─── All API calls ────────────────────────────────────────────────────────────
// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'just now';
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

async function makeApiRequest(method, endpoint, data = null) {
  const authHeaders = await getAuthHeaders();
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders },
  };
  if (data) opts.body = JSON.stringify(data);

  const res = await fetch(endpoint, opts);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

// ─── Feed ─────────────────────────────────────────────────────────────────────
function createPostCard(post) {
  const card = document.createElement('article');
  card.className = 'post-card';
  const author = post.userId || 'Anonymous';
  card.innerHTML = `
    <header>
      <img class="avatar" src="https://i.pravatar.cc/48?u=${encodeURIComponent(author)}" alt="${author}" />
      <div class="post-author">
        <strong>${author}</strong>
        <span>${formatTimeAgo(post.createdAt)}</span>
      </div>
    </header>
    <h3>${post.trainingId ? '🏃 Training update' : 'New post'}</h3>
    <p>${post.content || ''}</p>
    <div class="post-meta">
      <span>${post.likes || 0} likes</span>
      ${post.trainingId ? '<span>Training attached</span>' : ''}
    </div>
  `;
  return card;
}

function renderPosts(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    postsContainer.innerHTML = '<div class="empty-state">No posts yet — log a training and share it!</div>';
    return;
  }
  postsContainer.innerHTML = '';
  posts.forEach(p => postsContainer.appendChild(createPostCard(p)));
}

// ─── Load posts on startup with timeout ───────────────────────────────────────
// Use a race with AbortController so the UI doesn't hang forever
async function loadPosts() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    const res = await fetch('/api/posts', {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${res.status}: ${body}`);
    }
    const data = await res.json();
    renderPosts(data);
  } catch (err) {
    clearTimeout(timeout);
    // Show the empty state instead of an error so the page is usable
    postsContainer.innerHTML = '<div class="empty-state">No posts yet — log a training and share it!</div>';
    console.warn('loadPosts:', err.message);
  }
}

// ─── Workouts dropdown ────────────────────────────────────────────────────────
async function fetchWorkouts() {
  workoutSelect.innerHTML = '<option value="">Loading…</option>';
  try {
    const result = await makeApiRequest('GET', `/api/workouts/${getCurrentUserId()}`);
    workoutSelect.innerHTML = '<option value="">— Attach a training (optional) —</option>';

    if (!result.workouts?.length) {
      workoutSelect.innerHTML = '<option value="">No trainings logged yet</option>';
      return;
    }
    result.workouts.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      const km = parseFloat(w.distance_km) || 0;
      opt.textContent = `${w.type} · ${w.duration_minutes} min · ${km.toFixed(2)} km`;
      workoutSelect.appendChild(opt);
    });
  } catch (err) {
    workoutSelect.innerHTML = '<option value="">Failed to load trainings</option>';
  }
}

// ─── Sidebar & menu ───────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebarHid').classList.toggle('open');
  overlay.classList.toggle('visible');
}

function openMenu() {
  menuPanel.classList.toggle('hidden');
}

toggle.addEventListener('click', toggleSidebar);
overlay?.addEventListener('click', toggleSidebar);
hamburgerBtn.addEventListener('click', openMenu);
profileBtn.addEventListener('click', () => { window.location.href = 'profile.html'; });

newPostBtn.addEventListener('click',  () => { createPostModal.classList.remove('hidden'); fetchWorkouts(); });
const workoutsMenuBtn = document.getElementById('workoutsMenuBtn');
if (workoutsMenuBtn) {
  workoutsMenuBtn.addEventListener('click', () => { window.location.href = 'workouts.html'; });
}
const aiMenuBtn = document.getElementById('aiMenuBtn');
if (aiMenuBtn) {
  aiMenuBtn.addEventListener('click', () => { window.location.href = 'ai-analysis.html'; });
}
draftsBtn.addEventListener('click',   () => alert('Show draft posts.'));
settingsBtn.addEventListener('click', () => alert('Open settings.'));

// ─── Update profile sidebar ───────────────────────────────────────────────────
function updateProfileSidebar() {
  const uid = sessionStorage.getItem('firebaseUid') || document.body.dataset.uid;
  const name = sessionStorage.getItem('firebaseDisplayName') || document.body.dataset.displayName || 'Guest';
  const avatar = `https://i.pravatar.cc/80?u=${encodeURIComponent(uid || 'guest')}`;

  const profileCard = document.querySelector('.profile-card');
  if (profileCard) {
    profileCard.innerHTML = `
      <button class="profileBtn" id="profileBtn" aria-label="View profile">
        <img src="${avatar}" alt="${name}" />
      </button>
      <div>
        <strong>${name}</strong>
        <span>${uid ? '@' + uid.substring(0, 8) : 'Not logged in'}</span>
      </div>
    `;
  }

  // Add login/logout buttons to sidebar Options
  const optionsList = document.querySelector('.sidebar-card:last-child ul');
  if (optionsList) {
    if (uid) {
      optionsList.innerHTML = `
        <li style="cursor:pointer;color:var(--text);" onclick="window.location.href='workouts.html'">🏃 My Workouts</li>
        <li style="cursor:pointer;color:var(--text);" onclick="window.location.href='ai-analysis.html'">🔮 AI Analyzer</li>
        <li style="cursor:pointer;color:var(--text);" onclick="logoutUser()">🚪 Logout</li>
        <li>Settings</li>
        <li>Notifications</li>
        <li>Help</li>
      `;
    } else {
      optionsList.innerHTML = `
        <li style="cursor:pointer;color:var(--gold);" onclick="loginUser()">🔑 Login</li>
        <li style="cursor:pointer;color:var(--gold);" onclick="registerUser()">📝 Register</li>
        <li>Settings</li>
        <li>Help</li>
      `;
    }
  }
}

updateProfileSidebar();

// ─── Post modal ───────────────────────────────────────────────────────────────
openCreatePostBtn.addEventListener('click', async () => {
  createPostModal.classList.remove('hidden');
  await fetchWorkouts();
});

closePostModalBtn.addEventListener('click', () => {
  createPostModal.classList.add('hidden');
});

submitPostBtn.addEventListener('click', async () => {
  const content    = postContentInput.value.trim();
  const trainingId = workoutSelect.value || null;

  if (!content) { alert('Write something first!'); return; }

  try {
    await makeApiRequest('POST', '/api/posts', {
      user_id:     getCurrentUserId(),
      content,
      training_id: trainingId,
    });
    postContentInput.value = '';
    workoutSelect.value    = '';
    createPostModal.classList.add('hidden');
    loadPosts();
  } catch (err) {
    alert(`Failed to post: ${err.message}`);
  }
});

// ─── Training modal ───────────────────────────────────────────────────────────
openCreateTrainingBtn.addEventListener('click', () => {
  createTrainingModal.classList.remove('hidden');
});

closeTrainingModalBtn.addEventListener('click', () => {
  createTrainingModal.classList.add('hidden');
});

submitTrainingBtn.addEventListener('click', async () => {
  const type     = trainingType.value.trim();
  const duration = trainingDuration.value.trim();
  const distance = trainingDistance.value.trim();

  if (!type)              { alert('Select a training type.');                return; }
  if (!duration || +duration <= 0) { alert('Enter a valid duration (> 0 minutes).'); return; }

  try {
    await makeApiRequest('POST', '/api/workouts', {
      user_id:          getCurrentUserId(),
      type,
      duration_minutes: parseInt(duration, 10),
      distance_km:      distance ? parseFloat(distance) : null,
    });

    trainingType.value     = '';
    trainingDuration.value = '';
    trainingDistance.value = '';
    createTrainingModal.classList.add('hidden');

    // Silently refresh the workouts dropdown so it's ready when the post modal opens
    await fetchWorkouts();
    alert('Training logged!');
  } catch (err) {
    alert(`Could not save training: ${err.message}`);
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
loadPosts();
