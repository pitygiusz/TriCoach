import express, { Request, Response } from 'express';
import admin from 'firebase-admin';
import https from 'https';

const app = express();
app.use(express.json());
const port = process.env.PORT || '3001';

// Initialize Firebase Admin SDK
const firebaseAdmin = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const auth = firebaseAdmin.auth();

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || '';
const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ service: 'User Service (Firebase Auth)', status: 'ok' });
});

// Register new user
app.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, age, weight, experience_level } = req.body;

    if (!username || !email) {
      res.status(400).json({ error: 'Missing required fields: username, email' });
      return;
    }

    let firebaseUser;
    try {
      // Try to create user in Firebase Auth
      firebaseUser = await auth.createUser({
        email,
        password,
        displayName: username,
      });
    } catch (createError: any) {
      // If user already exists (e.g. created by frontend SDK), fetch them instead
      if (createError.code === 'auth/email-already-exists') {
        firebaseUser = await auth.getUserByEmail(email);
      } else {
        throw createError;
      }
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        uid: firebaseUser.uid,
        username,
        email: firebaseUser.email,
        age: age || null,
        weight: weight || null,
        experience_level: experience_level || 1,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);

    if (error.code === 'auth/weak-password') {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Login user
app.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, idToken } = req.body;

    // If idToken provided by frontend SDK, verify it directly
    if (idToken) {
      const decodedToken = await auth.verifyIdToken(idToken);
      const firebaseUser = await auth.getUser(decodedToken.uid);

      res.status(200).json({
        message: 'Login successful',
        user: {
          uid: firebaseUser.uid,
          username: firebaseUser.displayName,
          email: firebaseUser.email,
        },
        token: idToken,
      });
      return;
    }

    // Fallback: email+password via REST API (for non-SDK clients)
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const response = await new Promise<any>((resolve, reject) => {
      const postData = JSON.stringify({ email, password, returnSecureToken: true });

      const parsedUrl = new URL(signInUrl);
      const reqHttps = https.request(
        {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        (res: any) => {
          let data = '';
          res.on('data', (chunk: string) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (res.statusCode !== 200) {
                reject(new Error(parsed.error?.message || 'Authentication failed'));
              } else {
                resolve(parsed);
              }
            } catch {
              reject(new Error('Invalid response from Firebase'));
            }
          });
        }
      );
      reqHttps.on('error', reject);
      reqHttps.write(postData);
      reqHttps.end();
    });

    const firebaseUser = await auth.getUser(response.localId);

    res.status(200).json({
      message: 'Login successful',
      user: {
        uid: firebaseUser.uid,
        username: firebaseUser.displayName,
        email: firebaseUser.email,
      },
      token: response.idToken,
      refreshToken: response.refreshToken,
    });
  } catch (error: any) {
    console.error('Login error:', error);

    if (error.message === 'EMAIL_NOT_FOUND' || error.message === 'INVALID_PASSWORD' || error.message === 'INVALID_LOGIN_CREDENTIALS') {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Verify Firebase ID token and get user profile
app.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const firebaseUser = await auth.getUser(userId);

    res.status(200).json({
      uid: firebaseUser.uid,
      username: firebaseUser.displayName,
      email: firebaseUser.email,
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'auth/user-not-found') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile (displayName in Firebase)
app.put('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { username } = req.body;

    await auth.updateUser(userId, {
      displayName: username || undefined,
    });

    const firebaseUser = await auth.getUser(userId);

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        uid: firebaseUser.uid,
        username: firebaseUser.displayName,
        email: firebaseUser.email,
      },
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'auth/user-not-found') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token endpoint – used by gateway to validate requests
app.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({ error: 'ID token required' });
      return;
    }

    const decodedToken = await auth.verifyIdToken(idToken);

    res.status(200).json({
      uid: decodedToken.uid,
      email: decodedToken.email,
      valid: true,
    });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Lookup user by username (displayName)
app.get('/users/by-username/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const listUsersResult = await auth.listUsers();
    const user = listUsersResult.users.find(
      (u) => u.displayName?.toLowerCase() === username.toLowerCase()
    );
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(200).json({ uid: user.uid, username: user.displayName, email: user.email });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.listen(Number(port), () => {
  console.log(`🏃 User Service (Firebase Auth) running on port ${port}`);
});
