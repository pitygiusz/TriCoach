import express, { Request, Response } from 'express';
import admin from 'firebase-admin';

const app = express();
app.use(express.json());
const port = process.env.PORT || '3004';

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || 'tricoach-496512',
});

const db = admin.firestore();

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ service: 'Social Service (Admin SDK)', status: 'ok' });
});

// Create a post
app.post('/posts', async (req: Request, res: Response) => {
  try {
    const { user_id, username, content, training_id, training_details } = req.body;

    if (!user_id || !content) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const postData = {
      userId: user_id,
      username: username || 'Anonymous',
      trainingId: training_id || null,
      trainingDetails: training_details || null,
      content,
      likes: 0,
      likedBy: [] as any[],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('posts').add(postData);

    res.status(201).json({
      message: 'Post created successfully',
      post: {
        id: docRef.id,
        ...postData,
      },
    });
  } catch (error: any) {
    console.error('Create post error:', error);
    res.status(500).json({ error: error.message || error.toString(), stack: error.stack });
  }
});

// Get all posts
app.get('/posts', async (req: Request, res: Response) => {
  try {
    const postsSnapshot = await db.collection('posts').get();
    const posts = postsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        username: data.username || 'Anonymous',
        trainingId: data.trainingId || null,
        trainingDetails: data.trainingDetails || null,
        content: data.content,
        likes: data.likes || 0,
        likedBy: data.likedBy || [],
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null,
        updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : null,
      };
    });

    const sortedPosts = posts.sort((a: any, b: any) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    res.status(200).json(sortedPosts);
  } catch (error: any) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: error.message || error.toString(), stack: error.stack });
  }
});

// Get user's feed (posts from followed users + own posts)
app.get('/feed/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Get followed users
    const followingSnapshot = await db.collection('follows').where('followerId', '==', userId).get();

    const followedUserIds = followingSnapshot.docs.map((doc) => doc.data().followingId);
    followedUserIds.push(userId); // Include own posts

    // Get posts from followed users
    const postsSnapshot = await db.collection('posts').where('userId', 'in', followedUserIds).get();
    const posts = postsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        username: data.username || 'Anonymous',
        trainingId: data.trainingId || null,
        trainingDetails: data.trainingDetails || null,
        content: data.content,
        likes: data.likes || 0,
        likedBy: data.likedBy || [],
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null,
        updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : null,
      };
    });

    // Sort by date and paginate
    const sortedPosts = posts.sort((a: any, b: any) => {
      const aTime = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
      const bTime = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
      return bTime - aTime;
    });
    const paginatedPosts = sortedPosts.slice(Number(offset), Number(offset) + Number(limit));

    res.status(200).json({
      total: sortedPosts.length,
      posts: paginatedPosts,
    });
  } catch (error: any) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: error.message || error.toString(), stack: error.stack });
  }
});

// Like a post
app.post('/posts/:postId/like', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { user_id, username } = req.body;

    if (!user_id) {
      res.status(400).json({ error: 'User ID required' });
      return;
    }

    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    const postData = postDoc.data() || {};
    const likedBy = postData.likedBy || [];
    
    // Check if user already liked the post
    const alreadyLiked = likedBy.some((like: any) => {
      if (typeof like === 'object' && like !== null) {
        return like.uid === user_id;
      }
      return like === user_id;
    });

    if (alreadyLiked) {
      res.status(400).json({ error: 'You have already liked this post' });
      return;
    }

    const newLike = { uid: user_id, username: username || 'Athlete' };
    await postRef.update({
      likes: admin.firestore.FieldValue.increment(1),
      likedBy: admin.firestore.FieldValue.arrayUnion(newLike),
    });

    res.status(200).json({ message: 'Post liked successfully' });
  } catch (error: any) {
    console.error('Like post error:', error);
    res.status(500).json({ error: error.message || error.toString(), stack: error.stack });
  }
});

// Unlike a post
app.post('/posts/:postId/unlike', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      res.status(400).json({ error: 'User ID required' });
      return;
    }

    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    const postData = postDoc.data() || {};
    const likedBy = postData.likedBy || [];

    // Find the like element to remove
    const likeToRemove = likedBy.find((like: any) => {
      if (typeof like === 'object' && like !== null) {
        return like.uid === user_id;
      }
      return like === user_id;
    });

    if (!likeToRemove) {
      res.status(400).json({ error: 'You have not liked this post yet' });
      return;
    }

    await postRef.update({
      likes: admin.firestore.FieldValue.increment(-1),
      likedBy: admin.firestore.FieldValue.arrayRemove(likeToRemove),
    });

    res.status(200).json({ message: 'Post unliked successfully' });
  } catch (error: any) {
    console.error('Unlike post error:', error);
    res.status(500).json({ error: error.message || error.toString(), stack: error.stack });
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('follows').add(followData);

    res.status(201).json({
      message: 'User followed successfully',
      follow: {
        id: docRef.id,
        ...followData,
      },
    });
  } catch (error: any) {
    console.error('Follow error:', error);
    res.status(500).json({ error: error.message || error.toString(), stack: error.stack });
  }
});

// Get followers
app.get('/followers/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const followersSnapshot = await db.collection('follows').where('followingId', '==', userId).get();

    const followers = followersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      total_followers: followers.length,
      followers,
    });
  } catch (error: any) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: error.message || error.toString(), stack: error.stack });
  }
});

// Get following
app.get('/following/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const followingSnapshot = await db.collection('follows').where('followerId', '==', userId).get();

    const following = followingSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      total_following: following.length,
      following,
    });
  } catch (error: any) {
    console.error('Get following error:', error);
    res.status(500).json({ error: error.message || error.toString(), stack: error.stack });
  }
});

app.listen(Number(port), () => {
  console.log(` social service (admin sdk) running on port ${port}`);
});
