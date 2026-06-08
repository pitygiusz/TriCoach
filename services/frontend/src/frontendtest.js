const gatewayUrl = (typeof window !== 'undefined' && window.GATEWAY_URL)
  || (typeof process !== 'undefined' && process.env && process.env.GATEWAY_URL)
  || 'http://localhost:3000';
const currentUserId = 'user_janedoe_47';
const postsContainer = document.getElementById("postsContainer");
const menuPanel = document.getElementById("menuPanel");
const hamburgerBtn = document.getElementById("hamburgerBtn");
const closeMenuBtn = document.getElementById("closeMenu");
const newPostBtn = document.getElementById("newPostBtn");
const draftsBtn = document.getElementById("draftsBtn");
const settingsBtn = document.getElementById("settingsBtn");
const toggle = document.getElementById("toggle");

// Modal DOM Elements
const createPostModal = document.getElementById("createPostModal");
const openCreatePostBtn = document.getElementById("openCreatePostBtn");
const closePostModalBtn = document.getElementById("closePostModalBtn");
const workoutSelect = document.getElementById("workoutSelect");
const submitPostBtn = document.getElementById("submitPostBtn");
const postContentInput = document.getElementById("postContentInput");

const createTrainingModal = document.getElementById("createTrainingModal");
const openCreateTrainingBtn = document.getElementById("openCreateTrainingBtn");
const closeTrainingModalBtn = document.getElementById("closeTrainingModalBtn");
const trainingType = document.getElementById("trainingType");
const trainingDuration = document.getElementById("trainingDuration");
const trainingDistance = document.getElementById("trainingDistance");
const submitTrainingBtn = document.getElementById("submitTrainingBtn");

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'just now';
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function createPostCard(post) {
  const card = document.createElement("article");
  card.className = "post-card";
  const authorName = post.userId || post.user_name || 'Anonymous';
  const createdAt = post.createdAt || post.created_at || null;
  card.innerHTML = `
    <header>
      <img class="avatar" src="https://i.pravatar.cc/48?u=${authorName}" alt="${authorName}" />
      <div class="post-author">
        <strong>${authorName}</strong>
        <span>${formatTimeAgo(createdAt)}</span>
      </div>
    </header>
    <h3>${post.trainingId ? 'Training update' : 'New post'}</h3>
    <p>${post.content || post.body || ''}</p>
    <div class="post-meta">
      <span>${post.likes || 0} likes</span>
      <span>${post.trainingId ? 'Training attached' : 'No training attached'}</span>
    </div>
  `;
  return card;
}

function renderPosts(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    postsContainer.innerHTML = '<div class="empty-state">No posts are available right now.</div>';
    return;
  }

  postsContainer.innerHTML = "";
  posts.forEach(post => postsContainer.appendChild(createPostCard(post)));
}

function renderError(error) {
  postsContainer.innerHTML = `<div class="error-state">Unable to load posts. ${error.message || "Please check your posts service."}</div>`;
}

