import pg from 'pg';

// Kontrak lama: tanggal berupa teks 'YYYY-MM-DD', angka uang berupa number JSON.
pg.types.setTypeParser(1082, (v: string) => v);
pg.types.setTypeParser(1700, (v: string) => Number(v));
pg.types.setTypeParser(20, (v: string) => Number(v)); // bigint (count, id)

export function createPool(connectionString = process.env.PG_URL) {
    if (!connectionString) throw new Error('PG_URL belum diset');
    return new pg.Pool({ connectionString, max: 10 });
}

export type Pool = pg.Pool;
