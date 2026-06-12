// shell.js - Shared layout injector for secondary pages
(function() {
  // 1. Inject sidebar HTML when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    injectSidebarStyles();
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
              <strong style="cursor: pointer;" onclick="window.location.href='profile.html'">Jane Doe</strong>
              <span>@janedoe</span>
            </div>
          </div>
          <div id="profileAuthButtons" style="margin-top: 14px; display: flex; flex-direction: column; gap: 8px;"></div>
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
          <div style="margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
            <input type="text" id="followUsernameInput" placeholder="Username..."
              style="flex: 1 1 140px; min-width: 140px; padding: 8px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface-strong); color: var(--text); font-family: inherit; font-size: 0.9rem;" />
            <button onclick="followUserByUsername()" class="action-pill active"
              style="flex: 1 1 70px; min-width: 70px; padding: 8px 16px; border-radius: 12px; border: none; font-size: 0.9rem; font-weight: bold; cursor: pointer; white-space: nowrap;">Follow</button>
          </div>
          <ul id="friendsList"
            style="list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; color: var(--muted); font-size: 0.95rem;">
            <li>No followed athletes yet</li>
          </ul>
        </div>
      `;
    }

    // Set up the hamburger/toggle button for mobile, creating it if it doesn't exist on the page
    const { toggleBtn, overlay } = ensureSidebarToggle();
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const sidebarEl = document.getElementById('sidebarHid');
        if (sidebarEl) {
          const isOpen = sidebarEl.classList.toggle('open');
          if (isOpen) {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
          } else {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
          }
        }
        if (overlay) overlay.classList.toggle('visible');
      });
    }
    if (overlay) {
      overlay.addEventListener('click', () => {
        const sidebarEl = document.getElementById('sidebarHid');
        if (sidebarEl) sidebarEl.classList.remove('open');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
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

  // 1b. Ensure responsive sidebar styles + toggle/overlay exist on every page using shell.js
  function injectSidebarStyles() {
    if (document.getElementById('shellSidebarStyles')) return;
    const style = document.createElement('style');
    style.id = 'shellSidebarStyles';
    style.textContent = `
      @media (max-width: 640px) {
        .sidebar {
          position: fixed;
          top: 0;
          right: -100%;
          left: auto;
          width: 280px;
          height: 100vh;
          z-index: 1000;
          transition: right 0.3s ease;
          background-color: var(--surface, #1e1e1e);
          box-shadow: -2px 0 10px rgba(0,0,0,0.5);
          overflow-y: auto;
          box-sizing: border-box;
          padding-bottom: 100px;
        }
        .sidebar.open {
          right: 0;
        }
        .overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 999;
          display: none;
        }
        .overlay.visible {
          display: block;
        }
        .toggle-btn {
          position: fixed !important;
          bottom: 24px;
          right: 24px;
          z-index: 1001;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          padding: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          border: 2px solid var(--accent, #f97316);
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .toggle-btn img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureSidebarToggle() {
    let overlay = document.getElementById('overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'overlay';
      overlay.className = 'overlay';
      document.body.appendChild(overlay);
    }

    let toggleBtn = document.getElementById('toggle');
    if (!toggleBtn) {
      const topbar = document.querySelector('.topbar');
      if (topbar) {
        toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggle';
        toggleBtn.className = 'toggle-btn';
        toggleBtn.setAttribute('aria-label', 'Toggle sidebar');
        const avatar = sessionStorage.getItem('pgAvatar') || 'https://i.pravatar.cc/48?img=47';
        toggleBtn.innerHTML = `<img src="${avatar}" alt="Profile" id="toggleAvatar" />`;
        topbar.appendChild(toggleBtn);
      }
    }

    return { toggleBtn, overlay };
  }

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
      if (typeof window.loadUserProfile === 'function') {
        window.loadUserProfile();
      }
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
        li.onclick = () => window.location.href = `profile.html?uid=${friend.uid}`;

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

    const toggleAvatar = document.getElementById('toggleAvatar');
    if (toggleAvatar) toggleAvatar.src = avatar;

    const profileCard = document.getElementById('profileCard');
    if (profileCard) {
      profileCard.innerHTML = `
        <button class="profileBtn" id="profileBtn" onclick="window.location.href='profile.html'" aria-label="View profile">
          <img src="${avatar}" alt="${name}" />
        </button>
        <div>
          <strong style="cursor: pointer;" onclick="window.location.href='profile.html'">${name}</strong>
          <span>${uid ? '@' + uid : 'Not logged in'}</span>
        </div>
      `;
    }

    const profileAuthButtons = document.getElementById('profileAuthButtons');
    if (profileAuthButtons) {
      const isProfilePage = window.location.pathname.includes('profile.html');
      const urlParams = new URLSearchParams(window.location.search);
      const urlUid = urlParams.get('uid');
      const isOwner = isProfilePage && (!urlUid || urlUid === uid);

      if (isOwner) {
        profileAuthButtons.innerHTML = `
          <button onclick="window.openUserInfoModal()" class="action-pill active" style="padding: 10px 16px; font-size: 0.9rem; font-weight: 500; cursor: pointer; border: none; text-align: center; white-space: nowrap; width: 100%;">📝 Edit Info</button>
          <button onclick="window.triggerAvatarUpload()" class="action-pill active" style="padding: 10px 16px; font-size: 0.9rem; font-weight: 500; cursor: pointer; border: none; text-align: center; white-space: nowrap; width: 100%;">🖼️ Edit Photo</button>
          <button onclick="window.logoutUser()" class="action-pill" style="padding: 10px 16px; font-size: 0.9rem; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--text); text-align: center; white-space: nowrap; width: 100%;">🚪 Logout</button>
        `;
        profileAuthButtons.style.display = 'flex';
      } else {
        profileAuthButtons.innerHTML = '';
        profileAuthButtons.style.display = 'none';
      }
    }

    if (uid) {
      window.fetchFriendsList(uid);
    }
  };

  window.followUser = async function(followerId, followingId) {
    try {
      const authHeaders = await window.getAuthHeaders();
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ follower_id: followerId, following_id: followingId })
      });
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      alert('Successfully followed user!');
      window.updateProfileSidebar();
      if (typeof window.loadUserProfile === 'function') {
        window.loadUserProfile();
      }
    } catch (err) {
      alert(`Could not follow user: ${err.message}`);
    }
  };

  window.unfollowUser = async function(followerId, followingId) {
    try {
      const authHeaders = await window.getAuthHeaders();
      const res = await fetch('/api/unfollow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ follower_id: followerId, following_id: followingId })
      });
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      alert('Successfully unfollowed user!');
      window.updateProfileSidebar();
      if (typeof window.loadUserProfile === 'function') {
        window.loadUserProfile();
      }
    } catch (err) {
      alert(`Could not unfollow user: ${err.message}`);
    }
  };

  window.updateFollowButtonState = function(btn, isFollowing, sessionUid, targetUid) {
    if (isFollowing) {
      btn.textContent = 'Unfollow';
      btn.style.background = '#ef4444'; // Soft/bright reddish tone
      btn.style.border = 'none';
      btn.style.color = 'white';
      btn.onclick = () => window.unfollowUser(sessionUid, targetUid);
    } else {
      btn.textContent = 'Follow';
      btn.style.background = '#f97316'; // Orange Follow button
      btn.style.border = 'none';
      btn.style.color = 'white';
      btn.onclick = () => window.followUser(sessionUid, targetUid);
    }
    btn.style.display = 'inline-block';
  };
})();

