// Generated menu data exports
import menuThemes from './menuThemes.json';
import menuItemsByCategory from './menuItemsByCategory.json';
import allMenuItems from './allMenuItems.json';
import dietaryFilters from './dietaryFilters.json';

// Individual category imports
import appetizerItems from './menuItems_appetizer.json';
import entreeItems from './menuItems_entree.json';
import sideItems from './menuItems_side.json';
import dessertItems from './menuItems_dessert.json';
import beverageItems from './menuItems_beverage.json';

export {
  menuThemes,
  menuItemsByCategory,
  allMenuItems,
  dietaryFilters,
  appetizerItems,
  entreeItems,
  sideItems,
  dessertItems,
  beverageItems
};

// Utility functions
export function getMenuItemsByCategory(category) {
  return menuItemsByCategory[category] || [];
}

export function getMenuItemById(id) {
  return allMenuItems.find(item => item.id === id);
}

export function getMenuItemsByIds(ids) {
  return allMenuItems.filter(item => ids.includes(item.id));
}

export function filterMenuItemsByDietary(items, dietaryPrefs = [], allergens = []) {
  return items.filter(item => {
    // Check allergen restrictions
    if (allergens.length > 0) {
      const hasRestrictedAllergen = item.allergenAlerts.some(allergen =>
        allergens.some(userAllergen =>
          allergen.toLowerCase().includes(userAllergen.toLowerCase())
        )
      );
      if (hasRestrictedAllergen) return false;
    }
    
    // Check dietary preferences
    if (dietaryPrefs.length > 0) {
      const suitsPreferences = dietaryPrefs.some(pref => {
        const prefLower = pref.toLowerCase();
        
        // Check basic flags
        switch (prefLower) {
          case 'vegetarian': return item.isVegetarian;
          case 'vegan': return item.isVegan;
          case 'gluten_free': return item.isGlutenFree;
          case 'dairy_free': return item.isDairyFree;
          case 'nut_free': return item.isNutFree;
        }
        
        // Check suitable diet preferences
        return item.suitableForDiets.some(diet =>
          diet.toLowerCase().includes(prefLower)
        );
      });
      
      if (!suitsPreferences) return false;
    }
    
    return true;
  });
}
