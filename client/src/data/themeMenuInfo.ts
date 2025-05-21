// Import necessary types
export type MenuItem = {
  id: string;
  name: string;
  upcharge?: number;
};

export type MenuCategory = {
  title: string;
  description: string;
  limits?: {
    [packageId: string]: number;
  };
  items: MenuItem[];
};

export type MenuPackage = {
  id: string;
  name: string;
  price: number;
  description: string;
  minGuestCount?: number;
  limits?: {
    proteins?: number;
    mains?: number;
    sides?: number;
    salads?: number;
    salsas?: number;
    sauces?: number;
    condiments?: number;
  };
};

export type ThemeMenu = {
  title: string;
  description: string;
  customizable?: boolean;
  packages: MenuPackage[];
  categories: {
    [key: string]: MenuCategory;
  };
};

// Main theme menu data structure
export const themeMenuData = {
  // Just a single theme for testing
  taco_fiesta: {
    title: 'Taco Fiesta',
    description: 'A festive Mexican-inspired menu perfect for casual gatherings and celebrations',
    packages: [
      {
        id: 'bronze',
        name: 'Bronze Package',
        price: 32.00,
        description: 'Basic taco bar setup',
        minGuestCount: 0,
        limits: {
          proteins: 2,
          sides: 2,
          salsas: 2,
          condiments: 3
        }
      }
    ],
    categories: {
      proteins: {
        title: 'Proteins',
        description: 'Select your protein options',
        limits: {
          'bronze': 2
        },
        items: [
          { id: 'barbacoa', name: 'Barbacoa', upcharge: 0 }
        ]
      }
    }
  }
};
