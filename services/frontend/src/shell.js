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
          <div class="friends-search-row" style="margin-bottom: 12px; display: flex; gap: 8px;">
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

    // Set up the hamburger/toggle button for mobile, creating it if it doesn't exist on the page
    const { toggleBtn, overlay } = ensureSidebarToggle();
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const sidebarEl = document.getElementById('sidebarHid');
        if (sidebarEl) {
          sidebarEl.classList.toggle('open');
          if (sidebarEl.classList.contains('open')) {
            document.body.classList.add('lock-scroll');
          } else {
            document.body.classList.remove('lock-scroll');
          }
        }
        if (overlay) overlay.classList.toggle('visible');
      });
    }
    if (overlay) {
      overlay.addEventListener('click', () => {
        const sidebarEl = document.getElementById('sidebarHid');
        if (sidebarEl) sidebarEl.classList.remove('open');
        if (overlay) overlay.classList.remove('visible');
        document.body.classList.remove('lock-scroll');
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
        body {
          overflow-x: hidden;
          width: 100%;
        }
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
        .friends-search-row {
          flex-direction: column !important;
          gap: 8px !important;
        }
        .friends-search-row input,
        .friends-search-row button {
          width: 100% !important;
        }
      }
      body.lock-scroll {
        overflow: hidden;
        height: 100%;
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
        const avatar = sessionStorage.getItem('pgAvatar') || 'https://i.pravatar.cc/80?img=47';
        toggleBtn.innerHTML = `<img src="${avatar}" alt="Toggle Sidebar" />`;
        topbar.appendChild(toggleBtn);
      }
    }
    return { toggleBtn, overlay };
  }
})();