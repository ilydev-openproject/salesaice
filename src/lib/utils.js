/**
 * Finds a product in a list by its UUID or its legacy Firebase ID.
 * @param {Array} produkList - The list of all products.
 * @param {string} productId - The ID to search for (can be UUID or Firebase ID).
 * @returns {Object|undefined} The found product object or undefined.
 */
export const findProduct = (produkList, productId) => {
    if (!productId || !produkList) return undefined;
    // Prioritize searching by the new UUID, then fall back to the legacy Firebase ID.
    return produkList.find((p) => p.id === productId || p.firebaseId === productId);
};

/**
 * Finds a store in a list by its UUID or its legacy Firebase ID.
 * @param {Array} tokoList - The list of all stores.
 * @param {string} tokoId - The ID to search for (can be UUID or Firebase ID).
 * @returns {Object|undefined} The found store object or undefined.
 */
export const findToko = (tokoList, tokoId) => {
    if (!tokoId || !tokoList) return undefined;
    return tokoList.find((t) => t.id === tokoId || t.firebaseId === tokoId);
};
