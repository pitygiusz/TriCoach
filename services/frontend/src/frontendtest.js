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
// firebase.initializeApp() was already called in index.html.
// Use the global `firebase` object directly.

function getFirebaseAuth() {
  const auth = firebase.auth();
  return { auth };
}

window.loginUser = async function loginUser() {
  try {
    const { auth } = getFirebaseAuth();
    const email = prompt('Email:') || 'test@example.com';
    const password = prompt('Password:') || 'test123';
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const idToken = await cred.user.getIdToken();

    sessionStorage.setItem('firebaseToken', idToken);
    sessionStorage.setItem('firebaseUid', cred.user.uid);
    sessionStorage.setItem('firebaseDisplayName', cred.user.displayName || email);
    sessionStorage.setItem('firebaseEmail', cred.user.email || email);

    alert(`Logged in as ${cred.user.email}`);
    location.reload();
  } catch (e) {
    alert(`Login failed: ${e.message}`);
  }
};

window.registerUser = async function registerUser() {
  try {
    const { auth } = getFirebaseAuth();
    const email = prompt('Email:') || 'newuser@example.com';
    const password = prompt('Password:') || 'test123';
    const displayName = prompt('Display name:') || 'New User';

    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName });
    const idToken = await cred.user.getIdToken();

    sessionStorage.setItem('firebaseToken', idToken);
    sessionStorage.setItem('firebaseUid', cred.user.uid);
    sessionStorage.setItem('firebaseDisplayName', displayName);
    sessionStorage.setItem('firebaseEmail', cred.user.email || email);

    alert(`Registered as ${email}`);
    location.reload();
  } catch (e) {
    alert(`Registration failed: ${e.message}`);
  }
};

window.logoutUser = async function logoutUser() {
  try {
    const { auth } = getFirebaseAuth();
    await auth.signOut();
    sessionStorage.clear();
    location.reload();
  } catch (e) {
    alert(`Logout failed: ${e.message}`);
  }
}

// Listen for auth state changes
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    console.log('🔥 Auth: logged in as', user.email);
    document.body.classList.add('authenticated');
    document.body.dataset.uid = user.uid;
    document.body.dataset.displayName = user.displayName || user.email;
  } else {
    console.log('🔥 Auth: signed out');
    document.body.classList.remove('authenticated');
    delete document.body.dataset.uid;
    delete document.body.dataset.displayName;
  }
});

// Helper to get current token for API calls
async function getAuthHeaders() {
  const token = sessionStorage.getItem('firebaseToken');
  if (!token) return {};
  return { 'Authorization': `Bearer ${token}` };
}

// ─── Current user from session ────────────────────────────────────────────────
const currentUserId = sessionStorage.getItem('firebaseUid') || 'user_janedoe_47';
const currentDisplayName = sessionStorage.getItem('firebaseDisplayName') || 'Jane Doe';

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

async function loadPosts() {
  try {
    const data = await makeApiRequest('GET', '/api/posts');
    renderPosts(data);
  } catch (err) {
    postsContainer.innerHTML = `<div class="error-state">Could not load posts. ${err.message}</div>`;
  }
}

// ─── Workouts dropdown (used inside the post modal) ───────────────────────────
async function fetchWorkouts() {
  workoutSelect.innerHTML = '<option value="">Loading…</option>';
  try {
    const result = await makeApiRequest('GET', `/api/workouts/${currentUserId}`);
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
draftsBtn.addEventListener('click',   () => alert('Show draft posts.'));
settingsBtn.addEventListener('click', () => alert('Open settings.'));

// ─── Update profile sidebar ───────────────────────────────────────────────────
function updateProfileSidebar() {
  const uid = sessionStorage.getItem('firebaseUid');
  const name = sessionStorage.getItem('firebaseDisplayName') || 'Guest';
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
      user_id:     currentUserId,
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
      user_id:          currentUserId,
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
