import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());
const port = process.env.PORT || '8080';
const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';

// Firebase config from env vars with fallback defaults
const firebaseApiKey = process.env.FIREBASE_API_KEY || 'api_key';
const firebaseAuthDomain = process.env.FIREBASE_AUTH_DOMAIN || 'key';
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || 'key';
const firebaseStorageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'key';
const firebaseMessagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID || 'key';
const firebaseAppId = process.env.FIREBASE_APP_ID || 'key';
const firebaseMeasurementId = process.env.FIREBASE_MEASUREMENT_ID || 'key';

const testHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TriCoach - Service Test Console</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            background: #1a1a1a;
            color: #e0e0e0;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        h1 {
            color: #FFD700;
            margin-bottom: 30px;
            text-align: center;
        }
        .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .service-card {
            background: #2a2a2a;
            border: 2px solid #FFD700;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
        }
        .service-card h2 {
            color: #FFD700;
            margin-bottom: 15px;
            font-size: 1.3rem;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
            background: #ff4444;
        }
        .status-indicator.online {
            background: #44ff44;
        }
        .service-status {
            margin-bottom: 15px;
            font-size: 0.9rem;
        }
        .endpoint-list {
            background: #1a1a1a;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 15px;
            max-height: 200px;
            overflow-y: auto;
        }
        .endpoint {
            padding: 8px;
            border-left: 3px solid #FFD700;
            margin-bottom: 5px;
            background: #222;
            font-size: 0.85rem;
        }
        .endpoint.post { border-left-color: #4CAF50; }
        .endpoint.get { border-left-color: #2196F3; }
        .endpoint.put { border-left-color: #FF9800; }
        .endpoint-method {
            font-weight: bold;
            margin-right: 8px;
        }
        .endpoint-method.post { color: #4CAF50; }
        .endpoint-method.get { color: #2196F3; }
        .endpoint-method.put { color: #FF9800; }
        button {
            background: #FFD700;
            color: #1a1a1a;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            margin-right: 10px;
            margin-bottom: 10px;
            transition: all 0.3s;
        }
        button:hover {
            background: #e6c200;
            transform: scale(1.05);
        }
        button.secondary {
            background: #555;
            color: #fff;
        }
        button.secondary:hover {
            background: #666;
        }
        .response-panel {
            background: #0a0a0a;
            border: 1px solid #FFD700;
            border-radius: 4px;
            padding: 15px;
            margin-top: 20px;
        }
        .response-panel h3 {
            color: #FFD700;
            margin-bottom: 10px;
        }
        .response-content {
            background: #1a1a1a;
            padding: 10px;
            border-radius: 4px;
            max-height: 400px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 0.9rem;
            color: #90EE90;
        }
        .response-content.error {
            color: #FF6B6B;
        }
        input, select, textarea {
            background: #333;
            color: #e0e0e0;
            border: 1px solid #555;
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 8px;
            width: 100%;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
        }
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #FFD700;
            box-shadow: 0 0 5px rgba(255, 215, 0, 0.3);
        }
        .form-group {
            margin-bottom: 12px;
        }
        label {
            display: block;
            margin-bottom: 4px;
            color: #FFD700;
            font-size: 0.9rem;
        }
        .gateway-info {
            background: #2a2a2a;
            border: 1px solid #FFD700;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            text-align: center;
        }
        .gateway-info p {
            margin: 5px 0;
        }
        .gateway-info code {
            background: #1a1a1a;
            padding: 2px 6px;
            border-radius: 3px;
            color: #4CAF50;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏃 TriCoach - Service Test Console</h1>
        
        <div class="gateway-info">
            <p><strong>Gateway:</strong> <code>http://localhost:3000</code></p>
            <p><strong>Status:</strong> <span class="status-indicator online"></span> Ready to test</p>
        </div>

        <div class="services-grid">
            <!-- USER SERVICE -->
            <div class="service-card">
                <h2>👤 User Service</h2>
                <div class="service-status">
                    <span class="status-indicator" id="user-status"></span>
                    <span id="user-status-text">Checking...</span>
                </div>
                
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="user-email" placeholder="user@example.com" value="test@example.com">
                </div>
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="user-username" placeholder="username" value="testuser">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="text" id="user-password" placeholder="password" value="test123">
                </div>
                <div class="form-group">
                    <label>Age</label>
                    <input type="number" id="user-age" placeholder="30" value="30">
                </div>
                <div class="form-group">
                    <label>User ID (for queries)</label>
                    <input type="text" id="user-id" placeholder="uuid" value="123e4567-e89b-12d3-a456-426614174000">
                </div>
                
                <button onclick="registerUser()">Register User</button>
                <button onclick="loginUser()">Login User</button>
                <button onclick="getProfile()">Get Profile</button>
                <button class="secondary" onclick="clearUserResponse()">Clear</button>
                
                <div class="response-panel">
                    <h3>Response</h3>
                    <div class="response-content" id="user-response">Ready...</div>
                </div>
            </div>

            <!-- TRAINING SERVICE -->
            <div class="service-card">
                <h2>🚴 Training Service</h2>
                <div class="service-status">
                    <span class="status-indicator" id="training-status"></span>
                    <span id="training-status-text">Checking...</span>
                </div>
                
                <div class="form-group">
                    <label>User ID</label>
                    <input type="text" id="training-user-id" placeholder="uuid" value="123e4567-e89b-12d3-a456-426614174000">
                </div>
                <div class="form-group">
                    <label>Workout Type</label>
                    <select id="workout-type">
                        <option value="run">Run</option>
                        <option value="bike">Bike</option>
                        <option value="swim">Swim</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Duration (minutes)</label>
                    <input type="number" id="workout-duration" placeholder="60" value="60">
                </div>
                <div class="form-group">
                    <label>Distance (km)</label>
                    <input type="number" id="workout-distance" placeholder="10" value="10">
                </div>
                
                <button onclick="logWorkout()">Log Workout</button>
                <button onclick="getWorkouts()">Get Workouts</button>
                <button class="secondary" onclick="clearTrainingResponse()">Clear</button>
                
                <div class="response-panel">
                    <h3>Response</h3>
                    <div class="response-content" id="training-response">Ready...</div>
                </div>
            </div>

            <!-- ANALYTICS SERVICE -->
            <div class="service-card">
                <h2>📊 Analytics Service</h2>
                <div class="service-status">
                    <span class="status-indicator" id="analytics-status"></span>
                    <span id="analytics-status-text">Checking...</span>
                </div>
                
                <div class="form-group">
                    <label>User ID</label>
                    <input type="text" id="analytics-user-id" placeholder="uuid" value="123e4567-e89b-12d3-a456-426614174000">
                </div>
                
                <button onclick="getStats()">Get Stats</button>
                <button onclick="getWeeklyTrends()">Weekly Trends</button>
                <button onclick="getMonthlyTrends()">Monthly Trends</button>
                <button onclick="getMilestones()">Get Milestones</button>
                <button class="secondary" onclick="clearAnalyticsResponse()">Clear</button>
                
                <div class="response-panel">
                    <h3>Response</h3>
                    <div class="response-content" id="analytics-response">Ready...</div>
                </div>
            </div>

            <!-- SOCIAL SERVICE -->
            <div class="service-card">
                <h2>💬 Social Service</h2>
                <div class="service-status">
                    <span class="status-indicator" id="social-status"></span>
                    <span id="social-status-text">Checking...</span>
                </div>
                
                <div class="form-group">
                    <label>User ID</label>
                    <input type="text" id="social-user-id" placeholder="uuid" value="123e4567-e89b-12d3-a456-426614174000">
                </div>
                <div class="form-group">
                    <label>Post Content</label>
                    <textarea id="post-content" placeholder="Just crushed 5km!" rows="3">Just crushed 5km in 25 mins! 🔥</textarea>
                </div>
                
                <button onclick="createPost()">Create Post</button>
                <button onclick="getFeed()">Get Feed</button>
                <button class="secondary" onclick="clearSocialResponse()">Clear</button>
                
                <div class="response-panel">
                    <h3>Response</h3>
                    <div class="response-content" id="social-response">Ready...</div>
                </div>
            </div>

            <!-- RACE SERVICE -->
            <div class="service-card">
                <h2>🏁 Race Service</h2>
                <div class="service-status">
                    <span class="status-indicator" id="race-status"></span>
                    <span id="race-status-text">Checking...</span>
                </div>
                
                <div class="form-group">
                    <label>User ID</label>
                    <input type="text" id="race-user-id" placeholder="uuid" value="123e4567-e89b-12d3-a456-426614174000">
                </div>
                <div class="form-group">
                    <label>Race Type</label>
                    <select id="race-type">
                        <option value="sprint">Sprint</option>
                        <option value="olympic">Olympic</option>
                        <option value="half_ironman">Half Ironman</option>
                        <option value="ironman">Ironman</option>
                    </select>
                </div>
                
                <button onclick="simulateRace()">Simulate Race</button>
                <button onclick="simulateRaceAI()">AI Simulate</button>
                <button onclick="getRaces()">Get Races Info</button>
                <button class="secondary" onclick="clearRaceResponse()">Clear</button>
                
                <div class="response-panel">
                    <h3>Response</h3>
                    <div class="response-content" id="race-response">Ready...</div>
                </div>
            </div>

            <!-- GATEWAY SERVICE -->
            <div class="service-card">
                <h2>🚪 API Gateway</h2>
                <div class="service-status">
                    <span class="status-indicator" id="gateway-status"></span>
                    <span id="gateway-status-text">Checking...</span>
                </div>
                
                <div class="form-group">
                    <label>Custom Endpoint</label>
                    <input type="text" id="custom-endpoint" placeholder="/api/users/profile/uuid">
                </div>
                <div class="form-group">
                    <label>Method</label>
                    <select id="custom-method">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Body (JSON)</label>
                    <textarea id="custom-body" placeholder="{}"></textarea>
                </div>
                
                <button onclick="customRequest()">Send Request</button>
                <button onclick="checkGateway()">Check Gateway</button>
                <button class="secondary" onclick="clearGatewayResponse()">Clear</button>
                
                <div class="response-panel">
                    <h3>Response</h3>
                    <div class="response-content" id="gateway-response">Ready...</div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
    <script>
        const GATEWAY_URL = '${gatewayUrl}';
        let currentUser = null;
        let auth = null;

        // Firestore status check (runs immediately, no Firebase dependency)
        function startStatusChecks() {
            checkServiceStatus('user', 'User Service');
            checkServiceStatus('training', 'Training Service');
            checkServiceStatus('analytics', 'Analytics Service');
            checkServiceStatus('social', 'Social Service');
            checkServiceStatus('race', 'Race Service');
            checkServiceStatus('gateway', 'API Gateway');
        }

        window.addEventListener('load', startStatusChecks);

        async function checkServiceStatus(service, name) {
            try {
                const response = await fetch(\`\${GATEWAY_URL}/\`);
                document.getElementById(\`\${service}-status\`).classList.add('online');
                document.getElementById(\`\${service}-status-text\`).textContent = 'Online';
            } catch (error) {
                document.getElementById(\`\${service}-status-text\`).textContent = 'Offline';
            }
        }

        async function makeRequest(method, endpoint, data = null) {
            try {
                const options = {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                };
                if (data) options.body = JSON.stringify(data);

                const response = await fetch(\`\${GATEWAY_URL}\${endpoint}\`, options);
                const result = await response.json();
                return JSON.stringify(result, null, 2);
            } catch (error) {
                return JSON.stringify({ error: error.message }, null, 2);
            }
        }

        // Initialize Firebase (if SDK loaded successfully)
        try {
            const firebaseConfig = {
                apiKey: '${firebaseApiKey}',
                authDomain: '${firebaseAuthDomain}',
                projectId: '${firebaseProjectId}',
                storageBucket: '${firebaseStorageBucket}',
                messagingSenderId: '${firebaseMessagingSenderId}',
                appId: '${firebaseAppId}',
                measurementId: '${firebaseMeasurementId}',
            };

            firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            console.log('🔥 Firebase Auth initialized');
        } catch (e) {
            console.warn('Firebase SDK not available, login/register will use backend fallback');
        }

        // USER SERVICE – Firebase Auth with fallback
        async function registerUser() {
            try {
                const email = document.getElementById('user-email').value;
                const password = document.getElementById('user-password').value;
                const username = document.getElementById('user-username').value;
                const age = parseInt(document.getElementById('user-age').value);

                if (auth) {
                    // Create user via Firebase Auth SDK
                    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                    await userCredential.user.updateProfile({ displayName: username });
                    const idToken = await userCredential.user.getIdToken();

                    const response = await makeRequest('POST', '/api/users/register', {
                        username, email, password, age, idToken,
                    });
                    currentUser = userCredential.user;
                    document.getElementById('user-response').textContent = response;
                } else {
                    // Fallback: backend handles everything
                    const response = await makeRequest('POST', '/api/users/register', {
                        username, email, password, age,
                    });
                    document.getElementById('user-response').textContent = response;
                }
            } catch (error) {
                document.getElementById('user-response').textContent = JSON.stringify({
                    error: error.message,
                    code: error.code,
                }, null, 2);
            }
        }

        async function loginUser() {
            try {
                const email = document.getElementById('user-email').value;
                const password = document.getElementById('user-password').value;

                if (auth) {
                    // Login via Firebase Auth SDK
                    const userCredential = await auth.signInWithEmailAndPassword(email, password);
                    const idToken = await userCredential.user.getIdToken();

                    const response = await fetch(\`\${GATEWAY_URL}/api/users/login\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, idToken }),
                    });
                    const result = await response.json();
                    currentUser = userCredential.user;
                    document.getElementById('user-response').textContent = JSON.stringify(result, null, 2);
                } else {
                    // Fallback: backend handles via REST API
                    const response = await makeRequest('POST', '/api/users/login', { email, password });
                    document.getElementById('user-response').textContent = response;
                }
            } catch (error) {
                document.getElementById('user-response').textContent = JSON.stringify({
                    error: error.message,
                    code: error.code,
                }, null, 2);
            }
        }

        async function getProfile() {
            const userId = document.getElementById('user-id').value;
            const response = await makeRequest('GET', \`/api/users/\${userId}/profile\`);
            document.getElementById('user-response').textContent = response;
        }

        // TRAINING SERVICE
        async function logWorkout() {
            const data = {
                user_id: document.getElementById('training-user-id').value,
                type: document.getElementById('workout-type').value,
                duration_minutes: parseInt(document.getElementById('workout-duration').value),
                distance_km: parseFloat(document.getElementById('workout-distance').value),
            };
            const response = await makeRequest('POST', '/api/workouts', data);
            document.getElementById('training-response').textContent = response;
        }

        async function getWorkouts() {
            const userId = document.getElementById('training-user-id').value;
            const response = await makeRequest('GET', \`/api/workouts/\${userId}\`);
            document.getElementById('training-response').textContent = response;
        }

        // ANALYTICS SERVICE
        async function getStats() {
            const userId = document.getElementById('analytics-user-id').value;
            const response = await makeRequest('GET', \`/api/stats/\${userId}\`);
            document.getElementById('analytics-response').textContent = response;
        }

        async function getWeeklyTrends() {
            const userId = document.getElementById('analytics-user-id').value;
            const response = await makeRequest('GET', \`/api/trends/\${userId}/weekly\`);
            document.getElementById('analytics-response').textContent = response;
        }

        async function getMonthlyTrends() {
            const userId = document.getElementById('analytics-user-id').value;
            const response = await makeRequest('GET', \`/api/trends/\${userId}/monthly\`);
            document.getElementById('analytics-response').textContent = response;
        }

        async function getMilestones() {
            const userId = document.getElementById('analytics-user-id').value;
            const response = await makeRequest('GET', \`/api/milestones/\${userId}\`);
            document.getElementById('analytics-response').textContent = response;
        }

        // SOCIAL SERVICE
        async function createPost() {
            const data = {
                user_id: document.getElementById('social-user-id').value,
                content: document.getElementById('post-content').value,
            };
            const response = await makeRequest('POST', '/api/posts', data);
            document.getElementById('social-response').textContent = response;
        }

        async function getFeed() {
            const userId = document.getElementById('social-user-id').value;
            const response = await makeRequest('GET', \`/api/feed/\${userId}\`);
            document.getElementById('social-response').textContent = response;
        }

        // RACE SERVICE
        async function simulateRace() {
            const data = {
                user_id: document.getElementById('race-user-id').value,
                race_type: document.getElementById('race-type').value,
            };
            const response = await makeRequest('POST', '/api/race/simulate', data);
            document.getElementById('race-response').textContent = response;
        }

        async function simulateRaceAI() {
            const data = {
                user_id: document.getElementById('race-user-id').value,
                race_type: document.getElementById('race-type').value,
            };
            document.getElementById('race-response').textContent = '⏳ AI is analyzing your training data...';
            const response = await makeRequest('POST', '/api/race/simulate-ai', data);
            document.getElementById('race-response').textContent = response;
        }

        async function getRaces() {
            const response = await makeRequest('GET', '/api/races');
            document.getElementById('race-response').textContent = response;
        }

        // GATEWAY
        async function customRequest() {
            const method = document.getElementById('custom-method').value;
            const endpoint = document.getElementById('custom-endpoint').value;
            const bodyText = document.getElementById('custom-body').value;
            const data = bodyText ? JSON.parse(bodyText) : null;
            const response = await makeRequest(method, endpoint, data);
            document.getElementById('gateway-response').textContent = response;
        }

        async function checkGateway() {
            const response = await makeRequest('GET', '/');
            document.getElementById('gateway-response').textContent = response;
        }

        // Clear responses
        const clearFunctions = {
            clearUserResponse: 'user-response',
            clearTrainingResponse: 'training-response',
            clearAnalyticsResponse: 'analytics-response',
            clearSocialResponse: 'social-response',
            clearRaceResponse: 'race-response',
            clearGatewayResponse: 'gateway-response',
        };

        Object.entries(clearFunctions).forEach(([fn, id]) => {
            window[fn] = () => {
                document.getElementById(id).textContent = 'Ready...';
            };
        });
    </script>
</body>
</html>`;

const luxeHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TriCoach - Luxury Training Elite</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --gold: #FFD700;
            --dark-luxe: #0a0a0a;
            --deep-gold: #DAA520;
            --white-prime: #FFFEF9;
            --accent-pink: #FF1493;
            --cyan: #00F0FF;
            --shadow-luxe: 0 20px 60px rgba(255, 215, 0, 0.15);
        }

        html {
            scroll-behavior: smooth;
        }

        body {
            font-family: 'Playfair Display', 'Georgia', serif;
            background: linear-gradient(135deg, var(--dark-luxe) 0%, #1a1a2e 50%, #16213e 100%);
            color: var(--white-prime);
            overflow-x: hidden;
            line-height: 1.6;
        }

        /* LUXE HEADER */
        .header {
            position: fixed;
            top: 0;
            width: 100%;
            z-index: 1000;
            background: rgba(10, 10, 10, 0.95);
            backdrop-filter: blur(10px);
            border-bottom: 2px solid var(--gold);
            padding: 1.5rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: var(--shadow-luxe);
        }

        .logo {
            font-size: 2rem;
            font-weight: 900;
            background: linear-gradient(135deg, var(--gold), var(--accent-pink), var(--cyan));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: 2px;
            text-transform: uppercase;
            animation: logoGlow 3s ease-in-out infinite;
        }

        @keyframes logoGlow {
            0%, 100% { filter: drop-shadow(0 0 8px var(--gold)); }
            50% { filter: drop-shadow(0 0 16px var(--accent-pink)); }
        }

        .nav {
            display: flex;
            gap: 3rem;
            align-items: center;
        }

        .nav-link {
            color: var(--white-prime);
            text-decoration: none;
            font-size: 0.95rem;
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 1px;
            position: relative;
            transition: all 0.3s ease;
        }

        .nav-link::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 0;
            width: 0;
            height: 2px;
            background: linear-gradient(90deg, var(--gold), var(--accent-pink));
            transition: width 0.3s ease;
        }

        .nav-link:hover::after {
            width: 100%;
        }

        .cta-btn {
            background: linear-gradient(135deg, var(--gold), var(--deep-gold));
            color: var(--dark-luxe);
            padding: 0.8rem 2rem;
            border: none;
            border-radius: 50px;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 1px;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 10px 30px rgba(255, 215, 0, 0.3);
        }

        .cta-btn:hover {
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 15px 40px rgba(255, 215, 0, 0.5);
        }

        /* HERO SECTION */
        .hero {
            margin-top: 80px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
            overflow: hidden;
            padding: 2rem;
        }

        .hero::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -10%;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(255, 215, 0, 0.1), transparent);
            border-radius: 50%;
            animation: float 20s infinite ease-in-out;
        }

        .hero::after {
            content: '';
            position: absolute;
            bottom: -30%;
            left: -5%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(255, 20, 147, 0.08), transparent);
            border-radius: 50%;
            animation: float 25s infinite ease-in-out reverse;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            25% { transform: translateY(-30px) translateX(20px); }
            50% { transform: translateY(-60px) translateX(-20px); }
            75% { transform: translateY(-30px) translateX(20px); }
        }

        .hero-content {
            position: relative;
            z-index: 10;
            text-align: center;
            max-width: 900px;
        }

        .hero-title {
            font-size: 4.5rem;
            font-weight: 900;
            margin-bottom: 1.5rem;
            background: linear-gradient(135deg, var(--gold) 0%, var(--accent-pink) 50%, var(--cyan) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1.1;
            text-transform: uppercase;
            letter-spacing: 3px;
            animation: slideInDown 0.8s ease-out;
        }

        @keyframes slideInDown {
            from {
                opacity: 0;
                transform: translateY(-50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .hero-subtitle {
            font-size: 1.3rem;
            color: var(--gold);
            margin-bottom: 3rem;
            font-family: 'Montserrat', sans-serif;
            font-weight: 300;
            letter-spacing: 2px;
            animation: slideInUp 0.8s ease-out 0.2s both;
        }

        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .hero-buttons {
            display: flex;
            gap: 2rem;
            justify-content: center;
            flex-wrap: wrap;
            animation: slideInUp 0.8s ease-out 0.4s both;
        }

        .secondary-btn {
            background: transparent;
            color: var(--gold);
            padding: 1rem 2.5rem;
            border: 2px solid var(--gold);
            border-radius: 50px;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 1px;
            transition: all 0.3s ease;
        }

        .secondary-btn:hover {
            background: var(--gold);
            color: var(--dark-luxe);
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(255, 215, 0, 0.4);
        }

        /* FEATURES SECTION */
        .features {
            padding: 6rem 2rem;
            background: linear-gradient(180deg, transparent, rgba(255, 215, 0, 0.03));
            position: relative;
            z-index: 5;
        }

        .section-title {
            text-align: center;
            font-size: 3rem;
            margin-bottom: 4rem;
            color: var(--gold);
            text-transform: uppercase;
            letter-spacing: 3px;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 2.5rem;
            max-width: 1400px;
            margin: 0 auto;
        }

        .feature-card {
            background: rgba(255, 215, 0, 0.05);
            border: 1px solid rgba(255, 215, 0, 0.2);
            padding: 2.5rem;
            border-radius: 15px;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            overflow: hidden;
        }

        .feature-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.1), transparent);
            transition: left 0.6s ease;
        }

        .feature-card:hover {
            transform: translateY(-10px) scale(1.02);
            border-color: var(--gold);
            box-shadow: var(--shadow-luxe), inset 0 0 30px rgba(255, 215, 0, 0.1);
        }

        .feature-card:hover::before {
            left: 100%;
        }

        .feature-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }

        .feature-title {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: var(--white-prime);
            font-weight: 700;
        }

        .feature-text {
            color: rgba(255, 254, 249, 0.8);
            line-height: 1.8;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.95rem;
        }

        /* STATS SECTION */
        .stats {
            padding: 4rem 2rem;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 2rem;
            max-width: 1000px;
            margin: 0 auto;
        }

        .stat-item {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 215, 0, 0.08);
            border-radius: 10px;
            border-left: 4px solid var(--gold);
        }

        .stat-number {
            font-size: 3rem;
            color: var(--gold);
            font-weight: 900;
            margin-bottom: 0.5rem;
        }

        .stat-label {
            color: var(--white-prime);
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 1px;
            font-weight: 600;
        }

        /* CTA SECTION */
        .cta-section {
            padding: 5rem 2rem;
            text-align: center;
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 20, 147, 0.08));
            border-top: 2px solid var(--gold);
            border-bottom: 2px solid var(--gold);
        }

        .cta-title {
            font-size: 2.5rem;
            margin-bottom: 1.5rem;
            color: var(--gold);
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .cta-text {
            font-size: 1.1rem;
            margin-bottom: 2rem;
            color: var(--white-prime);
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        /* FOOTER */
        .footer {
            background: rgba(10, 10, 10, 0.8);
            border-top: 2px solid var(--gold);
            padding: 3rem 2rem;
            text-align: center;
            position: relative;
            z-index: 5;
        }

        .footer-content {
            max-width: 1000px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }

        .footer-section h4 {
            color: var(--gold);
            margin-bottom: 1rem;
            font-size: 1.1rem;
            letter-spacing: 1px;
        }

        .footer-section a {
            color: var(--white-prime);
            text-decoration: none;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.9rem;
            display: block;
            margin-bottom: 0.5rem;
            transition: color 0.3s ease;
        }

        .footer-section a:hover {
            color: var(--gold);
        }

        .footer-bottom {
            border-top: 1px solid rgba(255, 215, 0, 0.2);
            padding-top: 2rem;
            color: rgba(255, 254, 249, 0.6);
            font-family: 'Montserrat', sans-serif;
            font-size: 0.9rem;
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
            .hero-title {
                font-size: 2.5rem;
            }

            .hero-subtitle {
                font-size: 1rem;
            }

            .nav {
                gap: 1.5rem;
                font-size: 0.9rem;
            }

            .section-title {
                font-size: 2rem;
            }

            .hero-buttons {
                flex-direction: column;
                gap: 1rem;
            }

            .cta-btn, .secondary-btn {
                width: 100%;
            }
        }

        /* SCROLL ANIMATIONS */
        .fade-in {
            animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
</head>
<body>
    <!-- HEADER -->
    <header class="header">
        <div class="logo">TriCoach Elite</div>
        <nav class="nav">
            <a href="#programs" class="nav-link">Programs</a>
            <a href="#features" class="nav-link">Features</a>
            <a href="#community" class="nav-link">Community</a>
            <button class="cta-btn">Join Now</button>
        </nav>
    </header>

    <!-- HERO -->
    <section class="hero">
        <div class="hero-content">
            <h1 class="hero-title">Serving Luxury Gains</h1>
            <p class="hero-subtitle">Where Champions Train Like Royalty</p>
            <div class="hero-buttons">
                <button class="cta-btn">Start Your Elite Journey</button>
                <button class="secondary-btn">Explore Premium Programs</button>
            </div>
        </div>
    </section>

    <!-- FEATURES -->
    <section id="features" class="features">
        <h2 class="section-title">Your Glorious Arsenal</h2>
        <div class="features-grid">
            <div class="feature-card fade-in">
                <div class="feature-icon">💎</div>
                <h3 class="feature-title">Premium Programs</h3>
                <p class="feature-text">Curated elite training protocols designed by champions. Serve looks and serve results.</p>
            </div>
            <div class="feature-card fade-in">
                <div class="feature-icon">👑</div>
                <h3 class="feature-title">Royal Coaching</h3>
                <p class="feature-text">1-on-1 elite coaching with the industry's finest. Your personal diva demands excellence.</p>
            </div>
            <div class="feature-card fade-in">
                <div class="feature-icon">⚡</div>
                <h3 class="feature-title">Real-time Analytics</h3>
                <p class="feature-text">Track every slay. Visualize your wins. Own your transformation with precision metrics.</p>
            </div>
            <div class="feature-card fade-in">
                <div class="feature-icon">🏆</div>
                <h3 class="feature-title">Achievement Runway</h3>
                <p class="feature-text">Unlock badges and achievements. Walk the runway of success with exclusive rewards.</p>
            </div>
            <div class="feature-card fade-in">
                <div class="feature-icon">🎯</div>
                <h3 class="feature-title">Smart Planning</h3>
                <p class="feature-text">AI-powered personalization. Your goals become our obsession. We serve what you need.</p>
            </div>
            <div class="feature-card fade-in">
                <div class="feature-icon">👥</div>
                <h3 class="feature-title">Elite Community</h3>
                <p class="feature-text">Connect with royalty. Share your wins. Network with the finest trainers and athletes globally.</p>
            </div>
        </div>
    </section>

    <!-- STATS -->
    <section class="stats">
        <div class="stat-item">
            <div class="stat-number">50K+</div>
            <div class="stat-label">Elite Members</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">10M+</div>
            <div class="stat-label">Workouts Served</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">99.8%</div>
            <div class="stat-label">Satisfaction Slayed</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">42+</div>
            <div class="stat-label">Countries Served</div>
        </div>
    </section>

    <!-- CTA SECTION -->
    <section class="cta-section">
        <h2 class="cta-title">Ready to Serve Looks & Gains?</h2>
        <p class="cta-text">Join the elite circle where every workout is a statement, every goal is a victory, and every day you're serving excellence.</p>
        <button class="cta-btn">Claim Your Crown Now</button>
    </section>

    <!-- FOOTER -->
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-section">
                <h4>Programs</h4>
                <a href="#strength">Strength Elite</a>
                <a href="#endurance">Endurance Royal</a>
                <a href="#transformation">Transformation Luxe</a>
            </div>
            <div class="footer-section">
                <h4>Company</h4>
                <a href="#about">About Us</a>
                <a href="#careers">Careers</a>
                <a href="#press">Press</a>
            </div>
            <div class="footer-section">
                <h4>Legal</h4>
                <a href="#privacy">Privacy Policy</a>
                <a href="#terms">Terms of Service</a>
                <a href="#contact">Contact Support</a>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2026 TriCoach Elite. Serving Excellence Globally. 👑 XOXO</p>
        </div>
    </footer>

    <script>
        // SMOOTH SCROLL & ANIMATIONS
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href !== '#') {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });

        // INTERSECTION OBSERVER FOR FADE-IN
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.fade-in').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'all 0.8s ease-out';
            observer.observe(el);
        });

        // BUTTON INTERACTIONS
        document.querySelectorAll('.cta-btn, .secondary-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 200);
            });
        });

        console.log('✨ TriCoach Elite Frontend Loaded - Serving Luxury Gains Since Day 1 👑');
    </script>
</body>
</html>`;

// Serve the test console at the root
app.get('/', (req: Request, res: Response) => {
  res.status(200).send(testHTML);
});

app.listen(Number(port), () => {
  console.log(`🎯 Frontend Test Console running on port ${port}`);
  console.log(`📍 Access at http://localhost:${port}`);
});