// Helper function to make API requests (inspired by index.ts makeRequest)
async function makeApiRequest(method, endpoint, data = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data) options.body = JSON.stringify(data);

    const response = await fetch(`${gatewayUrl}${endpoint}`, options);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`${response.status}: ${errorBody}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error);
    throw error;
  }
}

async function loadPosts() {
  try {
    const data = await makeApiRequest('GET', '/api/posts');
    renderPosts(data);
  } catch (error) {
    console.warn("Fetch posts failed:", error);
    renderError(error);
  }
}

// Fetch workouts function (for post modal dropdown)
async function fetchWorkouts() {
  workoutSelect.innerHTML = '<option value="">Loading workouts...</option>';

  try {
    console.log(`Fetching workouts for user: ${currentUserId}`);
    const result = await makeApiRequest('GET', `/api/workouts/${currentUserId}`);
    console.log("Workouts fetched:", result);

    workoutSelect.innerHTML = '<option value="">-- Select a training (Optional) --</option>';

    if (!Array.isArray(result.workouts) || result.workouts.length === 0) {
      workoutSelect.innerHTML = '<option value="">No past trainings found</option>';
      return;
    }

    result.workouts.forEach(workout => {
      const option = document.createElement("option");
      option.value = workout.id;
      const distance = parseFloat(workout.distance_km) || 0;
      option.textContent = `${workout.type || 'workout'} • ${workout.duration_minutes || 0} min • ${distance.toFixed(2)} km`;
      workoutSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error fetching workouts:", error);
    workoutSelect.innerHTML = '<option value="">Failed to load workouts</option>';
  }
}

function toggleSidebar() {
  document.getElementById('sidebarHid').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('visible');
}

// function toggleSidebar() {
//   document.getElementById('sidebar').classList.toggle('open');
// }

const profileBtn = document.getElementById("profileBtn");

profileBtn.addEventListener("click", () => {
  window.location.href = "profile.html";
});

function openMenu() {
  menuPanel.classList.toggle("hidden");
//   menuPanel.setAttribute("aria-hidden", "false");
}

// function closeMenu() {
//   menuPanel.classList.add("hidden");
//   menuPanel.setAttribute("aria-hidden", "true");
// }

toggle.addEventListener("click", toggleSidebar);
hamburgerBtn.addEventListener("click", openMenu);
// closeMenuBtn.addEventListener("click", closeMenu);
newPostBtn.addEventListener("click", () => alert("Open create post screen."));
draftsBtn.addEventListener("click", () => alert("Show draft posts."));
settingsBtn.addEventListener("click", () => alert("Open settings."));


// Initial load of posts
loadPosts();





// 1. Open modal and fetch workouts
openCreatePostBtn.addEventListener("click", async () => {
  createPostModal.classList.remove("hidden");
  await fetchWorkouts();
});
console.log("closePostModalBtn:", closePostModalBtn);
// 2. Close modal
closePostModalBtn.addEventListener("click", () => {
  createPostModal.classList.add("hidden");
});

// Training modal handlers
openCreateTrainingBtn.addEventListener("click", () => {
  createTrainingModal.classList.remove("hidden");
});
closeTrainingModalBtn.addEventListener("click", () => {
  createTrainingModal.classList.add("hidden");
});
submitTrainingBtn.addEventListener("click", async () => {
  const type = trainingType.value.trim();
  const duration = trainingDuration.value.trim();
  const distance = trainingDistance.value.trim();

  if (!type) {
    alert("Please select a training type.");
    return;
  }

  if (!duration || Number(duration) <= 0) {
    alert("Please enter a valid duration (greater than 0).");
    return;
  }

  const trainingPayload = {
    user_id: currentUserId,
    type,
    duration_minutes: parseInt(duration, 10),
    distance_km: distance ? parseFloat(distance) : null,
  };

  try {
    console.log("Submitting training:", trainingPayload);
    const result = await makeApiRequest('POST', '/api/workouts', trainingPayload);
    console.log("Training saved:", result);

    // Show success message
    alert("Training recorded successfully!");

    // Clear form inputs
    trainingType.value = "";
    trainingDuration.value = "";
    trainingDistance.value = "";
    
    // Close training modal
    createTrainingModal.classList.add("hidden");

    // Refresh the past trainings dropdown for the post modal
    await fetchWorkouts();
  } catch (error) {
    console.error("Error saving training:", error);
    alert(`Unable to save training: ${error.message}`);
  }
});

// 4. Submit the post
submitPostBtn.addEventListener("click", async () => {
  const content = postContentInput.value.trim();
  const trainingId = workoutSelect.value || null;

  if (!content) {
    alert("Please write something for your post!");
    return;
  }

  // Constructing your exact payload structure
  const postPayload = {
    user_id: currentUserId,
    content,
    training_id: trainingId,
  };

  try {
    console.log("Submitting post:", postPayload);
    const result = await makeApiRequest('POST', '/api/posts', postPayload);
    console.log("Post created:", result);

    // Clean up and close modal
    postContentInput.value = "";
    workoutSelect.value = "";
    createPostModal.classList.add("hidden");

    // Refresh the feed so the new post appears immediately
    loadPosts();
  } catch (error) {
    console.error("Error creating post:", error);
    alert(`Failed to create post: ${error.message}`);
  }
});