// frontendtest.js
// All API calls go to the same origin (port 8080).
// The frontend server proxies /api/* to the gateway (port 3000) server-side,
// so the browser never makes a cross-origin request.

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const postsContainer      = document.getElementById('postsContainer');
const menuPanel           = document.getElementById('menuPanel');
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
  window.location.replace('login.html');
};

window.registerUser = async function registerUser() {
  window.location.replace('login.html');
};

window.logoutUser = async function logoutUser() {
  if (!isFirebaseReady()) {
    sessionStorage.clear();
    window.location.replace('login.html');
    return;
  }
  try {
    await firebase.auth().signOut();
    sessionStorage.clear();
    window.location.replace('login.html');
  } catch (e) {
    console.warn(`Logout failed: ${e.message}`);
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
        window.location.replace('login.html');
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
         null;
}

function getCurrentDisplayName() {
  return sessionStorage.getItem('firebaseDisplayName') || 
         document.body.dataset.displayName || 
         'Athlete';
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
  card.id = `post-card-${post.id}`;
  card.comments = post.comments || [];
  card.dataset.expanded = "false";
  
  // Rich user profiles joined from the backend
  const authorProfile  = post.authorProfile || {};
  const authorFullName = authorProfile.fullName || post.username || 'Athlete';
  const authorHandle   = authorProfile.username || 'athlete';
  const authorAvatar   = authorProfile.profilePicture || `https://i.pravatar.cc/48?u=${encodeURIComponent(post.userId || 'default')}`;
  
  // Format likedBy list
  let likedByText = '';
  if (Array.isArray(post.likedBy) && post.likedBy.length > 0) {
    const names = post.likedBy.map(like => typeof like === 'object' && like !== null ? like.name || like.username : like);
    likedByText = `<div class="liked-by-list" style="font-size: 0.85rem; color: var(--muted); margin-top: 10px; border-top: 1px dashed var(--border); padding-top: 8px;">
      ❤️ Liked by: ${names.join(', ')}
    </div>`;
  }

  // Check if current user liked it
  const currentUid = getCurrentUserId();
  const hasLiked = Array.isArray(post.likedBy) && post.likedBy.some(like => {
    if (typeof like === 'object' && like !== null) {
      return like.uid === currentUid;
    }
    return like === currentUid;
  });

  // Render training stats inline if present
  let statsHtml = '';
  if (post.trainingDetails) {
    const type = post.trainingDetails.type || 'Workout';
    const emoji = getDisciplineEmoji(type);
    const dur = post.trainingDetails.duration_minutes || post.trainingDetails.duration || 0;
    const dist = post.trainingDetails.distance_km || post.trainingDetails.distance;
    const distanceText = dist ? ` · ${parseFloat(dist).toFixed(2)} km` : '';
    statsHtml = `
      <div class="workout-card-inline" style="background: var(--surface); border-left: 4px solid var(--accent); padding: 8px 12px; margin: 10px 0; border-radius: 4px;">
        <span style="font-weight: 600; color: var(--accent); text-transform: uppercase; font-size: 0.75rem; display: block; margin-bottom: 2px;">Attached Training</span>
        <span style="font-size: 0.95rem; color: var(--text);">${emoji} ${type.toUpperCase()} · ⏱️ ${dur} mins${distanceText}</span>
      </div>
    `;
  } else if (post.trainingId) {
    statsHtml = `
      <div id="workout-details-${post.id}" class="workout-card-inline" style="background: var(--surface); border-left: 4px solid var(--accent); padding: 8px 12px; margin: 10px 0; border-radius: 4px;">
        <span style="font-size: 0.95rem; color: var(--muted);">Loading training details...</span>
      </div>
    `;
  }

  const likeAction = hasLiked ? `unlikePost('${post.id}')` : `likePost('${post.id}')`;
  const likeStyle = hasLiked ? 'background-color: rgba(249, 115, 22, 0.15); color: var(--primary); border: 1px solid var(--primary);' : 'background-color: var(--surface); color: rgba(256, 256, 256, 0.7); border: 1px solid var(--surface-strong);';

  card.innerHTML = `
    <header style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid var(--border); margin-bottom: 12px;">
      <a href="profile.html?uid=${post.userId}" style="display: flex; gap: 12px; text-decoration: none; color: inherit; align-items: center;">
        <img class="avatar" src="${authorAvatar}" alt="${authorFullName}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;" />
        <div style="display: flex; flex-direction: column;">
          <strong style="font-size: 1rem;">${authorFullName}</strong>
          <span style="font-size: 0.85rem; color: var(--muted);">@${authorHandle}</span>
        </div>
      </a>
      <span style="font-size: 0.8rem; color: var(--muted);">${formatTimeAgo(post.createdAt)}</span>
    </header>
    <h3>${post.trainingId ? '🏃 Training update' : 'New post'}</h3>
    <p>${post.content || ''}</p>
    ${statsHtml}
    ${likedByText}
    <div class="post-meta" style="display: flex; align-items: center; gap: 16px; margin-top: 12px;">
      <button onclick="${likeAction}" style="background: transparent; border: none; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; ${likeStyle}">
        ❤️ <span class="like-count">${post.likes || 0}</span>
      </button>
      <button onclick="toggleComments('${post.id}')" class="comments-toggle-btn" id="comments-btn-${post.id}">
        💬 comments (${post.comments ? post.comments.length : 0})
      </button>
    </div>
    <div id="comments-container-${post.id}" class="comments-container">
      <div class="comment-input-area">
        <input type="text" id="comment-input-${post.id}" class="comment-input" placeholder="Write a comment..." onkeydown="if(event.key === 'Enter') submitComment('${post.id}')" />
        <button class="comment-submit-btn" onclick="submitComment('${post.id}')">Post</button>
      </div>
      <div id="comment-list-${post.id}" class="comment-list">
      </div>
    </div>
  `;
  return card;
}

function getDisciplineEmoji(type) {
  if (!type) return '🏃';
  const t = type.toLowerCase();
  if (t === 'swim' || t === 'swimming') return '🏊';
  if (t === 'ride' || t === 'bike' || t === 'cycling') return '🚴';
  if (t === 'run' || t === 'running') return '🏃';
  return '🏋️';
}

async function fetchAndRenderAttachedTraining(userId, trainingId, postId) {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`/api/workouts/${userId}`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders }
    });
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    const workouts = data.workouts || [];
    const matchingWorkout = workouts.find(w => w.id === trainingId);
    const container = document.getElementById(`workout-details-${postId}`);
    if (container) {
      if (matchingWorkout) {
        const type = matchingWorkout.type || 'Workout';
        const emoji = getDisciplineEmoji(type);
        const dur = matchingWorkout.duration_minutes || matchingWorkout.duration || 0;
        const dist = matchingWorkout.distance_km || matchingWorkout.distance;
        const distanceText = dist ? ` · ${parseFloat(dist).toFixed(2)} km` : '';
        container.innerHTML = `
          <span style="font-weight: 600; color: var(--accent); text-transform: uppercase; font-size: 0.75rem; display: block; margin-bottom: 2px;">Attached Training</span>
          <span style="font-size: 0.95rem; color: var(--text);">${emoji} ${type.toUpperCase()} · ⏱️ ${dur} mins${distanceText}</span>
        `;
      } else {
        container.style.display = 'none';
      }
    }
  } catch (err) {
    // Fails silently in network / console to ensure the post card remains usable
    const container = document.getElementById(`workout-details-${postId}`);
    if (container) {
      container.style.display = 'none';
    }
  }
}

