import assert from 'node:assert/strict';

// 0.8.62：year_2025、artist_collaboration、detailed eyes 这类不当成画师，不再被补上 artist:
export function applyFakeArtistYearCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    patch('very[ _]aesthetic|aesthetic|year \\d{4}|\\d{4}|no text|rating:.*|1boy',
        'very[ _]aesthetic|aesthetic|year[ _]\\d{4}|\\d{4}|no[ _]text|artist[ _]collaboration|(?:finely[ _])?detailed[ _](?:eyes|hair|face|skin|features|irises|clothes)|rating:.*|1boy');
    patch('rating:.*|year \\d{4}|\\d{4}|newest|oldest|recent|masterpiece|', 'rating:.*|year[ _]\\d{4}|\\d{4}|artist[ _]collaboration|newest|oldest|recent|masterpiece|');
    patch('rating:.*|year \\d{4}|\\d{4}|newest|oldest|recent|early|mid|late|', 'rating:.*|year[ _]\\d{4}|\\d{4}|newest|oldest|recent|early|mid|late|');
    return s;
}
