// Food Truck Menu Data Structure
export type FoodMenuItem = {
  id: string;
  name: string;
  price?: number; // Optional price for items with different pricing tiers
  category: string;
  description?: string;
};

export type FoodTruckMenuData = {
  introText: string;
  serviceNote: string;
  recommendedLimits: {
    smallBites: number;
    bigBites: number;
    kidsBites: number;
  };
  categories: {
    [key: string]: {
      title: string;
      priceInfo?: string;
      items: FoodMenuItem[];
    }
  };
};

// Food Truck Menu Data
export const foodTruckMenuData: FoodTruckMenuData = {
  introText: "Catering Menu Selections - make your selections below. For optimal service speed, especially with larger groups, a focused menu is recommended.",
  serviceNote: "Service Optimisation for Parties Over 40 Guests: To ensure prompt and efficient service for your event, we advise adhering to the following maximums when making your choices:",
  recommendedLimits: {
    smallBites: 3,
    bigBites: 4,
    kidsBites: 2
  },
  categories: {
    smallBites: {
      title: "Small Bites",
      items: [
        { id: "seasoned_fries", name: "Seasoned Fries", category: "smallBites" },
        { id: "greek_fries", name: "Greek Fries", category: "smallBites" },
        { id: "tofu_bites", name: "Sesame Crusted Tofu Bites", category: "smallBites" },
        { id: "fried_ravioli", name: "Fried Ravioli", category: "smallBites" },
        { id: "chicken_wings", name: "Chicken Wings", category: "smallBites" },
        { id: "mac_cheese", name: "Mac 'n' Cheese", category: "smallBites" },
        { id: "samosas", name: "Champignon Samosas", category: "smallBites" },
        { id: "artichoke_hearts", name: "Fried Artichoke Hearts", category: "smallBites" }
      ]
    },
    bigBitesStandard: {
      title: "Big Bites",
      priceInfo: "$16.00 Selections",
      items: [
        { id: "big_cheese", name: "The Big Cheese: Classic Cheeseburger", price: 16.00, category: "bigBitesStandard" },
        { id: "mushroom_burger", name: "Bella's Mushroom Burger", price: 16.00, category: "bigBitesStandard" },
        { id: "pulled_pork", name: "Pulled Pork Sliders", price: 16.00, category: "bigBitesStandard" },
        { id: "chicken_burger", name: "California Dreaming: Chicken Burger", price: 16.00, category: "bigBitesStandard" },
        { id: "gyro_wrap", name: "The Real Greek: Gyro Wrap", price: 16.00, category: "bigBitesStandard" },
        { id: "banh_mi", name: "The Banh Mi", price: 16.00, category: "bigBitesStandard" },
        { id: "gf_chicken_bites", name: "Nikki's Chicken Bites & Fries (Gluten-Free)", price: 16.00, category: "bigBitesStandard" },
        { id: "caesar_salad", name: "Caesar Salad with Nikki's Gluten-Free Chicken Bites", price: 16.00, category: "bigBitesStandard" }
      ]
    },
    bigBitesPremium: {
      title: "Big Bites - Premium",
      priceInfo: "$18.00 Selections",
      items: [
        { id: "brisket_sandwich", name: "Brisket Sandwich", price: 18.00, category: "bigBitesPremium" },
        { id: "reuben", name: "Miles' Reuben", price: 18.00, category: "bigBitesPremium" },
        { id: "brisket_gyro", name: "The Ranger: Brisket Gyro Wrap", price: 18.00, category: "bigBitesPremium" },
        { id: "hot_hen", name: "The Hot Hen", price: 18.00, category: "bigBitesPremium" },
        { id: "cubano", name: "The Cubano", price: 18.00, category: "bigBitesPremium" },
        { id: "chicken_parmesan", name: "Chicken Baguette Parmesan", price: 18.00, category: "bigBitesPremium" },
        { id: "steak_sandwich", name: "Gorgonzola Steak Sandwich", price: 18.00, category: "bigBitesPremium" },
        { id: "salmon_sandwich", name: "Blackened Salmon Sandwich", price: 18.00, category: "bigBitesPremium" }
      ]
    },
    vegetarianVegan: {
      title: "Vegetarian & Vegan Selections",
      priceInfo: "$16.00 Selections",
      items: [
        { id: "tofu_burger", name: "Sesame Crusted Tofu Burger (Vegan)", price: 16.00, category: "vegetarianVegan" },
        { id: "portobello_burger", name: "The Portobello Mushroom Burger (Vegan)", price: 16.00, category: "vegetarianVegan" },
        { id: "vegan_burger", name: "Bohemian Vegan Burger (Vegan)", price: 16.00, category: "vegetarianVegan" }
      ]
    },
    kidsBites: {
      title: "Kid's Bites",
      priceInfo: "$10.00 Selections",
      items: [
        { id: "kids_mac", name: "Kid's Mac 'n' Cheese", price: 10.00, category: "kidsBites" },
        { id: "kids_chicken", name: "Kid's Chicken and Fries (Gluten-Free)", price: 10.00, category: "kidsBites" },
        { id: "kids_burger", name: "Kid's Cheeseburger Slider and Fries", price: 10.00, category: "kidsBites" },
        { id: "kids_grilled_cheese", name: "Kid's Grilled Cheese", price: 10.00, category: "kidsBites" }
      ]
    }
  }
};