window.likePost = async function likePost(postId) {
  try {
    await makeApiRequest('POST', `/api/posts/${postId}/like`, {
      user_id: getCurrentUserId(),
      username: getCurrentDisplayName(),
    });
    loadPosts();
  } catch (err) {
    alert(`Could not like post: ${err.message}`);
  }
};

window.unlikePost = async function unlikePost(postId) {
  try {
    await makeApiRequest('POST', `/api/posts/${postId}/unlike`, {
      user_id: getCurrentUserId(),
    });
    loadPosts();
  } catch (err) {
    alert(`Could not unlike post: ${err.message}`);
  }
};

function renderPosts(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    postsContainer.innerHTML = '<div class="empty-state">No posts yet — log a training and share it!</div>';
    return;
  }
  postsContainer.innerHTML = '';
  posts.forEach(p => {
    postsContainer.appendChild(createPostCard(p));
    renderCommentList(p.id);
    if (p.trainingId && !p.trainingDetails) {
      setTimeout(() => fetchAndRenderAttachedTraining(p.userId, p.trainingId, p.id), 0);
    }
  });
}

// ─── Load posts on startup with timeout ───────────────────────────────────────
async function loadPosts() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    const uid = getCurrentUserId();
    const isLoggedIn = sessionStorage.getItem('firebaseUid') || document.body.dataset.uid;
    const url = isLoggedIn ? `/api/feed/${uid}` : '/api/posts';

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${res.status}: ${body}`);
    }
    const data = await res.json();
    const postsArray = Array.isArray(data) ? data : (data.posts || []);
    renderPosts(postsArray);
  } catch (err) {
    clearTimeout(timeout);
    postsContainer.innerHTML = '<div class="empty-state">No posts yet — follow some athletes to see updates!</div>';
    console.warn('loadPosts:', err.message);
  }
}

window.followUserByUsername = async function followUserByUsername() {
  const usernameInput = document.getElementById('followUsernameInput');
  const username = usernameInput ? usernameInput.value.trim() : '';
  if (!username) {
    alert('Please enter a username to follow!');
    return;
  }

  const currentUid = getCurrentUserId();

  try {
    const userRes = await fetch(`/api/users/by-username/${encodeURIComponent(username)}`);
    if (!userRes.ok) {
      if (userRes.status === 404) {
        throw new Error(`User "${username}" not found.`);
      }
      throw new Error(`Failed to lookup user. Status: ${userRes.status}`);
    }
    const targetUser = await userRes.json();

    if (targetUser.uid === currentUid) {
      alert("You cannot follow yourself!");
      return;
    }

    await makeApiRequest('POST', '/api/follow', {
      follower_id: currentUid,
      following_id: targetUser.uid,
    });

    alert(`Successfully followed @${username}!`);
    if (usernameInput) usernameInput.value = '';
    
    updateProfileSidebar();
    loadPosts();
  } catch (err) {
    alert(`Could not follow user: ${err.message}`);
  }
};

// ─── Workouts dropdown ────────────────────────────────────────────────────────
let loadedWorkoutsList = [];

async function fetchWorkouts() {
  workoutSelect.innerHTML = '<option value="">Loading…</option>';
  try {
    const result = await makeApiRequest('GET', `/api/workouts/${getCurrentUserId()}`);
    workoutSelect.innerHTML = '<option value="">— Attach a training (optional) —</option>';

    if (!result.workouts?.length) {
      workoutSelect.innerHTML = '<option value="">No trainings logged yet</option>';
      loadedWorkoutsList = [];
      return;
    }
    loadedWorkoutsList = result.workouts;
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
profileBtn.addEventListener('click', () => { window.location.href = 'profile.html'; });

newPostBtn.addEventListener('click',  () => { createPostModal.classList.remove('hidden'); fetchWorkouts(); });
const workoutsMenuBtn = document.getElementById('workoutsMenuBtn');
if (workoutsMenuBtn) {
  workoutsMenuBtn.addEventListener('click', () => { window.location.href = 'workouts.html'; });
}
const aiRaceMenuBtn = document.getElementById('aiRaceMenuBtn');
if (aiRaceMenuBtn) {
  aiRaceMenuBtn.addEventListener('click', () => { window.location.href = 'ai-race.html'; });
}
const aiHistoryMenuBtn = document.getElementById('aiHistoryMenuBtn');
if (aiHistoryMenuBtn) {
  aiHistoryMenuBtn.addEventListener('click', () => { window.location.href = 'ai-analysis.html'; });
}
const aiPlannerMenuBtn = document.getElementById('aiPlannerMenuBtn');
if (aiPlannerMenuBtn) {
  aiPlannerMenuBtn.addEventListener('click', () => { window.location.href = 'ai-planner.html'; });
}
draftsBtn.addEventListener('click',   () => alert('Show draft posts.'));
settingsBtn.addEventListener('click', () => alert('Open settings.'));

// ─── Update profile sidebar & dynamic photos ─────────────────────────────────
async function updateProfileSidebar() {
  const uid = sessionStorage.getItem('firebaseUid') || document.body.dataset.uid;
  let name = sessionStorage.getItem('firebaseDisplayName') || 'Athlete';
  let avatarUrl = sessionStorage.getItem('pgAvatar');
  
  if (uid && !sessionStorage.getItem('sidebarNameLoaded')) {
    try {
      const res = await fetch(`/api/users/${uid}/profile`);
      if (res.ok) {
        const uData = await res.json();
        name = `${uData.firstName} ${uData.lastName}`;
        sessionStorage.setItem('firebaseDisplayName', name);
        sessionStorage.setItem('sidebarNameLoaded', 'true');
        if (uData.profilePicture) {
            sessionStorage.setItem('pgAvatar', uData.profilePicture);
            avatarUrl = uData.profilePicture;
        }
      }
    } catch(e){}
  }

  const avatar = avatarUrl || `https://i.pravatar.cc/80?u=${encodeURIComponent(uid || 'default')}`;

  const profileCard = document.getElementById('profileCard');
  if (profileCard) {
    profileCard.innerHTML = `
      <button class="profileBtn" id="profileBtn" aria-label="View profile" onclick="window.location.href='profile.html'">
        <img src="${avatar}" alt="${name}" />
      </button>
      <div>
        <strong>${name}</strong>
        <span>${uid ? '@' + uid : 'Not logged in'}</span>
      </div>
    `;
  }
  
  const toggleImg = document.querySelector('#toggle img');
  if (toggleImg) {
    toggleImg.src = avatar;
    toggleImg.alt = name;
  }

  if (uid) {
    fetchFriendsList(uid);
  }
}

