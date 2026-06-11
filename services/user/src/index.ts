import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import admin from 'firebase-admin';
import https from 'https';
import { Client } from 'pg';

const app = express();
app.use(express.json());
const port = process.env.PORT || '3001';

// Database Client Configuration
const connectionString = process.env.DATABASE_URL;
const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'password';
const dbName = process.env.DB_NAME || 'tricoach-db';
const cloudSqlConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;

const db = new Client(
  connectionString
    ? { connectionString }
    : cloudSqlConnectionName
    ? {
        user: dbUser,
        password: dbPassword,
        database: dbName,
        host: `/cloudsql/${cloudSqlConnectionName}`,
      }
    : {
        host: dbHost,
        user: dbUser,
        password: dbPassword,
        database: dbName,
      }
);

db.connect()
  .then(() => console.log('🚀 Direct Postgres connection established successfully.'))
  .catch(err => console.error('❌ Database connection failed:', err));

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
  res.status(200).json({ service: 'User Service (Direct Postgres)', status: 'ok' });
});

// Resolve username to email (Needed for frontend username login flow)
app.get('/users/resolve-email', async (req: Request, res: Response) => {
  try {
    const { username } = req.query;
    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username query parameter required' });
      return;
    }

    const result = await db.query(
      'SELECT email FROM "User" WHERE username = $1',
      [username.toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No user found with that username' });
      return;
    }

    res.status(200).json({ email: result.rows[0].email });
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

    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(username)) {
      res.status(400).json({ error: 'Username must be alphanumeric with no spaces or special characters' });
      return;
    }

    const normalizedUsername = username.toLowerCase();

    // Check uniqueness using raw SQL queries
    const duplicateCheck = await db.query(
      'SELECT id FROM "User" WHERE username = $1 OR email = $2',
      [normalizedUsername, email.toLowerCase()]
    );

    if (duplicateCheck.rows.length > 0) {
      res.status(400).json({ error: 'Username or Email is already taken' });
      return;
    }

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

    // Save profile record into the Postgres database directly
    await db.query(
      `INSERT INTO "User" (id, username, email, "firstName", "lastName", age, weight, "experienceLevel", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        firebaseUser.uid,
        normalizedUsername,
        email.toLowerCase(),
        firstName,
        lastName,
        age ? parseInt(age, 10) : null,
        weight ? parseFloat(weight) : null,
        experience_level ? parseInt(experience_level, 10) : 1,
      ]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        uid: firebaseUser.uid,
        username: normalizedUsername,
        email: email.toLowerCase(),
        firstName,
        lastName,
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
      const dbUserRes = await db.query('SELECT username FROM "User" WHERE id = $1', [decodedToken.uid]);

      res.status(200).json({
        message: 'Login successful',
        user: {
          uid: decodedToken.uid,
          username: dbUserRes.rows[0]?.username || decodedToken.email,
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

    if (!email.includes('@')) {
      const resolvedUser = await db.query('SELECT email FROM "User" WHERE username = $1', [email.toLowerCase()]);
      if (resolvedUser.rows.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      email = resolvedUser.rows[0].email;
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

    const dbUserRes = await db.query('SELECT username, email FROM "User" WHERE id = $1', [response.localId]);

    res.status(200).json({
      message: 'Login successful',
      user: {
        uid: response.localId,
        username: dbUserRes.rows[0]?.username || dbUserRes.rows[0]?.email,
        email: dbUserRes.rows[0]?.email,
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

// Fetch profile data from Postgres
app.get('/users/:userId/profile', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const result = await db.query(
      'SELECT id, username, email, "firstName", "lastName", age, weight, "experienceLevel" FROM "User" WHERE id = $1',
      [userId.toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const dbUser = result.rows[0];
    res.status(200).json({
      uid: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      age: dbUser.age,
      weight: dbUser.weight,
      experienceLevel: dbUser.experienceLevel,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile name params
app.put('/users/:userId/profile', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName } = req.body;

    const currentProfileRes = await db.query(
      'SELECT "firstName", "lastName" FROM "User" WHERE id = $1',
      [userId.toLowerCase()]
    );

    if (currentProfileRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const current = currentProfileRes.rows[0];
    const finalFirstName = firstName || current.firstName;
    const finalLastName = lastName || current.lastName;

    const updateRes = await db.query(
      `UPDATE "User" 
       SET "firstName" = $1, "lastName" = $2, "updatedAt" = NOW() 
       WHERE id = $3 
       RETURNING id, username, "firstName", "lastName"`,
      [finalFirstName, finalLastName, userId.toLowerCase()]
    );

    await auth.updateUser(userId, {
      displayName: `${finalFirstName} ${finalLastName}`,
    });

    const updatedUser = updateRes.rows[0];
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
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token endpoint
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

// Lookup user by username
app.get('/users/by-username/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const result = await db.query(
      'SELECT id, username, email FROM "User" WHERE username = $1',
      [username.toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const dbUser = result.rows[0];
    res.status(200).json({ uid: dbUser.id, username: dbUser.username, email: dbUser.email });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(Number(port), () => {
  console.log(`🏃 User Service running on port ${port}`);
});