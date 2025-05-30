import { Request, Response } from 'express';
import { db } from './db';
import { menus, menuItems, type AdditionalDietaryMetadata } from '../shared/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * API Routes for Wedding Questionnaire Menu Integration
 * These routes provide rich menu data for the questionnaire forms
 */

// Get all available menu themes/packages for wedding questionnaire
export const getWeddingMenuThemes = async (req: Request, res: Response) => {
  try {
    const weddingMenus = await db
      .select()
      .from(menus)
      .where(eq(menus.type, 'form_builder'));

    const formattedMenus = weddingMenus.map(menu => {
      let menuStructure;
      try {
        menuStructure = typeof menu.items === 'string' 
          ? JSON.parse(menu.items) 
          : menu.items;
      } catch (error) {
        console.error(`Failed to parse menu items for menu ${menu.id}:`, error);
        menuStructure = null;
      }

      return {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        theme_key: menuStructure?.theme_key || `theme_${menu.id}`,
        packages: menuStructure?.categories ? [{
          id: menuStructure.package_id || `package_${menu.id}`,
          name: menuStructure.package_name || menu.name,
          price: menuStructure.package_price_per_person || 0,
          description: menuStructure.package_description || menu.description,
          minGuestCount: menuStructure.min_guest_count,
          customizable: menuStructure.customizable || false
        }] : [],
        categories: menuStructure?.categories || []
      };
    });

    res.json(formattedMenus);
  } catch (error) {
    console.error('Error fetching wedding menu themes:', error);
    res.status(500).json({ error: 'Failed to fetch wedding menu themes' });
  }
};