// ─── Fetch and Render Friends List (Mutual Follows) ───────────────────────────
async function fetchFriendsList(uid) {
  const friendsListEl = document.getElementById('friendsList');
  if (!friendsListEl) return;

  try {
    const [followersData, followingData] = await Promise.all([
      makeApiRequest('GET', `/api/followers/${uid}`).catch(() => []),
      makeApiRequest('GET', `/api/following/${uid}`).catch(() => [])
    ]);

    const followers = Array.isArray(followersData) ? followersData : (followersData.followers || []);
    const following = Array.isArray(followingData) ? followingData : (followingData.following || []);

    const followerIds = followers.map(f => f.followerId || f.uid || f.id || f);
    const followingIds = following.map(f => f.followingId || f.uid || f.id || f);

    const mutualIds = [...new Set(followingIds.filter(id => followerIds.includes(id)))];

    if (mutualIds.length === 0) {
      friendsListEl.innerHTML = '<li>No friends yet. Follow someone!</li>';
      return;
    }

    friendsListEl.innerHTML = '';
    
    const profiles = await Promise.all(
      mutualIds.map(friendId => 
        makeApiRequest('GET', `/api/users/${friendId}/profile`)
          .catch(() => ({ uid: friendId, username: 'Unknown', profilePicture: null }))
      )
    );

    profiles.forEach(friend => {
      if (friend.username === 'Unknown') return;

      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.gap = '10px';
      li.style.cursor = 'pointer';
      li.style.padding = '6px 0';
      li.style.overflow = 'hidden';
      li.onclick = () => window.location.href = `profile.html?uid=${friend.uid}`;

      const friendAvatar = friend.profilePicture || `https://i.pravatar.cc/40?u=${encodeURIComponent(friend.uid)}`;

      li.innerHTML = `
        <img src="${friendAvatar}" alt="${friend.username}" style="width: 32px; height: 32px; min-width: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border);" />
        <span style="color: var(--text); font-weight: 500; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${friend.username}</span>
      `;
      friendsListEl.appendChild(li);
    });

    if (friendsListEl.innerHTML === '') {
       friendsListEl.innerHTML = '<li>No friends yet. Follow someone!</li>';
    }
  } catch (err) {
    console.warn('Could not load friends list:', err);
    friendsListEl.innerHTML = '<li>Could not load friends.</li>';
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

  let trainingDetails = null;
  if (trainingId) {
    const workoutObj = loadedWorkoutsList.find(w => w.id === trainingId);
    if (workoutObj) {
      trainingDetails = {
        type: workoutObj.type,
        duration_minutes: workoutObj.duration_minutes !== undefined ? workoutObj.duration_minutes : workoutObj.durationMinutes,
        distance_km: workoutObj.distance_km !== undefined ? workoutObj.distance_km : workoutObj.distanceKm,
      };
    }
  }

  try {
    await makeApiRequest('POST', '/api/posts', {
      user_id:          getCurrentUserId(),
      username:         getCurrentDisplayName(),
      content,
      training_id:      trainingId,
      training_details: trainingDetails,
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

    await fetchWorkouts();
    alert('Training logged!');
  } catch (err) {
    alert(`Could not save training: ${err.message}`);
  }
});

// ─── Comments Toggle and Rendering Logic ──────────────────────────────────────
window.renderCommentList = window.renderCommentList || function() {};
window.renderCommentList = function renderCommentList(postId) {
  const card = document.getElementById(`post-card-${postId}`);
  const listContainer = document.getElementById(`comment-list-${postId}`);
  if (!card || !listContainer) return;

  const comments = card.comments || [];
  const expanded = card.dataset.expanded === "true";

  if (comments.length === 0) {
    listContainer.innerHTML = '<div class="empty-state" style="padding:12px;">No comments yet — start the conversation!</div>';
    return;
  }

  const commentsToRender = expanded ? comments : comments.slice(0, 3);

  listContainer.innerHTML = '';
  commentsToRender.forEach(comment => {
    const item = document.createElement('div');
    item.className = 'comment-card';
    const author = comment.username || 'Anonymous';
    const timeAgo = formatTimeAgo(comment.createdAt);

    item.innerHTML = `
      <img class="avatar" src="https://i.pravatar.cc/32?u=${encodeURIComponent(comment.userId)}" alt="${author}" />
      <div class="comment-content-wrap">
        <div class="comment-header">
          <strong>${author}</strong>
          <span>${timeAgo}</span>
        </div>
        <p>${comment.content || ''}</p>
      </div>
    `;
    listContainer.appendChild(item);
  });

  if (!expanded && comments.length > 3) {
    const hint = document.createElement('div');
    hint.className = 'empty-state';
    hint.style.padding = '8px';
    hint.style.cursor = 'pointer';
    hint.style.fontSize = '0.85rem';
    hint.textContent = `Show ${comments.length - 3} more comments...`;
    hint.onclick = () => toggleComments(postId);
    listContainer.appendChild(hint);
  }

  if (expanded) {
    listContainer.scrollTop = listContainer.scrollHeight;
  }
};

window.toggleComments = async function toggleComments(postId) {
  const card = document.getElementById(`post-card-${postId}`);
  if (!card) return;

  const isExpanded = card.dataset.expanded === "true";
  card.dataset.expanded = isExpanded ? "false" : "true";

  renderCommentList(postId);
};

window.submitComment = async function submitComment(postId) {
  const card = document.getElementById(`post-card-${postId}`);
  const input = document.getElementById(`comment-input-${postId}`);
  if (!card || !input) return;

  const content = input.value.trim();
  if (!content) {
    alert('Please enter a comment!');
    return;
  }

  try {
    const res = await makeApiRequest('POST', `/api/posts/${postId}/comments`, {
      user_id: getCurrentUserId(),
      username: getCurrentDisplayName(),
      content
    });
    
    const newComment = res.comment;
    if (newComment) {
      if (!card.comments) card.comments = [];
      card.comments.push(newComment);
      
      card.dataset.expanded = "true";
      
      const btn = document.getElementById(`comments-btn-${postId}`);
      if (btn) {
        btn.innerHTML = `💬 comments (${card.comments.length})`;
      }

      renderCommentList(postId);
    }
    input.value = '';
  } catch (err) {
    alert(`Could not post comment: ${err.message}`);
  }
};

// ─── Boot ─────────────────────────────────────────────────────────────────────
loadPosts();