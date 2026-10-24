// Token bertanda tangan ada di backend supaya mobile-api (aplikasi Android) memakai rahasia dan format yang sama.
export * from "@kopkar/backend/src/anggota/token.ts"

/** Nama cookie sesi; rahasia dan nama terpisah dari sesi operator admin. */
export const COOKIE_SESI = process.env.KOPKAR_SERVER_UJI ? "kopkar_anggota_uji" : "kopkar_anggota"
