const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';
const postsEndpoint = `${gatewayUrl}/posts`;
const postsContainer = document.getElementById("postsContainer");
const menuPanel = document.getElementById("menuPanel");
const hamburgerBtn = document.getElementById("hamburgerBtn");
const closeMenuBtn = document.getElementById("closeMenu");
const newPostBtn = document.getElementById("newPostBtn");
const draftsBtn = document.getElementById("draftsBtn");
const settingsBtn = document.getElementById("settingsBtn");
const toggle = document.getElementById("toggle");

function createPostCard(post) {
  const card = document.createElement("article");
  card.className = "post-card";
  card.innerHTML = `
    <header>
      <img class="avatar" src="${post.author.avatar || 'https://i.pravatar.cc/48'}" alt="${post.author.name}" />
      <div class="post-author">
        <strong>${post.author.name}</strong>
        <span>${post.author.username} · ${post.timeAgo}</span>
      </div>
    </header>
    <h3>${post.title}</h3>
    <p>${post.body}</p>
    <div class="post-meta">
      <span>${post.comments} comments</span>
      <span>${post.likes} likes</span>
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

async function loadPosts() {
  try {
    const response = await fetch(postsEndpoint);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const data = await response.json();
    renderPosts(data);
  } catch (error) {
    console.warn("Fetch posts failed:", error);
    renderError(error);
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





// Modal DOM Elements
const createPostModal = document.getElementById("createPostModal");
const openCreatePostBtn = document.getElementById("openCreatePostBtn");
const closePostModalBtn = document.getElementById("closePostModalBtn");
const workoutSelect = document.getElementById("workoutSelect");
const submitPostBtn = document.getElementById("submitPostBtn");
const postContentInput = document.getElementById("postContentInput");

const WORKOUTS_API = `${gatewayUrl}/workouts`;
const CREATE_POST_API = `${gatewayUrl}/posts`;

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

// 3. Fetch workouts function
async function fetchWorkouts() {
  workoutSelect.innerHTML = '<option value="">Loading...</option>';
  
  try {
    const response = await fetch(WORKOUTS_API);
    const data = await response.json();
    
    workoutSelect.innerHTML = '<option value="">-- Select a training (Optional) --</option>';
    
    data.workouts.forEach(workout => {
      const option = document.createElement("option");
      option.value = workout.id;
      option.textContent = workout.name;
      workoutSelect.appendChild(option);
    });
    
  } catch (error) {
    console.error("Error fetching workouts:", error);
    workoutSelect.innerHTML = '<option value="">Failed to load workouts</option>';
  }
}

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
    id: "post_" + Math.random().toString(36).substr(2, 9), // Generating a dummy ID
    userId: "user_janedoe_47", // Assuming a logged-in user
    content: content,
    trainingId: trainingId
  };

  try {
    const response = await fetch(CREATE_POST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postPayload)
    });
    
    if (!response.ok) throw new Error("Failed to post");

    // Logging the payload to the console so you can verify it works
    console.log("SUCCESS! Payload sent to API:", postPayload);
    
    // Clean up and close modal
    postContentInput.value = "";
    workoutSelect.value = "";
    createPostModal.classList.add("hidden");
    
    // Optional: Call loadPosts() here to refresh the feed!
    
  } catch (error) {
    console.error("Error creating post:", error);
    alert("Failed to create post. Try again.");
  }
});