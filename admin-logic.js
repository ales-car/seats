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
const FN_VERIFY = `${FN_BASE}/check-pin`; 

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

async function apiVerifyPin(pin){
    console.log("Odesílám PIN na:", FN_VERIFY);
    
    const res = await fetch(FN_VERIFY, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ pin }) 
    });

    const data = await res.json().catch(()=> ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || `Verify failed (${res.status})`);
    return true;
}

async function makeApiCall(endpoint, method, body = null) {
    const pin = getPin();
    const res = await fetch(`${FN_BASE}/${endpoint}`, {
        method: method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "apikey": SUPABASE_ANON_KEY,
            "x-admin-pin": pin 
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

    // 1. LOGIKA PRO OKO (Zobrazit/Skrýt heslo)
    const toggleBtn = document.getElementById("togglePasswordBtn");
    const pinInput = document.getElementById("pinInput");
    
    if(toggleBtn && pinInput) {
        toggleBtn.addEventListener("click", () => {
            const type = pinInput.getAttribute("type") === "password" ? "text" : "password";
            pinInput.setAttribute("type", type);
            
            // Změna ikony
            const svg = toggleBtn.querySelector("svg");
            if(type === "text") {
                // Otevřené oko
                svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />';
            } else {
                // Přeškrtnuté oko
                svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />';
            }
        });
    }

    // 2. LOGIN FORMULÁŘ (Enter i Click)
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("loginBtn");

    if(loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault(); // Zabrání obnovení stránky

            const pin = pinInput.value.trim();
            if (!pin) return setMsg("loginMsg", "Enter PIN", "error");
            
            try {
                setMsg("loginMsg", "Verifying...", "");
                loginBtn.disabled = true;
                loginBtn.textContent = "Checking...";
                
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
