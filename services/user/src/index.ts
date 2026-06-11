import express, { Request, Response } from 'express';
import admin from 'firebase-admin';
import https from 'https';
import { PrismaClient } from '@prisma/client';

const app = express();
app.use(express.json());
const port = process.env.PORT || '3001';
const prisma = new PrismaClient();

// Initialize Firebase Admin SDK
const firebaseAdmin = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || 'tricoach-496512',
});

const auth = firebaseAdmin.auth();
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || '';
const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ service: 'User Service (Firebase Auth)', status: 'ok' });
});

// Resolve username to email (Needed for front-end username login)
app.get('/users/resolve-email', async (req: Request, res: Response) => {
  try {
    const { username } = req.query;
    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username query parameter required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!user) {
      res.status(404).json({ error: 'No user found with that username' });
      return;
    }

    res.status(200).json({ email: user.email });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Register new user
app.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, firstName, lastName, age, weight, experience_level } = req.body;

    if (!username || !email || !password || !firstName || !lastName) {
      res.status(400).json({ error: 'Missing required fields: username, email, password, firstName, lastName' });
      return;
    }

    // Username formatting and validation: no spaces or special characters
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(username)) {
      res.status(400).json({ error: 'Username must be alphanumeric with no spaces or special characters' });
      return;
    }

    const normalizedUsername = username.toLowerCase();

    // Check uniqueness in Prisma
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: normalizedUsername }, { email: email.toLowerCase() }]
      }
    });

    if (existingUser) {
      res.status(400).json({ error: 'Username or Email is already taken' });
      return;
    }

    // Pass chosen username explicitly as the firebase uid
    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({
        uid: normalizedUsername, 
        email,
        password,
        displayName: `${firstName} ${lastName}`,
      });
    } catch (createError: any) {
      if (createError.code === 'auth/email-already-exists' || createError.code === 'auth/uid-already-exists') {
        res.status(400).json({ error: 'User already exists in authentication service' });
        return;
      }
      throw createError;
    }

    // Save profile record in Prisma Database
    const dbUser = await prisma.user.create({
      data: {
        id: firebaseUser.uid, // Username serves as primary key ID
        username: normalizedUsername,
        email: email.toLowerCase(),
        firstName,
        lastName,
        age: age ? parseInt(age, 10) : null,
        weight: weight ? parseFloat(weight) : null,
        experienceLevel: experience_level ? parseInt(experience_level, 10) : 1,
      }
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        uid: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
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
    let { email, password, idToken } = req.body;

    if (idToken) {
      const decodedToken = await auth.verifyIdToken(idToken);
      const dbUser = await prisma.user.findUnique({ where: { id: decodedToken.uid } });

      res.status(200).json({
        message: 'Login successful',
        user: {
          uid: decodedToken.uid,
          username: dbUser?.username || decodedToken.email,
          email: decodedToken.email,
        },
        token: idToken,
      });
      return;
    }

    if (!email || !password) {
      res.status(400).json({ error: 'Email/Username and password required' });
      return;
    }

    // Fallback mode support: Check if login input is an alphanumeric username rather than email
    if (!email.includes('@')) {
      const resolvedUser = await prisma.user.findUnique({ where: { username: email.toLowerCase() } });
      if (!resolvedUser) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      email = resolvedUser.email;
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

    const dbUser = await prisma.user.findUnique({ where: { id: response.localId } });

    res.status(200).json({
      message: 'Login successful',
      user: {
        uid: response.localId,
        username: dbUser?.username || dbUser?.email,
        email: dbUser?.email,
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

// Fetch user profile from Prisma
app.get('/users/:userId/profile', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const dbUser = await prisma.user.findUnique({
      where: { id: userId.toLowerCase() }
    });

    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      uid: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile names
app.put('/users/:userId/profile', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId.toLowerCase() },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      }
    });

    // Mirror to Firebase Auth profile display layer
    await auth.updateUser(userId, {
      displayName: `${updatedUser.firstName} ${updatedUser.lastName}`,
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        uid: updatedUser.id,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
      },
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lookup user by username
app.get('/users/by-username/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const dbUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });

    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(200).json({ uid: dbUser.id, username: dbUser.username, email: dbUser.email });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(Number(port), () => {
  console.log(`🏃 User Service running on port ${port}`);
});