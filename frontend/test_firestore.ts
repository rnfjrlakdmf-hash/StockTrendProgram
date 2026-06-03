import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAlr-fX3Wcc2PL3cZioxc7jDYgn4j3eLqg",
    authDomain: "stocktrendprogram.firebaseapp.com",
    projectId: "stocktrendprogram",
    storageBucket: "stocktrendprogram.firebasestorage.app",
    messagingSenderId: "656335224088",
    appId: "1:656335224088:web:e041e46056d0183f11f26d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
    console.log("Fetching from Firestore...");
    try {
        const querySnapshot = await getDocs(collection(db, "blog_posts"));
        console.log("Total docs:", querySnapshot.size);
        querySnapshot.forEach((doc) => {
            console.log(doc.id, "=>", doc.data().title);
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
