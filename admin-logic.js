/* =========================================================
   ARTEON RIDE - ADMIN LOGIC (FIREBASE EDITION)
   ========================================================= */

// ⚠️ CONFIGURATION - UPDATED WITH YOUR CREDENTIALS
const firebaseConfig = {
    apiKey: "AIzaSyAi6MYAsAnqJg_5XwQC7b6TAI1ywrrADsM",
    authDomain: "car-seats-booking.firebaseapp.com",
    projectId: "car-seats-booking",
    storageBucket: "car-seats-booking.firebasestorage.app",
    messagingSenderId: "193508754028",
    appId: "1:193508754028:web:f7bc0b8cbdee9ef355ce49",
    measurementId: "G-QGXXTCG7XG"
};

const SESSION_ADMIN_PIN = "arteon_admin_pin";

// ROUTE MAPPING - Rozšířeno o kratší trasy
const ROUTE_MAPPING = {
    "ZO": { route_id: 1, from: "Zurich", to: "Ostrava" },
    "OZ": { route_id: 2, from: "Ostrava", to: "Zurich" },
    "ZP": { route_id: 3, from: "Zurich", to: "Praha" },
    "PZ": { route_id: 4, from: "Praha", to: "Zurich" }
};

// --- Firebase Initialization ---
// We access the modules that were loaded in the HTML file
const { initializeApp, getFirestore, collection, getDocs, addDoc, deleteDoc, doc, query, where } = window.firebaseModules;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Helpers ---
function setMsg(id, txt, type="") {
    const el = document.getElementById(id);
    if(el) {
        el.className = "message " + type;
        el.textContent = txt;
    }
}
function getPin(){ return sessionStorage.getItem(SESSION_ADMIN_PIN) || ""; }
function setPin(pin){ sessionStorage.setItem(SESSION_ADMIN_PIN, pin); }
function clearPin(){ sessionStorage.removeItem(SESSION_ADMIN_PIN); }

function toggleView(isAdmin) {
    const loginWrap = document.getElementById("loginWrap");
    const adminUI = document.getElementById("adminUI");
    if(loginWrap && adminUI) {
        loginWrap.style.display = isAdmin ? "none" : "block";
        adminUI.style.display = isAdmin ? "block" : "none";
    }
}

// --- App Logic ---

// 1. VERIFY PIN (Checks against a 'settings' collection in Firestore)
async function apiVerifyPin(pinInput) {
    console.log("Verifying PIN with Firestore...");
    
    try {
        // We assume you have a collection 'settings' with a document that has the field 'admin_pin'
        // If this is your first time, you might need to create this manually in Firebase Console
        const q = query(collection(db, "settings"), where("admin_pin", "==", pinInput));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("Invalid PIN");
        }
        return true;
    } catch (e) {
        // If permission denied (usually means rules block reading settings), handle gracefully
        if(e.code === 'permission-denied') {
             throw new Error("Access Denied: Check Firebase Rules");
        }
        throw e;
    }
}

// 2. LOAD TRIPS
async function loadTrips() {
    const listEl = document.getElementById("tripList");
    if(!listEl) return;
    
    listEl.innerHTML = '<div class="muted" style="text-align: center;">Loading...</div>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "trips"));
        
        listEl.innerHTML = "";
        if (querySnapshot.empty) {
            listEl.innerHTML = '<div class="muted" style="text-align: center;">No scheduled trips.</div>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const t = docSnap.data();
            const div = document.createElement("div");
            div.className = "item";
            
            // Map route_id back to text (optional visual helper)
            let dirLabel = t.route_id === 1 ? "Zurich → Ostrava" : "Ostrava → Zurich";

            div.innerHTML = `
                <div class="item-info">
                    <strong>${t.trip_date}</strong>
                    <small>${dirLabel}</small>
                </div>
                <button class="btn-danger" onclick="deleteTrip('${docSnap.id}')">Delete</button>
            `;
            listEl.appendChild(div);
        });

    } catch (e) {
        console.error(e);
        listEl.innerHTML = `<div class="message error">Failed to load: ${e.message}</div>`;
    }
}

// 3. ADD TRIP
async function addTrip() {
    const dateInput = document.getElementById("tripDate");
    const dirInput = document.getElementById("tripDirection");
    
    if (!dateInput || !dateInput.value) return setMsg("adminMsg", "Please select a date", "error");

    const mapping = ROUTE_MAPPING[dirInput.value];
    if (!mapping) return setMsg("adminMsg", "Invalid route selected", "error");

    try {
        setMsg("adminMsg", "Adding trip...", "");
        
        await addDoc(collection(db, "trips"), {
            trip_date: dateInput.value,
            route_id: mapping.route_id,
            from_city: mapping.from,
            to_city: mapping.to,
            created_at: new Date().toISOString()
        });

        setMsg("adminMsg", "Trip added successfully!", "ok");
        loadTrips();
    } catch (e) {
        setMsg("adminMsg", e.message, "error");
    }
}

// 4. DELETE TRIP
window.deleteTrip = async function(docId) {
    if (!confirm("Are you sure you want to delete this trip?")) return;
    try {
        await deleteDoc(doc(db, "trips", docId));
        loadTrips();
    } catch (e) {
        alert("Error deleting: " + e.message);
    }
};

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Firebase Admin Logic Loaded");

    if (getPin()) {
        toggleView(true);
        loadTrips();
    } else {
        toggleView(false);
    }

    // Toggle Password Visibility
    const toggleBtn = document.getElementById("togglePasswordBtn");
    const pinInput = document.getElementById("pinInput");
    if(toggleBtn && pinInput) {
        toggleBtn.addEventListener("click", () => {
            const type = pinInput.getAttribute("type") === "password" ? "text" : "password";
            pinInput.setAttribute("type", type);
        });
    }

    // Login Form
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("loginBtn");
    if(loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const pin = pinInput.value.trim();
            if (!pin) return setMsg("loginMsg", "Enter PIN", "error");
            
            try {
                setMsg("loginMsg", "Verifying...", "");
                loginBtn.disabled = true;
                
                await apiVerifyPin(pin);
                
                setPin(pin);
                toggleView(true);
                loadTrips();
                setMsg("loginMsg", "", "");
            } catch (e) {
                console.error(e);
                setMsg("loginMsg", "Wrong PIN", "error");
            } finally {
                loginBtn.disabled = false;
            }
        });
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if(logoutBtn) logoutBtn.addEventListener("click", () => {
        clearPin();
        toggleView(false);
    });

    const refreshBtn = document.getElementById("refreshBtn");
    if(refreshBtn) refreshBtn.addEventListener("click", loadTrips);

    const addTripBtn = document.getElementById("addTripBtn");
    if(addTripBtn) addTripBtn.addEventListener("click", addTrip);
});
