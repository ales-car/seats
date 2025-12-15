/* =========================================================
   ARTEON RIDE - FIREBASE EDITION (Hotovo)
   ========================================================= */

// 1. VAŠE KONFIGURACE (Už jsem ji sem vložil)
const firebaseConfig = {
  apiKey: "AIzaSyAi6MYAsAnqJg_5XwQC7b6TAI1ywrrADsM",
  authDomain: "car-seats-booking.firebaseapp.com",
  projectId: "car-seats-booking",
  storageBucket: "car-seats-booking.firebasestorage.app",
  messagingSenderId: "193508754028",
  appId: "1:193508754028:web:f7bc0b8cbdee9ef355ce49",
  measurementId: "G-QGXXTCG7XG"
};

// 2. Inicializace Firebase (Upraveno pro prohlížeč)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 3. Admin PIN (Zatím natvrdo "1234" pro bypass, nebo vaše proměnná)
const SESSION_ADMIN_PIN = "arteon_admin_pin";

// ROUTE MAPPING
const ROUTE_MAPPING = {
    "ZO": { route_id: 1, label: "Zurich → Ostrava" },
    "OZ": { route_id: 2, label: "Ostrava → Zurich" }
};

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

// --- LOGIKA FIREBASE ---

async function loadTrips() {
    const listEl = document.getElementById("tripList");
    if(!listEl) return;
    
    listEl.innerHTML = '<div class="muted" style="text-align: center;">Načítám z Firebase...</div>';
    
    try {
        // Čtení z kolekce "trips"
        const snapshot = await db.collection("trips").orderBy("trip_date").get();
        
        listEl.innerHTML = "";
        if (snapshot.empty) {
            listEl.innerHTML = '<div class="muted" style="text-align: center;">Žádné naplánované jízdy.</div>';
            return;
        }

        snapshot.forEach(doc => {
            const t = doc.data();
            const id = doc.id; // Firebase má ID jako string

            let dirLabel = "Neznámá trasa";
            if (t.route_id === 1) dirLabel = "Zurich → Ostrava";
            if (t.route_id === 2) dirLabel = "Ostrava → Zurich";
            
            const div = document.createElement("div");
            div.className = "item";
            div.innerHTML = `
                <div class="item-info">
                    <strong>${t.trip_date}</strong>
                    <small>${dirLabel}</small>
                </div>
                <button class="btn-danger" onclick="deleteTrip('${id}')">Smazat</button>
            `;
            listEl.appendChild(div);
        });

    } catch (e) {
        console.error(e);
        listEl.innerHTML = `<div class="message error">Chyba: ${e.message}</div>`;
    }
}

async function addTrip() {
    const dateInput = document.getElementById("tripDate");
    const dirInput = document.getElementById("tripDirection");
    
    if (!dateInput || !dateInput.value) return setMsg("adminMsg", "Vyberte datum", "error");

    const mapping = ROUTE_MAPPING[dirInput.value];
    if (!mapping) return setMsg("adminMsg", "Neplatná trasa", "error");

    try {
        setMsg("adminMsg", "Ukládám do Firebase...", "");
        
        // Zápis do kolekce "trips"
        await db.collection("trips").add({
            trip_date: dateInput.value,
            route_id: mapping.route_id,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });

        setMsg("adminMsg", "Jízda přidána!", "ok");
        loadTrips();
    } catch (e) {
        setMsg("adminMsg", e.message, "error");
    }
}

window.deleteTrip = async function(id) {
    if (!confirm("Opravdu smazat tuto jízdu?")) return;
    try {
        // Mazání dokumentu podle ID
        await db.collection("trips").doc(id).delete();
        loadTrips();
    } catch (e) {
        alert("Chyba mazání: " + e.message);
    }
};

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Admin Logic Loaded (Firebase Mode)");

    if (getPin()) {
        toggleView(true);
        loadTrips();
    } else {
        toggleView(false);
    }

    // Login Form (LOKÁLNÍ BYPASS PINU 1234)
    const loginForm = document.getElementById("loginForm");
    const pinInput = document.getElementById("pinInput");
    
    if(loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const pin = pinInput.value.trim();
            
            if (pin === "1234") { 
                setPin(pin);
                toggleView(true);
                loadTrips();
            } else {
                setMsg("loginMsg", "Špatný PIN", "error");
            }
        });
    }
    
    // UI Helpers (Oko, Logout, Refresh...)
    const toggleBtn = document.getElementById("togglePasswordBtn");
    if(toggleBtn && pinInput) {
        toggleBtn.addEventListener("click", () => {
            const type = pinInput.getAttribute("type") === "password" ? "text" : "password";
            pinInput.setAttribute("type", type);
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
