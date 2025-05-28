// Breakfast/Brunch Menu Data
export const breakfastMenuData = {
  title: "Breakfast/Brunch",
  description: "You know there is nothing better than breakfast to get the new day off to a good start! Do you want something quick, or will a leisurely continental breakfast do the trick? Home Bites has what it takes to get you and your guests back in shape! We serve up a fantastic brunch customized to your liking!",
  menuTypes: [
    {
      id: "grab_and_go",
      name: "Grab and Go",
      description: "If you're looking for a quick and easy morning meal, a grab and go breakfast might be just what you need. This package gets you started on the following items below. This package includes 1 item per person.",
      minGuestCount: 10,
      sections: [
        {
          id: "grab_and_go_bites",
          name: "Grab and Go Bites",
          description: "Choose from our selection of breakfast bites (minimum purchase of 10 of any single item)",
          items: [
            { id: "breakfast_burrito_mexi", name: "Breakfast Burrito - The Mexi", price: 8.95 },
            { id: "breakfast_burrito_carnivore", name: "Breakfast Burrito - The Carnivore", price: 8.95 },
            { id: "breakfast_burrito_cali", name: "Breakfast Burrito - The Cali", price: 8.95 },
            { id: "breakfast_burrito_green", name: "Breakfast Burrito - The Green (Vegetarian)", price: 8.95 },
            { id: "croissandwich_egg_ham", name: "Croissandwich - Egg Ham", price: 7.95 },
            { id: "croissandwich_turkey_club", name: "Croissandwich - Turkey Club", price: 7.95 },
            { id: "croissandwich_brisket", name: "Croissandwich - Brisket (Carved Brisket)", price: 9.95 },
            { id: "quiche_lorraine", name: "Quiche - Lorraine", price: 6.95 },
            { id: "quiche_spinach", name: "Quiche - Spinach", price: 6.95 },
            { id: "quiche_denver", name: "Quiche - Denver", price: 6.95 }
          ]
        },
        {
          id: "grab_and_go_snacks",
          name: "Grab and Go Snack",
          description: "Add a variety of snack options to your breakfast order",
          items: [
            { id: "muffin_blueberry", name: "Muffin Blueberry", price: 3.95 },
            { id: "muffin_chocolate", name: "Muffin Chocolate", price: 3.95 },
            { id: "muffin_banana", name: "Muffin Banana", price: 3.95 },
            { id: "croissandwich_caprese", name: "Croissandwich - Caprese (Vegetarian)", price: 7.95 },
            { id: "granola_caramel_almond", name: "Granola Bar - KIND - Caramel Almond & Sea Salt", price: 2.95 },
            { id: "granola_dark_chocolate", name: "Granola Bar - KIND - Dark Chocolate Almond & Sea Salt", price: 2.95 },
            { id: "granola_peanut_butter", name: "Granola Bar - KIND - Peanut Butter Dark Chocolate", price: 2.95 },
            { id: "granola_almond_coconut", name: "Granola Bar - KIND - Almond & Coconut Chewy Granola", price: 2.95 },
            { id: "yogurt_vanilla", name: "Greek Yogurt - OUI Vanilla Yogurt plain", price: 3.95 },
            { id: "yogurt_strawberry", name: "Greek Yogurt - OUI Strawberry Yogurt plain", price: 3.95 },
            { id: "yogurt_mixed_berry", name: "Greek Yogurt - OUI Mixed Berry Yogurt plain", price: 3.95 },
            { id: "fruit_cups", name: "Fruit - Assortment on cups", price: 4.95 }
          ]
        },
        {
          id: "grab_and_go_beverages",
          name: "Grab and Go Beverage",
          description: "Complete your breakfast with refreshing beverage options",
          items: [
            { id: "coffee_regular", name: "Home Bites 96 oz Box of Coffee - Regular", price: 24.95 },
            { id: "coffee_decaf", name: "Home Bites 96 oz Box of Coffee - Decaf", price: 24.95 },
            { id: "starbucks_regular", name: "Starbucks Coffee Traveler - Pike Regular", price: 29.95 },
            { id: "starbucks_decaf", name: "Starbucks Coffee Traveler - Pike Decaf", price: 29.95 },
            { id: "dunkin_regular", name: "Dunkin Box O' Joe - Regular", price: 28.95 },
            { id: "dunkin_decaf", name: "Dunkin Box O' Joe - Decaf", price: 28.95 },
            { id: "starbucks_canned", name: "Starbucks Ready to Drink Coffee, Espresso & Cream, 6.5oz Cans", price: 4.95 },
            { id: "dunkin_hot_chocolate", name: "Dunkin Hot Chocolate - (Box O'Joe Hot)", price: 28.95 },
            { id: "tea_assorted", name: "Home Bites 96 oz Box of Tea - Assorted Flavors", price: 24.95 },
            { id: "cold_brew_vanilla", name: "Lucky Jack Cold Brew Coffee Vanilla - Draft Pour Nitro Latte w/Oat milk - Cold", price: 5.95 },
            { id: "juice_orange", name: "Juice - Orange", price: 3.95 },
            { id: "juice_apple", name: "Juice - Apple", price: 3.95 },
            { id: "juice_grapefruit", name: "Juice - Grapefruit", price: 3.95 },
            { id: "juice_cranberry", name: "Juice - Cranberry", price: 3.95 },
            { id: "juice_tomato", name: "Juice - Tomato", price: 3.95 },
            { id: "v8_classic", name: "Juice - V8 Classic", price: 3.95 },
            { id: "v8_peach_mango", name: "V8 +ENERGY Peach Mango", price: 4.95 },
            { id: "v8_black_cherry", name: "V8 +ENERGY Black Cherry", price: 4.95 },
            { id: "v8_pomegranate", name: "V8 +ENERGY Pomegranate Blueberry", price: 4.95 }
          ]
        }
      ]
    },
    {
      id: "continental",
      name: "Continental",
      description: "A Continental breakfast package with your choice of staples and beverages.",
      minGuestCount: 10,
      sections: [
        {
          id: "service_style",
          name: "Service Style",
          description: "Choose your preferred service style",
          selectType: "single",
          items: [
            { id: "drop_off", name: "Drop off", price: 0 },
            { id: "buffet_standard", name: "Buffet Standard", price: 5 },
            { id: "buffet_unattended", name: "Buffet set up (unattended)", price: 3 },
            { id: "buffet_full_service", name: "Buffet Full Service", price: 8 },
            { id: "family_style", name: "Family Style Service", price: 10 }
          ]
        },
        {
          id: "continental_staples",
          name: "Continental Breakfast Staple Choices",
          description: "Pick 3 staple items",
          selectLimit: 3,
          required: true,
          items: [
            { id: "assorted_pastries", name: "Assorted Pastries - muffins, danish, whole grain bagels with butter and jam", price: 5.95 },
            { id: "cereal_variety", name: "Cereal Variety - individual packs with 2% milk and almond milk (if requested)", price: 4.95 },
            { id: "oatmeal", name: "Oatmeal - individual variety with cream (half/half), butter and jam", price: 4.95 },
            { id: "quiche", name: "Quiche (3 fluffy eggs)", price: 6.95 },
            { id: "seasonal_fruit", name: "Seasonal fruit such as apples, bananas, and oranges", price: 5.95 },
            { id: "yogurt_parfait", name: "Yogurt Parfait with granola", price: 5.95 }
          ]
        },
        {
          id: "continental_beverages",
          name: "Continental Breakfast - Beverage choices",
          description: "Pick 2 beverage options",
          selectLimit: 2,
          required: true,
          items: [
            { id: "coffee_regular", name: "Home Bites 96 oz Box of Coffee - Regular", price: 24.95 },
            { id: "coffee_decaf", name: "Home Bites 96 oz Box of Coffee - Decaf", price: 24.95 },
            { id: "tea_assorted", name: "Home Bites 96 oz Box of Tea - Assorted Flavors", price: 24.95 },
            { id: "juice_orange", name: "Juice - Orange", price: 3.95 },
            { id: "juice_apple", name: "Juice - Apple", price: 3.95 },
            { id: "juice_grapefruit", name: "Juice - Grapefruit", price: 3.95 },
            { id: "juice_cranberry", name: "Juice - Cranberry", price: 3.95 },
            { id: "juice_tomato", name: "Juice - Tomato", price: 3.95 },
            { id: "v8_classic", name: "Juice - V8 Classic", price: 3.95 }
          ]
        }
      ]
    },
    {
      id: "american",
      name: "American",
      description: "A classic American breakfast with a variety of options to create your ideal morning meal.",
      minGuestCount: 10,
      sections: [
        {
          id: "eggs",
          name: "American Breakfast - Egg Choices",
          description: "Choose 1",
          selectLimit: 1,
          required: true,
          items: [
            { id: "scrambled", name: "Scrambled", price: 4.95 },
            { id: "fried", name: "Fried", price: 4.95 },
            { id: "over_easy", name: "Over easy", price: 4.95 },
            { id: "egg_whites", name: "Egg whites", price: 5.95 },
            { id: "omelette", name: "Omelette", price: 6.95 }
          ]
        },
        {
          id: "meats",
          name: "American Breakfast - Meats",
          description: "Choose 2",
          selectLimit: 2,
          required: true,
          items: [
            { id: "bacon", name: "Bacon", price: 5.95 },
            { id: "sausage_links", name: "Sausage links", price: 5.95 },
            { id: "sausage_patties", name: "Sausage patties", price: 5.95 },
            { id: "ham", name: "Ham", price: 5.95 },
            { id: "turkey_bacon", name: "Turkey bacon", price: 6.95 },
            { id: "corned_beef_hash", name: "Corned beef hash", price: 7.95 },
            { id: "tofu", name: "Tofu", price: 5.95 }
          ]
        },
        {
          id: "potatoes",
          name: "American Breakfast - Potatoes",
          description: "Choose 1",
          selectLimit: 1,
          required: true,
          items: [
            { id: "hash_browns", name: "Hash browns", price: 4.95 },
            { id: "country_style", name: "Country style with onions", price: 4.95 },
            { id: "obrien", name: "O'Brien", price: 4.95 },
            { id: "red_bliss", name: "Red Bliss", price: 4.95 }
          ]
        },
        {
          id: "breads",
          name: "American Breakfast - Breads",
          description: "Choose 1",
          selectLimit: 1,
          required: true,
          items: [
            { id: "toast", name: "Toast with butter", price: 3.95 },
            { id: "english_muffin", name: "English muffin with butter", price: 3.95 },
            { id: "biscuits_gravy", name: "Biscuits with gravy", price: 5.95 },
            { id: "pancakes", name: "Pancakes", price: 5.95 },
            { id: "waffles", name: "Waffles", price: 5.95 },
            { id: "french_toast", name: "French toast", price: 5.95 }
          ]
        },
        {
          id: "sides",
          name: "American Breakfast - Sides",
          description: "Choose 1",
          selectLimit: 1,
          required: true,
          items: [
            { id: "fruit_salad", name: "Fruit salad", price: 5.95 },
            { id: "yogurt", name: "Yogurt", price: 4.95 },
            { id: "cottage_cheese", name: "Cottage cheese", price: 4.95 },
            { id: "grits", name: "Grits", price: 4.95 },
            { id: "oatmeal", name: "Oatmeal", price: 4.95 }
          ]
        },
        {
          id: "beverages",
          name: "American Breakfast - Beverages",
          description: "Choose 2",
          selectLimit: 2,
          required: true,
          items: [
            { id: "coffee", name: "Coffee - Regular/Decaf", price: 24.95 },
            { id: "tea", name: "Tea - Hot/Iced", price: 24.95 },
            { id: "milk", name: "Milk - Whole/2%", price: 3.95 },
            { id: "juice_orange", name: "Juice - Orange", price: 3.95 },
            { id: "juice_apple", name: "Juice - Apple", price: 3.95 },
            { id: "juice_grapefruit", name: "Juice - Grapefruit", price: 3.95 },
            { id: "juice_cranberry", name: "Juice - Cranberry", price: 3.95 },
            { id: "juice_tomato", name: "Juice - Tomato", price: 3.95 },
            { id: "v8_classic", name: "Juice - V8 Classic", price: 3.95 }
          ]
        }
      ]
    },
    {
      id: "full_monty",
      name: "The Full Monty",
      description: "A delicious assortment of anything you could imagine for a complete sit-down or buffet style service that is sure to please. All items would be included in this quote.",
      minGuestCount: 15,
      sections: [
        {
          id: "service_style",
          name: "Full Monty - Service Style",
          description: "Choose your preferred service style",
          selectType: "single",
          required: true,
          items: [
            { id: "drop_off", name: "Drop off", price: 0 },
            { id: "buffet_unattended", name: "Buffet set up (unattended)", price: 3 },
            { id: "buffet_full_service", name: "Buffet Full Service", price: 8 },
            { id: "family_style", name: "Family Style", price: 10 }
          ]
        },
        {
          id: "eggs",
          name: "Eggs",
          description: "Check all that apply",
          selectType: "multiple",
          required: true,
          items: [
            { id: "scrambled_eggs", name: "Scrambled Eggs", price: 4.95 },
            { id: "fried_eggs", name: "Fried Eggs", price: 4.95 },
            { id: "poached_eggs", name: "Poached Eggs", price: 4.95 },
            { id: "scrambled_egg_whites", name: "Scrambled Egg Whites", price: 5.95 },
            { id: "omelets", name: "Omelets", price: 6.95 }
          ]
        },
        {
          id: "breakfast_meats",
          name: "Breakfast Meats",
          description: "Check all that apply",
          selectType: "multiple",
          required: true,
          items: [
            { id: "applewood_bacon", name: "Applewood Bacon", price: 5.95 },
            { id: "sausage_links", name: "Sausage Links", price: 5.95 },
            { id: "turkey_bacon", name: "Turkey Bacon", price: 6.95 },
            { id: "ham", name: "Ham", price: 5.95 },
            { id: "corned_beef_hash", name: "Corned Beef Hash", price: 7.95 },
            { id: "tofu", name: "Tofu", price: 5.95 },
            { id: "assorted_vegetables", name: "Assorted Vegetables", price: 5.95 }
          ]
        },
        {
          id: "breads",
          name: "Breads",
          description: "Check all that apply",
          selectType: "multiple",
          required: true,
          items: [
            { id: "toast_english_muffins", name: "Toast/English muffins", price: 3.95 },
            { id: "bagels_cream_cheese", name: "Bagels with cream cheese", price: 4.95 },
            { id: "croissants", name: "Croissants", price: 4.95 },
            { id: "biscuits_gravy", name: "Biscuits and Gravy", price: 5.95 },
            { id: "whole_wheat", name: "Whole wheat", price: 3.95 },
            { id: "sourdough", name: "Sourdough", price: 3.95 },
            { id: "multigrain", name: "Multigrain", price: 3.95 },
            { id: "gluten_free", name: "Gluten-free", price: 4.95 }
          ]
        },
        {
          id: "sweet_selections",
          name: "Sweet Selections",
          description: "Check all that apply",
          selectType: "multiple",
          required: true,
          items: [
            { id: "pancakes", name: "Pancakes", price: 5.95 },
            { id: "waffles", name: "Waffles", price: 5.95 },
            { id: "french_toast", name: "French toast with syrup", price: 5.95 },
            { id: "assorted_pastries", name: "Assorted Pastries", price: 5.95 },
            { id: "sweet_crepes", name: "Sweet crepes", price: 6.95 },
            { id: "cinnamon_rolls", name: "Cinnamon rolls", price: 5.95 },
            { id: "danish", name: "Danish", price: 4.95 }
          ]
        },
        {
          id: "savory_selections",
          name: "Other Savory Selections",
          description: "Check all that apply",
          selectType: "multiple",
          required: true,
          items: [
            { id: "burrito_mexi", name: "Breakfast Burrito - The Mexi", price: 8.95 },
            { id: "burrito_carnivore", name: "Breakfast Burrito - The Carnivore", price: 8.95 },
            { id: "burrito_cali", name: "Breakfast Burrito - The Cali", price: 8.95 },
            { id: "burrito_green", name: "Breakfast Burrito - The Green (Vegetarian)", price: 8.95 },
            { id: "quiche_green", name: "Quiche - Green (Vegetarian)", price: 6.95 },
            { id: "mexican_quiche", name: "Mexican Quiche", price: 6.95 },
            { id: "breakfast_casserole", name: "Breakfast Casserole", price: 7.95 },
            { id: "denver_hamm", name: "Denver HAMM Breakfast", price: 7.95 }
          ]
        },
        {
          id: "sides_selections",
          name: "Sides Selections",
          description: "Check all that apply",
          selectType: "multiple",
          required: true,
          items: [
            { id: "fruits_berries", name: "Fruits and Berries", price: 5.95 },
            { id: "potatoes", name: "Potatoes", price: 4.95 },
            { id: "bacon_side", name: "Bacon", price: 5.95 },
            { id: "sausage_side", name: "Sausage", price: 5.95 }
          ]
        },
        {
          id: "beverages",
          name: "Beverages",
          description: "Check all that apply",
          selectType: "multiple",
          required: true,
          items: [
            { id: "coffee_regular", name: "Home Bites 96 oz Box of Coffee - Regular", price: 24.95 },
            { id: "coffee_decaf", name: "Home Bites 96 oz Box of Coffee - Decaf", price: 24.95 },
            { id: "starbucks_regular", name: "Starbucks Coffee Traveler - Pike Regular", price: 29.95 },
            { id: "dunkin_regular", name: "Dunkin Box O' Joe - Regular", price: 28.95 },
            { id: "dunkin_decaf", name: "Dunkin Box O' Joe - Decaf", price: 28.95 },
            { id: "starbucks_canned", name: "Starbucks Ready to Drink Coffee, Espresso & Cream, 6.5oz Cans", price: 4.95 },
            { id: "dunkin_hot_chocolate", name: "Dunkin Hot Chocolate - (Box O'Joe Hot)", price: 28.95 },
            { id: "tea_assorted", name: "Home Bites 96 oz Box of Tea - Assorted Flavors", price: 24.95 },
            { id: "cold_brew_vanilla", name: "Lucky Jack Cold Brew Coffee Vanilla - Draft Pour Nitro Latte", price: 5.95 },
            { id: "juice_orange", name: "Juice - Orange", price: 3.95 },
            { id: "juice_apple", name: "Juice - Apple", price: 3.95 },
            { id: "juice_grapefruit", name: "Juice - Grapefruit", price: 3.95 },
            { id: "juice_cranberry", name: "Juice - Cranberry", price: 3.95 },
            { id: "juice_tomato", name: "Juice - Tomato", price: 3.95 },
            { id: "v8_classic", name: "Juice - V8 Classic", price: 3.95 },
            { id: "v8_peach_mango", name: "V8 +ENERGY Peach Mango", price: 4.95 },
            { id: "v8_black_cherry", name: "V8 +ENERGY Black Cherry", price: 4.95 },
            { id: "v8_pomegranate", name: "V8 +ENERGY Pomegranate Blueberry", price: 4.95 }
          ]
        }
      ]
    }
  ]
};