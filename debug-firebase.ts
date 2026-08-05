import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function debugFirebase() {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  let projectId;
  let databaseId;

  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    projectId = config.projectId;
    databaseId = config.firestoreDatabaseId;
  }

  console.log(`Config Project ID: ${projectId}`);
  console.log(`Config Database ID: ${databaseId}`);

  try {
    admin.initializeApp({ projectId });
    const db = databaseId ? getFirestore(databaseId) : getFirestore();
    const snapshot = await db.collection('todos').limit(1).get();
    console.log("SUCCESS: Connection established.");
  } catch (error) {
    console.log(`FAILED: ${error.message}`);
    if (error.code === 7) {
      console.log("PERMISSION_DENIED detected.");
    }
  }
}

debugFirebase();
