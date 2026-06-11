// shell.js - Shared layout injector for secondary pages
(function() {
  // 1. Inject sidebar HTML when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebarHid');
    if (sidebar) {
      sidebar.innerHTML = `
        <div class="sidebar-card" id="profileSidebarCard">
          <h2>Profile</h2>
          <div class="profile-card" id="profileCard">
            <button class="profileBtn" id="profileBtn" onclick="window.location.href='profile.html'"
              aria-label="View profile">
              <img src="https://i.pravatar.cc/80?img=47" alt="Profile" />
            </button>
            <div>
              <strong>Jane Doe</strong>
              <span>@janedoe</span>
            </div>
          </div>
          <div id="profileAuthButtons" style="margin-top: 14px; display: flex; gap: 8px;"></div>
        </div>

        <div class="sidebar-card" id="progressSidebarCard">
          <h2>Progress</h2>
          <ul id="progressOptionsList" style="list-style: none; padding: 0; margin: 0; display: grid; gap: 12px;">
            <li style="cursor:pointer;color:var(--text);" onclick="window.location.href='workouts.html'">🏃 My Workouts</li>
            <li style="cursor:pointer;color:var(--text);" onclick="window.location.href='ai-analysis.html'">🔮 AI History</li>
            <li style="cursor:pointer;color:var(--text);" onclick="window.location.href='achievements.html'">🏆 Achievements</li>
          </ul>
        </div>

        <div class="sidebar-card" id="plannerSidebarCard">
          <h2>Planner</h2>
          <ul id="plannerOptionsList" style="list-style: none; padding: 0; margin: 0; display: grid; gap: 12px;">
            <li style="cursor:pointer;color:var(--text);" onclick="window.location.href='ai-race.html'">🏁 AI Race
              Simulator
            </li>
            <li style="cursor:pointer;color:var(--text);" onclick="window.location.href='ai-planner.html'">📅 AI Training
              Plans
            </li>
          </ul>
        </div>

        <div class="sidebar-card" id="friendsSidebarCard">
          <h2>Friends</h2>
          <div style="margin-bottom: 12px; display: flex; gap: 8px;">
            <input type="text" id="followUsernameInput" placeholder="Username..."
              style="flex: 1; padding: 8px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface-strong); color: var(--text); font-family: inherit; font-size: 0.9rem;" />
            <button onclick="followUserByUsername()" class="action-pill active"
              style="padding: 8px 16px; border-radius: 12px; border: none; font-size: 0.9rem; font-weight: bold; cursor: pointer;">Follow</button>
          </div>
          <ul id="friendsList"
            style="list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; color: var(--muted); font-size: 0.95rem;">
            <li>No followed athletes yet</li>
          </ul>
        </div>
      `;
    }

    // Set up the hamburger/toggle button for mobile if it exists on the page
    const toggleBtn = document.getElementById('toggle');
    const overlay = document.getElementById('overlay');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const sidebarEl = document.getElementById('sidebarHid');
        if (sidebarEl) sidebarEl.classList.toggle('open');
        if (overlay) overlay.classList.toggle('visible');
      });
    }
    if (overlay) {
      overlay.addEventListener('click', () => {
        const sidebarEl = document.getElementById('sidebarHid');
        if (sidebarEl) sidebarEl.classList.remove('open');
        overlay.classList.remove('visible');
      });
    }

    // Initialize sidebar data
    if (isFirebaseReady()) {
      firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
          sessionStorage.setItem('firebaseUid', user.uid);
          sessionStorage.setItem('firebaseDisplayName', user.displayName || user.email);
          sessionStorage.setItem('firebaseEmail', user.email);
        } else {
          sessionStorage.clear();
          window.location.replace('login.html');
        }
        updateProfileSidebar();
      });
    } else {
      updateProfileSidebar();
    }
  });

  // 2. Define Shared Helper Functions on Window
  window.isFirebaseReady = function() {
    try {
      return typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0;
    } catch (e) {
      return false;
    }
  };

  window.getCurrentUserId = function() {
    return sessionStorage.getItem('firebaseUid') || null;
  };

  window.getAuthHeaders = async function() {
    if (window.isFirebaseReady()) {
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
      } catch (e) {}
    }
    const token = sessionStorage.getItem('firebaseToken');
    if (!token) return {};
    return { 'Authorization': `Bearer ${token}` };
  };

  window.logoutUser = function() {
    if (window.isFirebaseReady()) {
      firebase.auth().signOut().then(function() {
        sessionStorage.clear();
        window.location.replace('login.html');
      }).catch(function(e) {
        console.warn('Logout failed:', e);
      });
    } else {
      sessionStorage.clear();
      window.location.replace('login.html');
    }
  };

  window.followUserByUsername = async function() {
    const usernameInput = document.getElementById('followUsernameInput');
    const username = usernameInput ? usernameInput.value.trim() : '';
    if (!username) {
      alert('Please enter a username to follow!');
      return;
    }

    const currentUid = window.getCurrentUserId();

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

      const authHeaders = await window.getAuthHeaders();
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          follower_id: currentUid,
          following_id: targetUser.uid,
        })
      });
      if (!res.ok) throw new Error(`Status: ${res.status}`);

      alert(`Successfully followed @${username}!`);
      if (usernameInput) usernameInput.value = '';
      
      window.updateProfileSidebar();
    } catch (err) {
      alert(`Could not follow user: ${err.message}`);
    }
  };

  window.fetchFriendsList = async function(uid) {
    const friendsListEl = document.getElementById('friendsList');
    if (!friendsListEl) return;

    try {
      const res = await fetch(`/api/users/${uid}/friends`);
      if (!res.ok) throw new Error('Friends API failed');
      
      const data = await res.json();
      const friends = data.friends || [];

      if (friends.length === 0) {
        friendsListEl.innerHTML = '<li>No friends yet. Follow someone!</li>';
        return;
      }

      friendsListEl.innerHTML = '';
      friends.forEach(friend => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.gap = '10px';
        li.style.cursor = 'pointer';
        li.style.padding = '4px 0';
        li.onclick = () => window.location.href = `profile.html?user=${friend.username}`;

        const friendAvatar = friend.profilePicture || `https://i.pravatar.cc/40?u=${encodeURIComponent(friend.uid)}`;

        li.innerHTML = `
          <img src="${friendAvatar}" alt="${friend.username}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border);" />
          <span style="color: var(--text); font-weight: 500; font-size: 0.95rem;">${friend.username}</span>
        `;
        friendsListEl.appendChild(li);
      });
    } catch (err) {
      console.warn('Could not load friends list:', err);
      friendsListEl.innerHTML = '<li>Could not load friends.</li>';
    }
  };

  window.updateProfileSidebar = async function() {
    const uid = sessionStorage.getItem('firebaseUid');
    let name = sessionStorage.getItem('firebaseDisplayName') || 'Athlete';
    let avatarUrl = sessionStorage.getItem('pgAvatar');

    // Grab live database info if logged in to avoid old session tokens
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
      } catch (e) {}
    }

    const avatar = avatarUrl || `https://i.pravatar.cc/80?u=${encodeURIComponent(uid || 'default')}`;

    const profileCard = document.getElementById('profileCard');
    if (profileCard) {
      profileCard.innerHTML = `
        <button class="profileBtn" id="profileBtn" onclick="window.location.href='profile.html'" aria-label="View profile">
          <img src="${avatar}" alt="${name}" />
        </button>
        <div>
          <strong>${name}</strong>
          <span>${uid ? '@' + uid : 'Not logged in'}</span>
        </div>
      `;
    }

    const profileAuthButtons = document.getElementById('profileAuthButtons');
    if (profileAuthButtons) {
      if (uid) {
        profileAuthButtons.innerHTML = `
          <button onclick="logoutUser()" style="flex: 1; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-strong); color: var(--text); cursor: pointer; font-size: 0.85rem; font-weight: 500;">🚪 Logout</button>
        `;
      } else {
        profileAuthButtons.innerHTML = `
          <button onclick="window.location.href='index.html'" style="flex: 1; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-strong); color: var(--gold); cursor: pointer; font-size: 0.85rem; font-weight: 500;">🔑 Log In</button>
        `;
      }
    }

    if (uid) {
      window.fetchFriendsList(uid);
    }
  };
})();
