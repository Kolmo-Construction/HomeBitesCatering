    // wedding/data/weddingSandwichFactoryData.ts

    import type {
      SandwichPackageIdType,
      GlutenFreeOptionIdType,
    } from '../types/weddingFormTypes'; // Adjust path if necessary

    // Interface for items in master lists (like spreads, salads)
    export interface SandwichComponentItem {
      id: string;
      name: string;
      description?: string; // Optional description for items
    }

    // Interface for defining gluten-free options
    export interface GlutenFreeOptionDefinition {
      id: GlutenFreeOptionIdType;
      name: string;
      pricePerPerson: number;
    }

    // Interface for defining sandwich packages
    export interface SandwichPackageDefinition {
      id: SandwichPackageIdType;
      name: string;
      pricePerPerson: number;
      description: string;
      meatsList: string[];
      cheesesList: string[];
      veggiesList: string[];
      veggiesNote?: string;
      breadsList: string[];
      drinksIncluded?: string[];
      spreadLimit: number;
      saladLimit: number;
    }

    // Main interface for all sandwich factory data
    export interface SandwichFactoryData {
      packages: SandwichPackageDefinition[];
      spreadsMasterList: SandwichComponentItem[];
      saladsMasterList: SandwichComponentItem[];
      glutenFreeOptions: GlutenFreeOptionDefinition[];
    }

    export const sandwichFactoryDataNew: SandwichFactoryData = {
      packages: [
        {
          id: "bronze",
          name: "Bronze Package",
          pricePerPerson: 15.99,
          description:
            "Our essential offering. Includes a selection of classic meats, cheeses, fresh veggies, and your choice of White, Whole Wheat, Sourdough, or Rye breads. Comes with 1 condiment/spread choice and 1 salad choice.",
          meatsList: ["Turkey Breast", "Ham", "Pepperoni"],
          cheesesList: ["Cheddar Cheese", "Swiss Cheese", "Monterey Cheese"],
          veggiesList: ["Lettuce", "Tomato", "Onion"],
          breadsList: ["White Bread", "Whole Wheat Bread", "Sourdough", "Rye"],
          spreadLimit: 1,
          saladLimit: 1,
        },
        {
          id: "silver",
          name: "Silver Package",
          pricePerPerson: 18.99,
          description:
            "A step up with more variety. Includes an expanded selection of meats (including chicken), cheeses, fresh veggies, and your choice of White, Whole Wheat, Sourdough, or Rye breads. Comes with 2 condiment/spread choices and 1 salad choice.",
          meatsList: ["Chicken Breast", "Turkey", "Ham", "Pepperoni"],
          cheesesList: [
            "Cheddar Cheese",
            "Swiss Cheese",
            "Provolone",
            "Monterey Cheese",
          ],
          veggiesList: ["Lettuce", "Tomato", "Onion"],
          breadsList: ["White Bread", "Whole Wheat Bread", "Sourdough", "Rye"],
          spreadLimit: 2,
          saladLimit: 1,
        },
        {
          id: "gold",
          name: "Gold Package",
          pricePerPerson: 20.99,
          description:
            "Great value with more premium options. Features premium meats like smoked turkey and roast beef, a wider cheese selection, more veggies including avocado and spinach, and an expanded bread selection including multigrain, bagels, and croissants. Comes with 3 condiment/spread choices and 2 salad choices.",
          meatsList: [
            "Smoked Turkey",
            "Black Forest Ham",
            "Pepperoni",
            "Corned Beef",
            "Roast Beef",
          ],
          cheesesList: [
            "Cheddar Cheese",
            "Swiss Cheese",
            "Monterey Cheese",
            "Gouda",
            "Cream Cheese",
          ],
          veggiesList: ["Lettuce", "Tomato", "Onion", "Avocado", "Spinach", "Arugula"],
          breadsList: [
            "Sourdough",
            "Rye",
            "Whole Wheat Bread",
            "Multigrain Bread",
            "Bagels",
            "Croissants",
          ],
          spreadLimit: 3,
          saladLimit: 2,
        },
        {
          id: "diamond",
          name: "Diamond Package",
          pricePerPerson: 24.99,
          description:
            "Our top-tier offering for the ultimate spread. Includes the widest selection of premium meats like pastrami and salami, gourmet cheeses including Brie and Havarti, an extensive veggie list including bell peppers (special requests honored!), and our full bread selection including multigrain, bagels, and croissants. Comes with 4 condiment/spread choices, 3 salad choices, and bottled water.",
          meatsList: [
            "Smoked Turkey",
            "Black Forest Ham",
            "Pepperoni",
            "Salami",
            "Roast Beef",
            "Pastrami",
          ],
          cheesesList: [
            "Cheddar Cheese",
            "Swiss Cheese",
            "Monterey Cheese",
            "Havarti",
            "Brie",
            "Gouda",
            "Cream Cheese",
          ],
          veggiesList: ["Lettuce", "Tomato", "Onion", "Avocado", "Spinach", "Arugula", "Bell Peppers"],
          veggiesNote: "Most special requests are honored!",
          breadsList: [
            "Sourdough",
            "Rye",
            "Whole Wheat Bread",
            "Multigrain Bread",
            "Bagels",
            "Croissants",
          ],
          drinksIncluded: ["Bottled Water"],
          spreadLimit: 4,
          saladLimit: 3,
        },
      ],
      spreadsMasterList: [
        { id: "sp_classic_mayo", name: "Classic Mayo" },
        { id: "sp_vegan_mayo", name: "Vegan Mayo" },
        { id: "sp_spicy_cran_mayo", name: "Spicy Cranberry Mayo" },
        { id: "sp_stone_mustard", name: "Stone Ground Mustard" },
        { id: "sp_honey_mustard", name: "Honey Mustard" },
        { id: "sp_vegan_chipotle_aioli", name: "Vegan Chipotle Jalapeno Aioli" },
        { id: "sp_citrus_aioli", name: "Citrus Aioli" },
        { id: "sp_basil_aioli", name: "Basil Aioli" },
        { id: "sp_horseradish_aioli", name: "Horseradish Aioli" },
        { id: "sp_cranberry_relish", name: "Cranberry Relish" },
        { id: "sp_sweet_pickle_relish", name: "Classic Sweet Pickle Relish" },
        { id: "sp_balsamic_fig_jam", name: "Balsamic Fig Jam" },
        { id: "sp_avocado_lime_spread", name: "Avocado & Lime Spread" },
        { id: "sp_eggplant_tahini_spread", name: "Eggplant & Tahini Spread" },
        { id: "sp_pomegranate_pepper_walnut", name: "Pomegranate / Pepper / Walnut Spread" },
        { id: "sp_sundried_tomato_pesto", name: "Sun-dried Tomato Pesto (Dairy Free)" },
      ],
      saladsMasterList: [
        { id: "sl_kale_salad", name: "Kale Salad" },
        { id: "sl_greek_village", name: "Greek Village Salad" },
        { id: "sl_italian_pasta", name: "Italian Pasta Salad" },
        { id: "sl_traditional_macaroni", name: "Traditional Macaroni Salad" },
        { id: "sl_german_cucumber", name: "German Cucumber Salad" },
        { id: "sl_wedge_salad", name: "Wedge Salad" },
        { id: "sl_tomato_mozzarella", name: "Tomato Mozzarella Salad" },
        { id: "sl_tossed_cobb", name: "Tossed Cobb" },
        { id: "sl_crunchy_asian", name: "Crunchy Asian Salad" },
        { id: "sl_caesar_salad", name: "Caesar Salad" },
        { id: "sl_garden_salad", name: "Garden Salad" },
        { id: "sl_mediterranean_bread", name: "Mediterranean Bread Salad (Fattoush)" },
        { id: "sl_classic_potato", name: "Classic Potato Salad" },
        { id: "sl_german_potato", name: "German Potato Salad" },
      ],
      glutenFreeOptions: [
        {
          id: "none", // For the "No, thank you" option
          name: "No, thank you.",
          pricePerPerson: 0,
        },
        {
          id: "gf_bread",
          name: "Gluten Free Bread",
          pricePerPerson: 2.00,
        },
        {
          id: "gf_vegan_bread",
          name: "Gluten Free Vegan Bread",
          pricePerPerson: 2.50,
        },
      ],
    };