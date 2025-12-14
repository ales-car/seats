// admin-logic.js

// 1. KONFIGURACE
const SUPABASE_URL = "https://VASE-PROJEKT-ID.supabase.co"; // <-- DOPLŇ!
const SUPABASE_ANON_KEY = "VASE-DLOUHE-ANON-KEY-Z-DASHBOARDU"; // <-- DOPLŇ!
const FN_URL = `${SUPABASE_URL}/functions/v1/verify-admin-pin`;

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Admin stránka načtena, JS připraven.");

    const btn = document.getElementById("loginBtn");
    const input = document.getElementById("pinInput");
    const msg = document.getElementById("statusMsg");

    if (!btn || !input) {
        console.error("❌ Chyba: Nemůžu najít tlačítko nebo input! Zkontroluj ID v HTML.");
        return;
    }

    // Funkce pro volání API
    async function doLogin() {
        const pin = input.value;
        console.log("👉 Kliknuto. PIN délka:", pin.length);

        if (!pin) {
            msg.textContent = "Please enter a PIN";
            return;
        }

        // UI Feedback
        btn.textContent = "Checking...";
        btn.disabled = true;
        msg.textContent = "";

        try {
            console.log("📡 Odesílám request na:", FN_URL);

            const res = await fetch(FN_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                    "apikey": SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ pin: pin })
            });

            const data = await res.json();
            console.log("✅ Odpověď serveru:", data);

            if (res.ok && data.ok) {
                msg.style.color = "green";
                msg.textContent = "Success! Redirecting...";
                // Přesměrování
                setTimeout(() => {
                    window.location.href = "dashboard.html"; 
                }, 1000);
            } else {
                throw new Error(data.error || "Wrong PIN");
            }

        } catch (err) {
            console.error("❌ Chyba:", err);
            msg.style.color = "red";
            msg.textContent = err.message;
        } finally {
            btn.textContent = "Login";
            btn.disabled = false;
        }
    }

    // Event Listener na klik
    btn.addEventListener("click", doLogin);

    // Event Listener na Enter v inputu
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") doLogin();
    });
});
