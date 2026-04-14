// =============================================================================
// BROWSER-SIDE EXPORT SCRIPT for recipesgenerator.com
// =============================================================================
// HOW TO USE:
//   1. Open https://www.recipesgenerator.com/start and log in
//   2. Open DevTools (F12) → Console tab
//   3. Copy the ENTIRE contents of this file and paste into the console
//   4. Press Enter and wait ~1-2 minutes for 204 cards
//   5. A file `recipesgen-cards.json` will download automatically
//   6. The full result is also stashed at `window._allCards` as backup
//
// This script uses the site's own global helper functions (listUserCards,
// getCardData). It does not touch Firestore or Storage directly.
// =============================================================================

(async function exportAllCards() {
  const list = await listUserCards();
  const total = list.items.length;
  console.log('Total cards to export:', total);

  const results = [];

  for (let i = 0; i < total; i++) {
    const ref = list.items[i];
    const id = ref.name.replace(/__$/, '');

    try {
      const data = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), 20000);
        getCardData(id, (d) => {
          clearTimeout(timer);
          resolve(d);
        });
      });
      results.push({ id: id, fullPath: ref.fullPath, data: data });
    } catch (err) {
      console.warn('Failed card', id, err);
      results.push({ id: id, fullPath: ref.fullPath, error: String(err) });
    }

    if ((i + 1) % 10 === 0 || i + 1 === total) {
      console.log('Exported', i + 1, '/', total);
    }

    await new Promise((r) => setTimeout(r, 40));
  }

  window._allCards = results;

  const json = JSON.stringify(results, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'recipesgen-cards.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('DONE. Downloaded recipesgen-cards.json (also saved to window._allCards)');
  return 'Done: ' + results.length + ' cards';
})();
