import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  getReactNativePersistence,
  signInAnonymously,
  User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import {
  User as AnalyticsUser,
  SparkFeedback,
  AnalyticsEvent,
  FeatureFlag,
  AggregatedRating,
  AggregatedRatingItem,
  AnalyticsData,
  SessionData,
} from "../types/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate Firebase config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn(
    "⚠️ Firebase configuration is missing in WebFirebaseService.ts. Please set EXPO_PUBLIC_FIREBASE_* environment variables in your .env file."
  );
}

export class WebFirebaseService {
  private static _initialized: boolean = false;
  private static auth: any = null;
  private static db: any = null;
  private static currentUser: User | null = null;

  static async initialize(): Promise<void> {
    console.log("🚀 WebFirebaseService.initialize() called");

    try {
      // Initialize Firebase if not already initialized
      let app;
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      // Initialize Firestore
      this.db = getFirestore(app);

      // Try to initialize Auth (optional)
      try {
        // Initialize Auth with appropriate persistence
        try {
          const persistence =
            Platform.OS === "web"
              ? browserLocalPersistence
              : getReactNativePersistence
              ? getReactNativePersistence(AsyncStorage)
              : browserLocalPersistence;

          this.auth = initializeAuth(app, {
            persistence: persistence,
          });
          console.log(
            `✅ Initialized Auth with ${
              Platform.OS === "web" ? "browser" : "AsyncStorage"
            } persistence`
          );
        } catch (initError: any) {
          // If already initialized, just get the existing auth instance
          if (initError.code === "auth/already-initialized") {
            this.auth = getAuth(app);
            console.log("✅ Using existing Auth instance");
          } else {
            throw initError;
          }
        }

        // Try anonymous sign-in with retry logic
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            console.log(
              `🔄 Attempting anonymous sign-in (attempt ${retryCount + 1})`
            );
            const userCredential = await signInAnonymously(this.auth);
            this.currentUser = userCredential.user;
            console.log(
              "✅ Firebase Auth initialized with user:",
              this.currentUser.uid
            );
            console.log(
              "✅ Auth token available:",
              !!(this.currentUser as any).accessToken
            );
            break; // Success, exit retry loop
          } catch (signInError: any) {
            retryCount++;
            console.log(
              `⚠️ Anonymous sign-in attempt ${retryCount} failed:`,
              signInError.message
            );

            if (retryCount >= maxRetries) {
              console.log(
                "❌ All anonymous sign-in attempts failed, continuing without auth"
              );
              // Continue without auth - Firestore will still work
            } else {
              // Wait before retry
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }
      } catch (authError: any) {
        console.log(
          "⚠️ Firebase Auth not available, continuing without auth:",
          authError.message
        );
        // Continue without auth - Firestore will still work
      }

      this._initialized = true;
      console.log(
        "✅ Web Firebase initialized with user:",
        this.currentUser?.uid
      );
    } catch (error) {
      console.error("❌ Failed to initialize Web Firebase:", error);
      throw error;
    }
  }

  static isInitialized(): boolean {
    return WebFirebaseService._initialized;
  }

  static async getCurrentUser(): Promise<AnalyticsUser | null> {
    if (!this._initialized || !this.currentUser) {
      return null;
    }

    try {
      return {
        id: this.currentUser.uid,
        isAnonymous: this.currentUser.isAnonymous,
        createdAt: this.currentUser.metadata.creationTime
          ? new Date(this.currentUser.metadata.creationTime)
          : new Date(),
        lastSignInAt: this.currentUser.metadata.lastSignInTime
          ? new Date(this.currentUser.metadata.lastSignInTime)
          : new Date(),
      };
    } catch (error) {
      console.log("⚠️ Error getting current user:", error);
      return null;
    }
  }

