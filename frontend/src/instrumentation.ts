// Dijalankan sekali saat server Next.js mulai. Menyalakan pekerja pengiriman email (antrean email_antrean);
// aman dijalankan di beberapa proses sekaligus (SKIP LOCKED). EMAIL_PEKERJA=0 mematikannya.
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { mulaiPekerjaEmail } = await import("@kopkar/backend/src/email/pekerja.ts")
        mulaiPekerjaEmail()
    }
}
