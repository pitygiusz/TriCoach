import express, { Request, Response } from 'express';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, serverTimestamp, increment } from 'firebase/firestore';

const app = express();
app.use(express.json());
const port = process.env.PORT || '3004';

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'demo-key',
  projectId: process.env.FIREBASE_PROJECT_ID || 'tricoach-demo',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'tricoach-demo.appspot.com',
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ service: 'Social Service', status: 'ok' });
});

// Create a post
app.post('/posts', async (req: Request, res: Response) => {
  try {
    const { user_id, content } = req.body;

    if (!user_id || !content) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const postData = {
      userId: user_id,
      content,
      likes: 0,
      likedBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'posts'), postData);

    res.status(201).json({
      message: 'Post created successfully',
      post: {
        id: docRef.id,
        ...postData,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's feed (posts from followed users + own posts)
app.get('/feed/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Get followed users
    const followingSnapshot = await getDocs(
      query(collection(db, 'follows'), where('followerId', '==', userId))
    );

    const followedUserIds = followingSnapshot.docs.map(doc => doc.data().followingId);
    followedUserIds.push(userId); // Include own posts

    // Get posts from followed users
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', 'in', followedUserIds)
    );

    const postsSnapshot = await getDocs(postsQuery);
    const posts = postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by date and paginate
    const sortedPosts = posts.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
    const paginatedPosts = sortedPosts.slice(Number(offset), Number(offset) + Number(limit));

    res.status(200).json({
      total: sortedPosts.length,
      posts: paginatedPosts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Like a post
app.post('/posts/:postId/like', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      res.status(400).json({ error: 'User ID required' });
      return;
    }

    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      likes: increment(1),
      likedBy: [...new Array(1)].map(() => user_id), // Simplified tracking
    });

    res.status(200).json({ message: 'Post liked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Follow a user
app.post('/follow', async (req: Request, res: Response) => {
  try {
    const { follower_id, following_id } = req.body;

    if (!follower_id || !following_id) {
      res.status(400).json({ error: 'Missing follower or following ID' });
      return;
    }

    const followData = {
      followerId: follower_id,
      followingId: following_id,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'follows'), followData);

    res.status(201).json({
      message: 'User followed successfully',
      follow: {
        id: docRef.id,
        ...followData,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get followers
app.get('/followers/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const followersSnapshot = await getDocs(
      query(collection(db, 'follows'), where('followingId', '==', userId))
    );

    const followers = followersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      total_followers: followers.length,
      followers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get following
app.get('/following/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const followingSnapshot = await getDocs(
      query(collection(db, 'follows'), where('followerId', '==', userId))
    );

    const following = followingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      total_following: following.length,
      following,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(Number(port), () => {
  console.log(`💬 Social Service running on port ${port}`);
});
