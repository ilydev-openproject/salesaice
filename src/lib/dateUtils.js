import { startOfMonth, endOfMonth, subDays, isValid } from 'date-fns';

/**
 * Normalizes a date value that might be an ISO string or a Firebase-style timestamp object.
 * @param {string | {seconds: number, nanoseconds: number} | Date} dateInput - The date value to normalize.
 * @returns {Date | null} A valid Date object or null if the input is invalid.
 */
export function normalizeDate(dateInput) {
    if (!dateInput) return null;
    // If it's a Firebase-style timestamp object
    if (typeof dateInput === 'object' && dateInput !== null && 'seconds' in dateInput) {
        return new Date(dateInput.seconds * 1000);
    }
    // If it's already a Date object or a parsable string
    const date = new Date(dateInput);
    return !isValid(date) ? null : date;
}

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
