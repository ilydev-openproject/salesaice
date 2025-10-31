import { startOfMonth, endOfMonth, subDays, lastDayOfMonth } from 'date-fns';

/**
 * Menghitung tanggal mulai dan selesai untuk periode penjualan "taking order".
 * Aturan bisnis:
 * - Tanggal mulai adalah hari terakhir dari bulan sebelumnya.
 * - Tanggal selesai adalah satu hari sebelum hari terakhir bulan ini.
 * Ini karena barang dikirim H+1, jadi order di hari terakhir bulan sebelumnya
 * masuk ke bulan ini, dan order di hari terakhir bulan ini masuk ke bulan berikutnya.
 *
 * @param {Date} date - Tanggal acuan (biasanya tanggal hari ini).
 * @returns {{startDate: Date, endDate: Date}} Objek berisi tanggal mulai dan selesai.
 */
export const getSalesPeriod = (date = new Date()) => {
    // Tanggal mulai adalah hari terakhir dari bulan sebelumnya.
    // 1. Dapatkan tanggal pertama bulan ini.
    const firstDayOfCurrentMonth = startOfMonth(date);
    // 2. Kurangi satu hari untuk mendapatkan hari terakhir bulan sebelumnya.
    const startDate = subDays(firstDayOfCurrentMonth, 1);

    // Tanggal selesai adalah satu hari sebelum hari terakhir bulan ini.
    const endDate = subDays(endOfMonth(date), 1);

    return { startDate, endDate };
};
