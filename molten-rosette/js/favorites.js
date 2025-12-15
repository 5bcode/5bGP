// favorites.js
const STORAGE_KEY = 'flip5b_favorites';

export function getFavorites() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

export function isFavorite(itemId) {
    const favs = getFavorites();
    return favs.includes(itemId.toString());
}

export function toggleFavorite(itemId) {
    let favs = getFavorites();
    const id = itemId.toString();
    
    if (favs.includes(id)) {
        favs = favs.filter(f => f !== id);
    } else {
        favs.push(id);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
    return favs.includes(id);
}
