/* =========================================================
   ARTEON RIDE - ADMIN LOGIC
   ========================================================= */

// ⚠️ CONFIGURATION - Zde si nech své údaje
const SUPABASE_URL = "https://rtqnbryjqiwnewmtdeqb.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0cW5icnlqcWl3bmV3bXRkZXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MDE2NjgsImV4cCI6MjA4MTI3NzY2OH0.3HACsytbNMgBZ9wpspl7SI76OpAsoUMZGyK57mQhCro"; 
const SESSION_ADMIN_PIN = "arteon_admin_pin";

// ROUTE MAPPING
const ROUTE_MAPPING = {
    "ZO": { route_id: 1, from: "Zurich", to: "Ostrava" },
    "OZ": { route_id: 2, from: "Ostrava", to: "Zurich" }
};

const FN_BASE = `${SUPABASE_URL}/functions/v1`;
// ✅ DŮLEŽITÉ: Definice URL pro login
const FN_VERIFY = `${FN_BASE}/verify-admin-pin`; 

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

// --- API Calls ---

// 1. LOGIN FUNKCE (Opraveno: PIN v body)
async function apiVerifyPin(pin){
    console.log("Odesílám PIN na:", FN_VERIFY);
    const res = await fetch(FN_VERIFY, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ pin }) // PIN bezpečně v JSONu
    });

    const data = await res.json().catch(()=> ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || `Verify failed (${res.status})`);
    return true;
}

// 2. OSTATNÍ FUNKCE (Seznam jízd, Přidání, Mazání)
async function makeApiCall(endpoint, method, body = null) {
    const pin = getPin();
    const res = await fetch(`${FN_BASE}/${endpoint}`, {
        method: method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "apikey": SUPABASE_ANON_KEY,
            "x-admin-pin": pin 
            // Poznámka: Pokud by i funkce list-trips/add-trip padaly na CORS, 
            // budeš muset na backendu upravit i je (stejně jako jsme opravili verify-admin-pin).
        },
        body: body ? JSON.stringify(body) : null
    });

    if (res.status === 401 || res.status === 403) {
        clearPin();
        toggleView(false);
        throw new Error("Invalid or expired PIN.");
    }

    let data;
    try { data = await res.json(); } catch { throw new Error(`API Error: ${res.status}`); }
    
    if (!res.ok || data.ok === false) throw new Error(data.error || "Unknown error");
    return data;
}

// --- App Logic ---

async function loadTrips() {
    const listEl = document.getElementById("tripList");
    if(!listEl) return;
    
    listEl.innerHTML = '<div class="muted" style="text-align: center;">Loading...</div>';
    
    try {
        const data = await makeApiCall("list-trips", "GET");
        const trips = data.trips || [];
        
        listEl.innerHTML = "";
        if (trips.length === 0) {
            listEl.innerHTML = '<div class="muted" style="text-align: center;">No scheduled trips.</div>';
            return;
        }

        trips.forEach(t => {
            const div = document.createElement("div");
            div.className = "item";
            let dirLabel = `${t.from_city || "?"} → ${t.to_city || "?"}`;
            
            div.innerHTML = `
                <div class="item-info">
                    <strong>${t.trip_date}</strong>
                    <small>${dirLabel}</small>
                </div>
                <button class="btn-danger" onclick="deleteTrip(${t.id})">Delete</button>
            `;
            listEl.appendChild(div);
        });

    } catch (e) {
        listEl.innerHTML = `<div class="message error">Failed to load: ${e.message}</div>`;
    }
}

async function addTrip() {
    const dateInput = document.getElementById("tripDate");
    const dirInput = document.getElementById("tripDirection");
    
    if (!dateInput || !dateInput.value) return setMsg("adminMsg", "Please select a date", "error");

    const mapping = ROUTE_MAPPING[dirInput.value];
    if (!mapping) return setMsg("adminMsg", "Invalid route selected", "error");

    try {
        setMsg("adminMsg", "Adding trip...", "");
        await makeApiCall("add-trip", "POST", {
            trip_date: dateInput.value,
            route_id: mapping.route_id
        });
        setMsg("adminMsg", "Trip added successfully!", "ok");
        loadTrips();
    } catch (e) {
        setMsg("adminMsg", e.message, "error");
    }
}

// Globální funkce pro tlačítko Delete v HTML
window.deleteTrip = async function(id) {
    if (!confirm("Are you sure you want to delete this trip?")) return;
    try {
        await makeApiCall("delete-trip", "POST", { id: Number(id) });
        loadTrips();
    } catch (e) {
        alert(e.message);
    }
};

// --- INIT (Spuštění po načtení stránky) ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Admin Logic Loaded");

    // Check login state
    if (getPin()) {
        toggleView(true);
        loadTrips();
    } else {
        toggleView(false);
    }

    // Login Button Event
    const loginBtn = document.getElementById("loginBtn");
    if(loginBtn) {
        loginBtn.addEventListener("click", async () => {
            const pinInput = document.getElementById("pinInput");
            const pin = pinInput.value.trim();
            if (!pin) return setMsg("loginMsg", "Enter PIN", "error");
            
            try {
                setMsg("loginMsg", "Verifying...", "");
                loginBtn.disabled = true;
                
                // Voláme novou API funkci
                await apiVerifyPin(pin);
                
                // Úspěch
                setPin(pin);
                toggleView(true);
                loadTrips();
                setMsg("loginMsg", "", "");
            } catch (e) {
                console.error("Login error:", e);
                setMsg("loginMsg", "Wrong PIN", "error");
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = "Login";
            }
        });
    }

    // Ostatní tlačítka
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
