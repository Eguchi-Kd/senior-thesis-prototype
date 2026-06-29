import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

interface SessionData {
  sessionId: string;
  logs: {
    scenarioId: number;
    reactionTimeMs: number;
    decision: string | null;
    confidence: number;
    hintUsed: boolean;
    correct: boolean;
  }[];
  transferTest?: {
    questionId: string;
    answer: string;
    correct: boolean;
    confidence: number;
  }[];
}

export async function saveSession(data: SessionData): Promise<void> {
  try {
    await addDoc(collection(db, "sessions"), {
      ...data,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to save session:", error);
  }
}