// Get menu items by category with dietary information
export const getMenuItemsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    let items;
    
    if (category) {
      items = await db.select().from(menuItems).where(eq(menuItems.category, category as string));
    } else {
      items = await db.select().from(menuItems);
    }

    // Enrich items with dietary information
    const enrichedItems = items.map(item => {
      const dietaryMetadata = item.additional_dietary_metadata as AdditionalDietaryMetadata || {};
      
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        price: item.price ? parseFloat(item.price.toString()) : 0,
        upcharge: item.upcharge ? parseFloat(item.upcharge.toString()) : 0,
        
        // Basic dietary flags
        isVegetarian: item.isVegetarian,
        isVegan: item.isVegan,
        isGlutenFree: item.isGlutenFree,
        isDairyFree: item.isDairyFree,
        isNutFree: item.isNutFree,
        
        // Rich dietary information
        dietaryFlags: dietaryMetadata.dietary_flags_list || [],
        allergenAlerts: dietaryMetadata.allergen_alert_list || [],
        nutritionalHighlights: dietaryMetadata.nutritional_highlights || {},
        preparationNotes: dietaryMetadata.key_preparation_notes || '',
        suitableForDiets: dietaryMetadata.suitable_for_diet_preferences || [],
        customerGuidance: dietaryMetadata.guidance_for_customer_short || '',
        availableLotSizes: dietaryMetadata.available_lot_sizes || [],
        
        image: item.image
      };
    });

    res.json(enrichedItems);
  } catch (error) {
    console.error('Error fetching menu items by category:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
};

// Get specific menu items by IDs (for package-based menus)
export const getMenuItemsByIds = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Item IDs array is required' });
    }

    const items = await db
      .select()
      .from(menuItems)
      .where(inArray(menuItems.id, ids));

    // Enrich items with dietary information
    const enrichedItems = items.map(item => {
      const dietaryMetadata = item.additional_dietary_metadata as AdditionalDietaryMetadata || {};
      
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        price: item.price ? parseFloat(item.price.toString()) : 0,
        upcharge: item.upcharge ? parseFloat(item.upcharge.toString()) : 0,
        
        // Basic dietary flags
        isVegetarian: item.isVegetarian,
        isVegan: item.isVegan,
        isGlutenFree: item.isGlutenFree,
        isDairyFree: item.isDairyFree,
        isNutFree: item.isNutFree,
        
        // Rich dietary information
        dietaryFlags: dietaryMetadata.dietary_flags_list || [],
        allergenAlerts: dietaryMetadata.allergen_alert_list || [],
        nutritionalHighlights: dietaryMetadata.nutritional_highlights || {},
        preparationNotes: dietaryMetadata.key_preparation_notes || '',
        suitableForDiets: dietaryMetadata.suitable_for_diet_preferences || [],
        customerGuidance: dietaryMetadata.guidance_for_customer_short || '',
        availableLotSizes: dietaryMetadata.available_lot_sizes || [],
        
        image: item.image
      };
    });

    res.json(enrichedItems);
  } catch (error) {
    console.error('Error fetching menu items by IDs:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
};

// Get dietary recommendations based on user preferences
export const getDietaryRecommendations = async (req: Request, res: Response) => {
  try {
    const { dietaryPreferences, allergens, category } = req.query;
    
    let allItems;
    
    if (category) {
      allItems = await db.select().from(menuItems).where(eq(menuItems.category, category as string));
    } else {
      allItems = await db.select().from(menuItems);
    }
    
    // Filter items based on dietary preferences and allergens
    const filteredItems = allItems.filter(item => {
      const dietaryMetadata = item.additional_dietary_metadata as AdditionalDietaryMetadata || {};
      
      // Check allergen restrictions
      if (allergens) {
        const userAllergens = (allergens as string).split(',');
        const itemAllergens = dietaryMetadata.allergen_alert_list || [];
        
        // If item contains any allergens the user wants to avoid, exclude it
        const hasRestrictedAllergen = itemAllergens.some((allergen: string) => 
          userAllergens.some(userAllergen => 
            allergen.toLowerCase().includes(userAllergen.toLowerCase())
          )
        );
        
        if (hasRestrictedAllergen) return false;
      }
      
      // Check dietary preferences
      if (dietaryPreferences) {
        const userPreferences = (dietaryPreferences as string).split(',');
        const itemSuitableFor = dietaryMetadata.suitable_for_diet_preferences || [];
        
        // Check if item suits any of the user's dietary preferences
        const suitsPreferences = userPreferences.some(pref => 
          itemSuitableFor.some((itemPref: string) => 
            itemPref.toLowerCase().includes(pref.toLowerCase())
          )
        );
        
        // Also check basic dietary flags
        const suitsBasicFlags = userPreferences.some(pref => {
          switch (pref.toLowerCase()) {
            case 'vegetarian': return item.isVegetarian;
            case 'vegan': return item.isVegan;
            case 'gluten_free': return item.isGlutenFree;
            case 'dairy_free': return item.isDairyFree;
            case 'nut_free': return item.isNutFree;
            default: return false;
          }
        });
        
        if (!suitsPreferences && !suitsBasicFlags) return false;
      }
      
      return true;
    });
    
    // Enrich and return filtered items
    const enrichedItems = filteredItems.map(item => {
      const dietaryMetadata = item.additional_dietary_metadata as AdditionalDietaryMetadata || {};
      
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        price: item.price ? parseFloat(item.price.toString()) : 0,
        upcharge: item.upcharge ? parseFloat(item.upcharge.toString()) : 0,
        
        // Basic dietary flags
        isVegetarian: item.isVegetarian,
        isVegan: item.isVegan,
        isGlutenFree: item.isGlutenFree,
        isDairyFree: item.isDairyFree,
        isNutFree: item.isNutFree,
        
        // Rich dietary information
        dietaryFlags: dietaryMetadata.dietary_flags_list || [],
        allergenAlerts: dietaryMetadata.allergen_alert_list || [],
        nutritionalHighlights: dietaryMetadata.nutritional_highlights || {},
        preparationNotes: dietaryMetadata.key_preparation_notes || '',
        suitableForDiets: dietaryMetadata.suitable_for_diet_preferences || [],
        customerGuidance: dietaryMetadata.guidance_for_customer_short || '',
        availableLotSizes: dietaryMetadata.available_lot_sizes || [],
        
        image: item.image
      };
    });
    
    res.json(enrichedItems);
  } catch (error) {
    console.error('Error getting dietary recommendations:', error);
    res.status(500).json({ error: 'Failed to get dietary recommendations' });
  }
};