  static async submitFeedback(
    feedback: Omit<
      SparkFeedback,
      "id" | "timestamp" | "createdAt" | "updatedAt"
    >
  ): Promise<string> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }

    try {
      const feedbackData = {
        ...feedback,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(
        collection(this.db, "feedback"),
        feedbackData
      );
      console.log("✅ Feedback submitted with ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("❌ Error submitting feedback:", error);
      throw error;
    }
  }

  static async getFeedback(
    sparkId: string,
    userId?: string
  ): Promise<SparkFeedback[]> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }

    try {
      let q;
      if (userId) {
        q = query(
          collection(this.db, "feedback"),
          where("sparkId", "==", sparkId),
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(
          collection(this.db, "feedback"),
          where("sparkId", "==", sparkId),
          orderBy("createdAt", "desc")
        );
      }

      const querySnapshot = await getDocs(q);
      const feedback: SparkFeedback[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        feedback.push({
          id: doc.id,
          sparkId: data.sparkId,
          userId: data.userId,
          rating: data.rating,
          text: data.comment || data.text || "",
          response: data.response || "",
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          adminResponse: data.adminResponse || null,
          sparkName: data.sparkName || "Unknown Spark",
          sessionDuration: data.sessionDuration || 0,
          completedActions: data.completedActions || [],
          feedbackType: data.feedbackType || "rating",
          appVersion: data.appVersion || "1.0.0",
          platform: data.platform || "web",
          timestamp: data.createdAt.toDate(),
        });
      });

      console.log(
        `✅ Retrieved ${feedback.length} feedback items for spark ${sparkId}`
      );
      return feedback;
    } catch (error) {
      console.error("❌ Error getting feedback:", error);
      throw error;
    }
  }

  static async getUserFeedback(
    userId: string,
    sparkId: string
  ): Promise<SparkFeedback[]> {
    if (!this._initialized || !this.db) {
      console.log(
        "⚠️ Firebase not initialized, returning empty feedback array"
      );
      return [];
    }

    try {
      const q = query(
        collection(this.db, "feedback"),
        where("userId", "==", userId),
        where("sparkId", "==", sparkId),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const feedback: SparkFeedback[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        feedback.push({
          id: doc.id,
          sparkId: data.sparkId,
          userId: data.userId,
          rating: data.rating || 0,
          text: data.comment || data.text || "",
          response: data.response || "",
          hasUnreadAdminResponse: data.hasUnreadAdminResponse || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          sparkName: data.sparkName || "Unknown Spark",
          sessionDuration: data.sessionDuration || 0,
          completedActions: data.completedActions || [],
          feedbackType: data.feedbackType || "rating",
          appVersion: data.appVersion || "1.0.0",
          platform: data.platform || "web",
          timestamp: data.createdAt.toDate(),
        });
      });

      console.log(
        `✅ Retrieved ${feedback.length} user feedback items for user ${userId} and spark ${sparkId}`
      );
      return feedback;
    } catch (error) {
      console.error("❌ Error getting user feedback:", error);
      return []; // Return empty array instead of throwing
    }
  }

  static async updateFeedback(
    feedbackId: string,
    updates: Partial<SparkFeedback>
  ): Promise<void> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }

    try {
      const feedbackRef = doc(this.db, "feedback", feedbackId);
      await setDoc(
        feedbackRef,
        {
          ...updates,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      console.log("✅ Feedback updated:", feedbackId);
    } catch (error) {
      console.error("❌ Error updating feedback:", error);
      throw error;
    }
  }

  static async logAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }

    try {
      const eventData = {
        ...event,
        timestamp: Timestamp.now(),
      };

      await addDoc(collection(this.db, "analytics_events"), eventData);
      console.log("✅ Analytics event logged:", event.eventName);
    } catch (error) {
      console.error("❌ Error logging analytics event:", error);
      throw error;
    }
  }

  static async getGlobalAnalytics(
    days: number = 14
  ): Promise<AnalyticsEvent[]> {
    if (!this._initialized || !this.db) {
      console.log("⚠️ Firebase not initialized, returning empty analytics");
      return [];
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      console.log(
        `🔥 getGlobalAnalytics: Starting query for last ${days} days`
      );
      console.log(`🔥 Query start date:`, startDate.toISOString());
      console.log(`🔥 Querying collection: 'analytics'`);

      const q = query(
        collection(this.db, "analytics"),
        where("timestamp", ">=", Timestamp.fromDate(startDate)),
        orderBy("timestamp", "desc")
      );

      const querySnapshot = await getDocs(q);
      console.log(
        `🔥 Query completed. Documents found: ${querySnapshot.docs.length}`
      );

      if (querySnapshot.docs.length > 0) {
        console.log(
          `🔥 Sample document (first):`,
          querySnapshot.docs[0].data()
        );
      } else {
        console.log(`🔥 No documents found in 'analytics' collection`);
      }

      const events: AnalyticsEvent[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        events.push({
          id: doc.id,
          userId: data.userId || null,
          deviceId: data.deviceId || undefined,
          eventType: data.eventType || data.eventName || "unknown",
          eventName: data.eventName || data.eventType,
          sparkId: data.sparkId,
          eventData: data.eventData || data.properties || {},
          properties: data.properties || data.eventData || {},
          timestamp: data.timestamp?.toDate
            ? data.timestamp.toDate()
            : data.timestamp || new Date(),
          sessionId: data.sessionId || "",
          appVersion: data.appVersion || "1.0.0",
          platform: data.platform || "ios",
        });
      });

      console.log(`🔥 Returning ${events.length} analytics events`);
      return events;
    } catch (error) {
      console.error("❌ Error getting global analytics:", error);
      console.error(
        "❌ Error details:",
        (error as any).message,
        (error as any).code
      );
      return [];
    }
  }

  static async getAnalyticsData(
    sparkId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsData> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }

    try {
      const q = query(
        collection(this.db, "analytics_events"),
        where("sparkId", "==", sparkId),
        where("timestamp", ">=", Timestamp.fromDate(startDate)),
        where("timestamp", "<=", Timestamp.fromDate(endDate)),
        orderBy("timestamp", "desc")
      );

      const querySnapshot = await getDocs(q);
      const events: AnalyticsEvent[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        events.push({
          id: doc.id,
          sparkId: data.sparkId,
          eventName: data.eventName,
          properties: data.properties || {},
          userId: data.userId,
          sessionId: data.sessionId,
          timestamp: data.timestamp.toDate(),
          eventType: data.eventType || data.eventName || "unknown",
          eventData: data.eventData || data.properties || {},
          appVersion: data.appVersion || "1.0.0",
          platform: data.platform || "web",
        });
      });

      events.sort(
        (a, b) =>
          (b.timestamp as any).getTime() - (a.timestamp as any).getTime()
      );

      // Calculate aggregated data
      const totalEvents = events.length;
      const uniqueUsers = new Set(events.map((e) => e.userId)).size;
      const sparkOpens = events.filter(
        (e) => e.eventName === "spark_open"
      ).length;
      const sparkCompletes = events.filter(
        (e) => e.eventName === "spark_complete"
      ).length;

      const analyticsData: AnalyticsData = {
        sparkId,
        startDate,
        endDate,
        totalEvents,
        uniqueUsers,
        sparkOpens,
        sparkCompletes,
        events,
      };

      console.log(
        `✅ Retrieved analytics data for spark ${sparkId}: ${totalEvents} events, ${uniqueUsers} unique users`
      );
      return analyticsData;
    } catch (error) {
      console.error("❌ Error getting analytics data:", error);
      throw error;
    }
  }

  static async getAggregatedRatings(
    sparkId: string
  ): Promise<AggregatedRating> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }

    try {
      const q = query(
        collection(this.db, "feedback"),
        where("sparkId", "==", sparkId),
        where("rating", "!=", null)
      );

      const querySnapshot = await getDocs(q);
      const ratings: number[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.rating) {
          ratings.push(data.rating);
        }
      });

      // Calculate aggregated ratings
      const totalRatings = ratings.length;
      const sum = ratings.reduce((acc, rating) => acc + rating, 0);
      const averageRating = totalRatings > 0 ? sum / totalRatings : 0;

      const ratingDistribution: { [key: number]: number } = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };
      ratings.forEach((rating) => {
        ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
      });

      const aggregatedRating: AggregatedRating = {
        averageRating: Math.round(averageRating * 100) / 100,
        totalRatings,
        ratingDistribution,
      };

      console.log(
        `✅ Retrieved aggregated ratings for spark ${sparkId}: ${ratings.length} total ratings`
      );
      return aggregatedRating;
    } catch (error) {
      console.error("❌ Error getting aggregated ratings:", error);
      throw error;
    }
  }

  static async createFeatureFlag(
    flag: Omit<FeatureFlag, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }

    try {
      const flagData = {
        ...flag,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(
        collection(this.db, "feature_flags"),
        flagData
      );
      console.log("✅ Feature flag created with ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("❌ Error creating feature flag:", error);
      throw error;
    }
  }

  static async getFeatureFlag(flagId: string): Promise<FeatureFlag | null> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }

    try {
      const flagDoc = await getDoc(doc(this.db, "feature_flags", flagId));

      if (!flagDoc.exists()) {
        return null;
      }

      const data = flagDoc.data();
      return {
        id: flagDoc.id,
        name: data.name,
        description: data.description,
        enabled: data.enabled,
        rolloutPercentage: data.rolloutPercentage,
        targetAudience: data.targetAudience,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    } catch (error) {
      console.error("❌ Error getting feature flag:", error);
      throw error;
    }
  }

  static async updateFeatureFlag(
    flagId: string,
    updates: Partial<FeatureFlag>
  ): Promise<void> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }

    try {
      const flagRef = doc(this.db, "feature_flags", flagId);
      await setDoc(
        flagRef,
        {
          ...updates,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      console.log("✅ Feature flag updated:", flagId);
    } catch (error) {
      console.error("❌ Error updating feature flag:", error);
      throw error;
    }
  }

  static async getSessionData(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SessionData[]> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }

    try {
      const q = query(
        collection(this.db, "analytics_events"),
        where("userId", "==", userId),
        where("timestamp", ">=", Timestamp.fromDate(startDate)),
        where("timestamp", "<=", Timestamp.fromDate(endDate)),
        orderBy("timestamp", "desc")
      );

      const querySnapshot = await getDocs(q);
      const sessionMap: { [key: string]: SessionData } = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const sessionId = data.sessionId;

        if (!sessionMap[sessionId]) {
          sessionMap[sessionId] = {
            sessionId: sessionId,
            userId: data.userId,
            sparkId: data.sparkId,
            startTime: data.timestamp.toDate(),
            endTime: data.timestamp.toDate(),
            duration: 0,
            actions: [],
            completed: false,
            platform: "web",
            appVersion: "1.0.0",
            eventCount: 0,
          };
        }

        sessionMap[sessionId].eventCount =
          (sessionMap[sessionId].eventCount || 0) + 1;
        sessionMap[sessionId].endTime = data.timestamp.toDate();
        if (sessionMap[sessionId].endTime && sessionMap[sessionId].startTime) {
          const end =
            sessionMap[sessionId].endTime instanceof Date
              ? (sessionMap[sessionId].endTime as Date)
              : (sessionMap[sessionId].endTime as any).toDate();
          const start =
            sessionMap[sessionId].startTime instanceof Date
              ? (sessionMap[sessionId].startTime as Date)
              : (sessionMap[sessionId].startTime as any).toDate();
          sessionMap[sessionId].duration = end.getTime() - start.getTime();
        }
      });

      const sessions = Object.values(sessionMap);
      console.log(
        `✅ Retrieved ${sessions.length} sessions for user ${userId}`
      );
      return sessions;
    } catch (error) {
      console.error("❌ Error getting session data:", error);
      throw error;
    }
  }

  // Additional methods needed for compatibility
  static async updateFeedbackResponse(
    feedbackId: string,
    response: { adminId: string; text: string }
  ): Promise<void> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }

    try {
      // Debug authentication status
      console.log("🔍 Auth status:", this.auth?.currentUser);
      console.log("🔍 Auth UID:", this.auth?.currentUser?.uid);
      console.log("🔍 Auth token:", this.auth?.currentUser?.accessToken);

      // Update only the main feedback document with the response
      const feedbackRef = doc(this.db, "feedback", feedbackId);
      await updateDoc(feedbackRef, {
        response: response.text,
        adminId: response.adminId,
        respondedAt: new Date(),
      });

      console.log("✅ Feedback response updated successfully");
    } catch (error) {
      console.error("Error updating feedback response:", error);
      throw error;
    }
  }

  static async markFeedbackAsViewedByAdmin(feedbackId: string): Promise<void> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }

    try {
      const feedbackRef = doc(this.db, "feedback", feedbackId);
      await updateDoc(feedbackRef, {
        viewedByAdmin: true,
        viewedByAdminAt: new Date(),
      });

      console.log("✅ Feedback marked as viewed by admin");
    } catch (error) {
      console.error("Error marking feedback as viewed by admin:", error);
      throw error;
    }
  }

  /**
   * Get count of unread feedback responses for a user
   * Unread = has response AND (readByUser is false/undefined)
   */
  static async getUnreadFeedbackCount(
    userId: string,
    sparkId?: string
  ): Promise<number> {
    if (!this._initialized || !this.db) {
      return 0;
    }

    try {
      // Firestore doesn't support != null, so we query all feedback for this user
      // and filter in code
      const constraints = [where("userId", "==", userId)];

      if (sparkId) {
        constraints.push(where("sparkId", "==", sparkId));
      }

      const q = query(collection(this.db, "feedback"), ...constraints);

      const querySnapshot = await getDocs(q);

      // Filter for: has response AND not read
      let unreadCount = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const hasResponse = data.response && data.response.trim() !== "";
        const isUnread = data.readByUser !== true;
        if (hasResponse && isUnread) {
          unreadCount++;
        }
      });

      return unreadCount;
    } catch (error) {
      console.error("Error getting unread feedback count:", error);
      return 0;
    }
  }

  /**
   * Mark feedback as read by user
   */
  static async markFeedbackAsReadByUser(feedbackId: string): Promise<void> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }

    try {
      const feedbackRef = doc(this.db, "feedback", feedbackId);
      await updateDoc(feedbackRef, {
        readByUser: true,
        readByUserAt: new Date(),
      });

      console.log("✅ Feedback marked as read by user");
    } catch (error) {
      console.error("Error marking feedback as read by user:", error);
      throw error;
    }
  }

  /**
   * Mark multiple feedback items as read by user
   */
  static async markMultipleFeedbackAsReadByUser(
    feedbackIds: string[]
  ): Promise<void> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }

    if (!feedbackIds || feedbackIds.length === 0) {
      console.log(
        "⚠️ markMultipleFeedbackAsReadByUser: No feedback IDs provided"
      );
      return;
    }

    try {
      console.log(
        `🔍 markMultipleFeedbackAsReadByUser: Marking ${feedbackIds.length} feedback items as read:`,
        feedbackIds
      );
      const batch = writeBatch(this.db);
      feedbackIds.forEach((feedbackId) => {
        if (!feedbackId) {
          console.warn("⚠️ Skipping empty feedback ID");
          return;
        }
        const ref = doc(this.db, "feedback", feedbackId);
        batch.update(ref, {
          readByUser: true,
          readByUserAt: new Date(),
        });
        console.log(`✅ Added update to batch for feedback ID: ${feedbackId}`);
      });
      await batch.commit();
      console.log(
        `✅ Successfully marked ${feedbackIds.length} feedback items as read by user`
      );
    } catch (error) {
      console.error(
        "❌ Error marking multiple feedback as read by user:",
        error
      );
      throw error;
    }
  }

  // Legacy method - not used anymore since we store response directly in feedback document
  static async addFeedbackResponse(
    feedbackId: string,
    response: { adminId: string; text: string }
  ): Promise<string> {
    // This method is no longer used - responses are stored directly in the feedback document
    throw new Error(
      "addFeedbackResponse is deprecated - use updateFeedbackResponse instead"
    );
  }

  static async getFeedbackResponses(feedbackId: string): Promise<any[]> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }
    const q = query(
      collection(this.db, "feedback", feedbackId, "responses"),
      orderBy("createdAt", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Get all feedback responses for a specific user and spark
   * Since responses are stored directly in feedback documents, we return feedback with responses
   */
  static async getUserFeedbackResponses(
    userId: string,
    sparkId: string
  ): Promise<any[]> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }

    try {
      // Get all feedback for this user and spark that have responses
      const feedbackQuery = query(
        collection(this.db, "feedback"),
        where("userId", "==", userId),
        where("sparkId", "==", sparkId)
      );
      const feedbackSnapshot = await getDocs(feedbackQuery);

      const responsesWithFeedback: any[] = [];

      // Return feedback items that have responses
      feedbackSnapshot.docs.forEach((feedbackDoc) => {
        const feedbackData = feedbackDoc.data();
        if (feedbackData.response) {
          responsesWithFeedback.push({
            id: feedbackDoc.id,
            feedbackId: feedbackDoc.id,
            response: feedbackData.response,
            adminId: feedbackData.adminId,
            respondedAt: feedbackData.respondedAt,
            isRead: feedbackData.isRead || false,
          });
        }
      });

      return responsesWithFeedback;
    } catch (error) {
      console.error("Error getting user feedback responses:", error);
      return [];
    }
  }

  static async getFeedbackById(
    feedbackId: string
  ): Promise<SparkFeedback | null> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }
    try {
      const docRef = doc(this.db, "feedback", feedbackId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as SparkFeedback;
      }
      return null;
    } catch (error) {
      console.error("❌ Error getting feedback by ID:", error);
      throw error;
    }
  }

  static async getAllFeedback(): Promise<SparkFeedback[]> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }
    const q = query(
      collection(this.db, "feedback"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as SparkFeedback)
    );
  }

  static async getFeedbackBySpark(sparkId: string): Promise<SparkFeedback[]> {
    return this.getFeedback(sparkId); // No userId to get all feedback for spark
  }

  static async getFeedbackForSpark(sparkId: string): Promise<SparkFeedback[]> {
    return this.getFeedback(sparkId); // No userId to get all feedback for spark
  }

  static async deleteUserData(userId: string): Promise<void> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }
    // This is a placeholder - in a real implementation, you'd delete all user data
    console.log(`🗑️ Delete user data for user: ${userId} (placeholder)`);
  }

  static async createUser(userData: any): Promise<string> {
    if (!this._initialized || !this.db) {
      throw new Error("Firebase not initialized");
    }
    // This is a placeholder - user creation is handled by Firebase Auth
    console.log(`👤 Create user (placeholder):`, userData);
    return "user_placeholder_id";
  }

  static async batchLogEvents(events: any[]): Promise<void> {
    // This is a placeholder - analytics events are handled by Firebase Analytics
    console.log(`📊 Batch log events (placeholder):`, events.length, "events");
  }

  static async logEvent(event: any): Promise<void> {
    // This is a placeholder - analytics events are handled by Firebase Analytics
    console.log(`📊 Log event (placeholder):`, event);
  }

  static async updateUser(userId: string, userData: any): Promise<void> {
    // This is a placeholder - user updates are handled by Firebase Auth
    console.log(`👤 Update user (placeholder):`, userId, userData);
  }

  static async saveSparkSubmission(submission: any): Promise<void> {
    try {
      if (!this.db) {
        console.error("Firestore not initialized");
        throw new Error("Firestore not initialized");
      }

      await this.db
        .collection("sparkSubmissions")
        .doc(submission.id)
        .set(submission);
      console.log("✅ Spark submission saved:", submission.id);
    } catch (error) {
      console.error("❌ Error saving spark submission:", error);
      throw error;
    }
  }

  static async getSparkSubmissions(userId?: string): Promise<any[]> {
    try {
      if (!this.db) {
        console.error("Firestore not initialized");
        return [];
      }

      let query = this.db.collection("sparkSubmissions");

      if (userId) {
        query = query.where("userId", "==", userId);
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("❌ Error getting spark submissions:", error);
      return [];
    }
  }

  /**
   * Set up a real-time listener for feedback responses for a specific user
   * This will notify when admin adds a response to the user's feedback
   */
  static startFeedbackResponseListener(
    userId: string,
    onNewResponse: (
      feedbackId: string,
      sparkId: string,
      sparkName: string
    ) => void
  ): () => void {
    try {
      if (!WebFirebaseService.db) {
        console.error("Firestore not initialized");
        return () => {}; // Return empty cleanup function
      }

      console.log("👂 Starting feedback response listener for user:", userId);

      // Listen to feedback where this user has submitted feedback
      const feedbackQuery = query(
        collection(WebFirebaseService.db, "feedback"),
        where("userId", "==", userId)
      );

      const unsubscribe = onSnapshot(
        feedbackQuery,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
              const data = change.doc.data();

              // Check if an admin response was just added
              if (data.response && !change.doc.metadata.hasPendingWrites) {
                // New response detected!
                const sparkId = data.sparkId || "unknown";
                const sparkName = data.sparkName || "Unknown Spark";
                const feedbackId = change.doc.id;

                console.log("📬 New feedback response detected:", {
                  feedbackId,
                  sparkId,
                  sparkName,
                  response: data.response,
                });

                // Notify the callback
                onNewResponse(feedbackId, sparkId, sparkName);
              }
            }
          });
        },
        (error) => {
          console.error("❌ Error in feedback response listener:", error);
        }
      );

      // Return the unsubscribe function
      return unsubscribe;
    } catch (error) {
      console.error("❌ Error setting up feedback response listener:", error);
      return () => {}; // Return empty cleanup function
    }
  }
}
