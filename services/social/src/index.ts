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

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ service: 'Social Service', status: 'ok' });
});

// Create a post
app.post('/posts', async (req: Request, res: Response) => {
  try {
    const { user_id, username, title, imageUrl, content, training_id, training_details } = req.body;

    if (!user_id || !content) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const postData = {
      userId: user_id,
      username: username || 'Anonymous',
      title: title || null,
      imageUrl: imageUrl || null,
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
      post: { id: docRef.id, ...postData },
    });
  } catch (error: any) {
    console.error('Create post error:', error);
    res.status(500).json({ error: error.message || error.toString() });
  }
});

// Helper to fetch rich user profiles and training details for posts
async function populatePostsMetadata(posts: any[]) {
  try {
    // 1. Gather all unique UIDs involved (Authors + Likers)
    const uidSet = new Set<string>();
    posts.forEach(p => {
      if (p.userId) uidSet.add(p.userId);
      if (Array.isArray(p.likedBy)) {
        p.likedBy.forEach((like:any) => {
          const uid = typeof like === 'object' && like !== null ? like.uid : like;
          if (uid) uidSet.add(uid);
        });
      }
    });

    // 2. Fetch User Profiles directly from the 'users' collection to get Avatars & Full Names
    const userMap: Record<string, any> = {};
    const uids = Array.from(uidSet);
    if (uids.length > 0) {
      try {
        const userDocs = await Promise.all(uids.map(uid => db.collection('users').doc(uid).get()));
        userDocs.forEach(doc => {
          if (doc.exists) userMap[doc.id] = doc.data();
        });
      } catch (err) {
        console.error('Error fetching user profiles:', err);
      }
    }

    const trainingServiceUrl = process.env.TRAINING_SERVICE_URL || 'http://localhost:3002';
    
    const populated = await Promise.all(posts.map(async (post) => {
      // --- Author Profile Rich Data ---
      const authorData = userMap[post.userId] || {};
      const fullName = [authorData.firstName, authorData.lastName].filter(Boolean).join(' ') || authorData.username || post.username;
      const authorProfile = {
        fullName,
        username: authorData.username || post.username || 'athlete',
        profilePicture: authorData.profilePicture || null,
        uid: post.userId
      };

      // --- Likers Rich Data ---
      const populatedLikedBy = (post.likedBy || []).map((like: any) => {
        const uid = typeof like === 'object' && like !== null ? like.uid : like;
        const likerData = userMap[uid] || {};
        const likerName = [likerData.firstName, likerData.lastName].filter(Boolean).join(' ') || likerData.username || (typeof like === 'object' ? like.username : 'Athlete');
        return { uid, name: likerName };
      });

      // --- Fetch Training Details ---
      let trainingDetails = post.trainingDetails;
      if (post.trainingId) {
        try {
          const workoutRes = await fetch(`${trainingServiceUrl}/workouts/${post.userId}?limit=200`);
          if (workoutRes.ok) {
            const workoutData = await workoutRes.json();
            const matchingWorkout = workoutData.workouts?.find((w: any) => w.id === post.trainingId);
            if (matchingWorkout) {
              trainingDetails = {
                type: matchingWorkout.type,
                duration_minutes: matchingWorkout.duration_minutes !== undefined ? matchingWorkout.duration_minutes : matchingWorkout.durationMinutes,
                distance_km: matchingWorkout.distance_km !== undefined ? matchingWorkout.distance_km : matchingWorkout.distanceKm,
              };
            }
          }
        } catch (trainErr) {}
      }

      // --- Fetch Comments ---
      let comments: any[] = [];
      try {
        const commentsSnapshot = await db.collection('posts').doc(post.id).collection('comments').orderBy('createdAt', 'asc').get();
        comments = commentsSnapshot.docs.map(doc => {
          const data = doc.data();
          const cAuthor = userMap[data.userId] || {}; // Fast lookup if they are already in the map
          return {
            id: doc.id,
            userId: data.userId,
            content: data.content,
            createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null,
            authorProfile: {
              fullName: [cAuthor.firstName, cAuthor.lastName].filter(Boolean).join(' ') || cAuthor.username || data.username || 'Anonymous',
              username: cAuthor.username || 'athlete',
              profilePicture: cAuthor.profilePicture || null,
            }
          };
        });
      } catch (commentErr) {}

      return {
        ...post,
        authorProfile,
        likedBy: populatedLikedBy,
        trainingDetails,
        comments,
      };
    }));

    return populated;
  } catch (err) {
    console.error('Error populating metadata:', err);
    return posts;
  }
}

// Get all posts
app.get('/posts', async (req: Request, res: Response) => {
  try {
    const postsSnapshot = await db.collection('posts').get();
    const rawPosts = postsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null,
        updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : null,
      };
    });

    const populatedPosts = await populatePostsMetadata(rawPosts);
    const sortedPosts = populatedPosts.sort((a: any, b: any) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    res.status(200).json(sortedPosts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || error.toString() });
  }
});

// Get user's feed
app.get('/feed/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const followingSnapshot = await db.collection('follows').where('followerId', '==', userId).get();
    const followedUserIds = followingSnapshot.docs.map((doc) => doc.data().followingId);
    followedUserIds.push(userId); 

    const postsSnapshot = await db.collection('posts').where('userId', 'in', followedUserIds).get();
    const rawPosts = postsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null,
        updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : null,
      };
    });

    const populatedPosts = await populatePostsMetadata(rawPosts);
    const sortedPosts = populatedPosts.sort((a: any, b: any) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    const paginatedPosts = sortedPosts.slice(Number(offset), Number(offset) + Number(limit));

    res.status(200).json({ total: sortedPosts.length, posts: paginatedPosts });
  } catch (error: any) {
    res.status(500).json({ error: error.message || error.toString() });
  }
});

// Like / Unlike / Follow functionality remains exactly the same as your original file
// ... (Keep the rest of your original routes here untouched)

app.listen(Number(port), () => {
  console.log(` social service (admin sdk) running on port ${port}`);
});