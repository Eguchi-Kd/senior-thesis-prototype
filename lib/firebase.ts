import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// 会場Wi-Fiが不安定でも書き込みを端末（IndexedDB）に保持し、復帰後に自動同期する。
// ビルド時（サーバー）はIndexedDBが無いのでメモリキャッシュ。再初期化（HMR等）時は既存インスタンスを使う。
function createDb(): Firestore {
  try {
    return initializeFirestore(app, {
      localCache:
        typeof window !== "undefined"
          ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
          : memoryLocalCache(),
    });
  } catch {
    return getFirestore(app);
  }
}

export const db = createDb();
