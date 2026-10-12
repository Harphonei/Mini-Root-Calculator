import { signInAnonymously } from "firebase/auth";
import type { Auth } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  getDocsFromServer,
  deleteDoc,
  doc,
  writeBatch,
  limit,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";
import type { Firestore, Timestamp } from "firebase/firestore";
import type { SolverConfig } from "../domain/SolverConfig";
import type { SolverResult } from "../domain/SolverResult";

export interface HistoryEntry extends SolverResult {
  id: string;
  lower: number;
  upper: number;
  tolerance: number;
  maxIterations: number;
  createdAt: Timestamp | null;
}

export class HistoryRepository {
  private readonly auth: Auth;
  private readonly db: Firestore;
  private userPromise: Promise<string> | null = null;

  constructor(auth: Auth, db: Firestore) {
    this.auth = auth;
    this.db = db;
  }

  private getUserId(): Promise<string> {
    if (!this.userPromise) {
      this.userPromise = this.prepareUser().catch((error) => {
        this.userPromise = null;
        throw error;
      });
    }
    return this.userPromise;
  }

  private async prepareUser(): Promise<string> {
    await this.auth.authStateReady();

    if (this.auth.currentUser) {
      return this.auth.currentUser.uid;
    }

    const credential = await signInAnonymously(this.auth);
    return credential.user.uid;
  }

  async save(
    result: SolverResult,
    config: SolverConfig
  ): Promise<string> {
    const userId = await this.getUserId();
    const historyCollection = collection(
      this.db, "users", userId, "calculations"
    );

    const saved = await addDoc(historyCollection, {
      expression: result.expression,
      method: result.method,
      lower: config.getLower(),
      upper: config.getUpper(),
      tolerance: config.getTolerance(),
      maxIterations: config.getMaxIterations(),
      root: result.root,
      functionValue: result.functionValue,
      iterations: result.iterations,
      status: result.status,
      message: result.message,
      rows: result.rows,
      createdAt: serverTimestamp()
    });

    return saved.id;
  }

  async deleteOne(id: string): Promise<void> {
    if (!id || id.includes("/")) throw new Error("Invalid history ID.");
    const userId = await this.getUserId();
    await deleteDoc(doc(this.db, "users", userId, "calculations", id));
  }

  async clearAll(onProgress?: (count: number) => void): Promise<number> {
    const userId = await this.getUserId();
    const historyCollection = collection(this.db, "users", userId, "calculations");
    let deleted = 0;
    try {
      while (true) {
        const snapshot = await getDocsFromServer(query(historyCollection, limit(200)));
        if (snapshot.empty) return deleted;
        const batch = writeBatch(this.db);
        for (const item of snapshot.docs) batch.delete(item.ref);
        await batch.commit();
        deleted += snapshot.size;
        onProgress?.(deleted);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error("Clearing stopped. Confirmed deleted: " + deleted +
        ". Remaining records may still exist. Refresh and retry. " + detail);
    }
  }

  async getLatest(): Promise<HistoryEntry[]> {
    const userId = await this.getUserId();
    const historyCollection = collection(
      this.db, "users", userId, "calculations"
    );

    const historyQuery = query(
      historyCollection,
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const snapshot = await getDocs(historyQuery);

    return snapshot.docs.map((document) => ({
      ...document.data(),
      id: document.id
    } as HistoryEntry));
  }
}
