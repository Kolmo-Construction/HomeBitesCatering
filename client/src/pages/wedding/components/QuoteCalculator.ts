// Professional quote calculation engine for wedding catering
import { WeddingInquiryFormData } from '../types/WeddingInquiryTypes';

export interface QuoteBreakdown {
  menuCosts: {
    foodCostPerPerson: number;
    totalFoodCost: number;
    selectedItems: Array<{
      name: string;
      category: string;
      basePrice: number;
      upcharge: number;
      quantity: number;
    }>;
  };
  serviceCosts: {
    serviceStyle: string;
    serviceMultiplier: number;
    baseLaborCost: number;
    totalServiceCost: number;
  };
  staffingCosts: {
    waitStaff: { count: number; rate: number; hours: number; cost: number };
    chefs: { count: number; rate: number; hours: number; cost: number };
    bartenders: { count: number; rate: number; hours: number; cost: number };
    setupCrew: { count: number; rate: number; hours: number; cost: number };
    coordinator: { needed: boolean; rate: number; cost: number };
    totalStaffingCost: number;
  };
  equipmentCosts: {
    rentalItems: Array<{
      item: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }>;
    deliveryFee: number;
    totalEquipmentCost: number;
  };
  additionalCosts: {
    cocktailHour: number;
    lateNightService: number;
    specialDietaryAccommodations: number;
    venueLogistics: number;
    totalAdditionalCosts: number;
  };
  summary: {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    serviceCharge: number;
    total: number;
    pricePerPerson: number;
  };
}

// Base rates and multipliers for professional catering
const PRICING_CONFIG = {
  // Service style multipliers
  serviceMultipliers: {
    plated: 1.8,
    buffet: 1.3,
    family_style: 1.5,
    cocktail: 1.6,
    stations: 1.7,
    mixed: 1.9
  },
  
  // Staffing rates (per hour)
  staffRates: {
    waitStaff: 25,
    chef: 35,
    bartender: 30,
    setupCrew: 20,
    coordinator: 45,
    expediter: 28
  },
  
  // Equipment rental costs
  equipmentRates: {
    table: 12,
    chair: 3,
    linen: 8,
    glassware: 0.75,
    silverware: 0.50,
    plate: 1.25,
    servingPiece: 15,
    chafer: 25,
    tent: 3.50, // per sq ft
    heater: 75,
    generator: 150
  },
  
  // Additional service costs
  additionalServices: {
    cocktailHourPerPerson: 15,
    lateNightSnackPerPerson: 8,
    specialDietaryFee: 5,
    venueAccessFee: 200,
    deliveryBaseFee: 150
  },
  
  // Tax and service charges
  taxRate: 0.08,
  serviceChargeRate: 0.18
};

export class QuoteCalculator {
  private formData: WeddingInquiryFormData;
  private menuData: any;

  constructor(formData: WeddingInquiryFormData, menuData: any) {
    this.formData = formData;
    this.menuData = menuData;
  }

  calculateComprehensiveQuote(): QuoteBreakdown {
    const menuCosts = this.calculateMenuCosts();
    const serviceCosts = this.calculateServiceCosts();
    const staffingCosts = this.calculateStaffingCosts();
    const equipmentCosts = this.calculateEquipmentCosts();
    const additionalCosts = this.calculateAdditionalCosts();
    
    const subtotal = 
      menuCosts.totalFoodCost + 
      serviceCosts.totalServiceCost + 
      staffingCosts.totalStaffingCost + 
      equipmentCosts.totalEquipmentCost + 
      additionalCosts.totalAdditionalCosts;

    const taxAmount = subtotal * PRICING_CONFIG.taxRate;
    const serviceCharge = subtotal * PRICING_CONFIG.serviceChargeRate;
    const total = subtotal + taxAmount + serviceCharge;

    return {
      menuCosts,
      serviceCosts,
      staffingCosts,
      equipmentCosts,
      additionalCosts,
      summary: {
        subtotal,
        taxRate: PRICING_CONFIG.taxRate,
        taxAmount,
        serviceCharge,
        total,
        pricePerPerson: total / this.formData.guestInfo.totalGuests
      }
    };
  }

  private calculateMenuCosts() {
    const { selectedTheme, selectedTier, selectedItems } = this.formData.menuSelections;
    const guestCount = this.formData.guestInfo.totalGuests;
    
    // Get tier pricing from the actual tier packages
    const tierPricing = this.getTierPricing(selectedTier);
    let totalFoodCost = tierPricing.basePrice * guestCount;
    
    const selectedItemsDetails: any[] = [];
    
    // Calculate upcharges from actual selected menu items
    if (selectedItems && this.menuData) {
      Object.entries(selectedItems).forEach(([category, itemIds]) => {
        (itemIds as string[]).forEach(itemId => {
          const menuItem = this.findMenuItem(itemId);
          if (menuItem && menuItem.upcharge > 0) {
            const upchargeCost = menuItem.upcharge * guestCount;
            totalFoodCost += upchargeCost;
            
            selectedItemsDetails.push({
              name: menuItem.name,
              category,
              basePrice: tierPricing.basePrice,
              upcharge: menuItem.upcharge,
              quantity: guestCount
            });
          }
        });
      });
    }

    return {
      foodCostPerPerson: totalFoodCost / guestCount,
      totalFoodCost,
      selectedItems: selectedItemsDetails
    };
  }

  private calculateServiceCosts() {
    const serviceStyle = this.formData.serviceRequirements.serviceStyle;
    const guestCount = this.formData.guestInfo.totalGuests;
    const eventDuration = this.formData.eventDetails.eventDuration;
    
    const serviceMultiplier = PRICING_CONFIG.serviceMultipliers[serviceStyle as keyof typeof PRICING_CONFIG.serviceMultipliers] || 1.5;
    const baseLaborCost = guestCount * 8; // Base labor cost per guest
    const totalServiceCost = baseLaborCost * serviceMultiplier * (eventDuration / 6); // Adjust for event length

    return {
      serviceStyle,
      serviceMultiplier,
      baseLaborCost,
      totalServiceCost
    };
  }

  private calculateStaffingCosts() {
    const guestCount = this.formData.guestInfo.totalGuests;
    const eventDuration = this.formData.eventDetails.eventDuration;
    const setupHours = 3; // Standard setup time
    const totalHours = setupHours + eventDuration + 2; // Include breakdown
    
    // Calculate recommended staffing based on service style and guest count
    const recommendedStaffing = this.calculateRecommendedStaffing();
    
    const waitStaffCost = recommendedStaffing.waitStaff * PRICING_CONFIG.staffRates.waitStaff * totalHours;
    const chefsCost = recommendedStaffing.chefs * PRICING_CONFIG.staffRates.chef * totalHours;
    const bartendersCost = recommendedStaffing.bartenders * PRICING_CONFIG.staffRates.bartender * totalHours;
    const setupCrewCost = recommendedStaffing.setupCrew * PRICING_CONFIG.staffRates.setupCrew * setupHours;
    const coordinatorCost = recommendedStaffing.coordinator ? PRICING_CONFIG.staffRates.coordinator * totalHours : 0;

    const totalStaffingCost = waitStaffCost + chefsCost + bartendersCost + setupCrewCost + coordinatorCost;

    return {
      waitStaff: { 
        count: recommendedStaffing.waitStaff, 
        rate: PRICING_CONFIG.staffRates.waitStaff, 
        hours: totalHours, 
        cost: waitStaffCost 
      },
      chefs: { 
        count: recommendedStaffing.chefs, 
        rate: PRICING_CONFIG.staffRates.chef, 
        hours: totalHours, 
        cost: chefsCost 
      },
      bartenders: { 
        count: recommendedStaffing.bartenders, 
        rate: PRICING_CONFIG.staffRates.bartender, 
        hours: totalHours, 
        cost: bartendersCost 
      },
      setupCrew: { 
        count: recommendedStaffing.setupCrew, 
        rate: PRICING_CONFIG.staffRates.setupCrew, 
        hours: setupHours, 
        cost: setupCrewCost 
      },
      coordinator: { 
        needed: recommendedStaffing.coordinator, 
        rate: PRICING_CONFIG.staffRates.coordinator, 
        cost: coordinatorCost 
      },
      totalStaffingCost
    };
  }

  private calculateEquipmentCosts() {
    const guestCount = this.formData.guestInfo.totalGuests;
    const rentalItems: any[] = [];
    let totalEquipmentCost = 0;

    // Calculate based on venue facilities and guest count
    if (!this.formData.eventDetails.hasKitchenFacilities) {
      // Add cooking equipment rentals
      rentalItems.push({
        item: 'Mobile Kitchen Setup',
        quantity: 1,
        unitCost: 500,
        totalCost: 500
      });
      totalEquipmentCost += 500;
    }

    // Tables and chairs (assuming 8 guests per table)
    const tablesNeeded = Math.ceil(guestCount / 8);
    const tablesCost = tablesNeeded * PRICING_CONFIG.equipmentRates.table;
    const chairsCost = guestCount * PRICING_CONFIG.equipmentRates.chair;
    
    rentalItems.push(
      { item: 'Tables', quantity: tablesNeeded, unitCost: PRICING_CONFIG.equipmentRates.table, totalCost: tablesCost },
      { item: 'Chairs', quantity: guestCount, unitCost: PRICING_CONFIG.equipmentRates.chair, totalCost: chairsCost }
    );
    totalEquipmentCost += tablesCost + chairsCost;

    // Add other equipment based on service style
    const serviceStyle = this.formData.serviceRequirements.serviceStyle;
    if (serviceStyle === 'buffet' || serviceStyle === 'stations') {
      const chafersCost = 6 * PRICING_CONFIG.equipmentRates.chafer; // Standard buffet setup
      rentalItems.push({
        item: 'Chafing Dishes & Buffet Setup',
        quantity: 6,
        unitCost: PRICING_CONFIG.equipmentRates.chafer,
        totalCost: chafersCost
      });
      totalEquipmentCost += chafersCost;
    }

    // Venue-specific equipment
    if (this.formData.eventDetails.venueType === 'outdoor' || this.formData.eventDetails.venueType === 'tent') {
      const generatorCost = PRICING_CONFIG.equipmentRates.generator;
      rentalItems.push({
        item: 'Generator',
        quantity: 1,
        unitCost: generatorCost,
        totalCost: generatorCost
      });
      totalEquipmentCost += generatorCost;
    }

    const deliveryFee = PRICING_CONFIG.additionalServices.deliveryBaseFee;
    totalEquipmentCost += deliveryFee;

    return {
      rentalItems,
      deliveryFee,
      totalEquipmentCost
    };
  }

  private calculateAdditionalCosts() {
    const guestCount = this.formData.guestInfo.totalGuests;
    let totalAdditionalCosts = 0;

    // Cocktail hour
    const cocktailHourCost = this.formData.serviceRequirements.cocktailHour 
      ? guestCount * PRICING_CONFIG.additionalServices.cocktailHourPerPerson 
      : 0;
    totalAdditionalCosts += cocktailHourCost;

    // Late night service
    const lateNightCost = this.formData.serviceRequirements.lateNightSnacks 
      ? guestCount * PRICING_CONFIG.additionalServices.lateNightSnackPerPerson 
      : 0;
    totalAdditionalCosts += lateNightCost;

    // Special dietary accommodations
    const dietaryGuestCount = this.formData.guestInfo.guestsWithDietaryRestrictions || 0;
    const specialDietaryCost = dietaryGuestCount * PRICING_CONFIG.additionalServices.specialDietaryFee;
    totalAdditionalCosts += specialDietaryCost;

    // Venue logistics fee
    const venueLogisticsCost = this.formData.eventDetails.accessLimitations 
      ? PRICING_CONFIG.additionalServices.venueAccessFee 
      : 0;
    totalAdditionalCosts += venueLogisticsCost;

    return {
      cocktailHour: cocktailHourCost,
      lateNightService: lateNightCost,
      specialDietaryAccommodations: specialDietaryCost,
      venueLogistics: venueLogisticsCost,
      totalAdditionalCosts
    };
  }

  private getTierPricing(tierName: string) {
    const tierPricing = {
      bronze: { basePrice: 32 },
      silver: { basePrice: 38 },
      gold: { basePrice: 46 },
      platinum: { basePrice: 55 }
    };
    
    return tierPricing[tierName as keyof typeof tierPricing] || tierPricing.bronze;
  }

  private findMenuItem(itemId: string) {
    // Search through the actual menu data for the item
    if (this.menuData && this.menuData.allItems) {
      return this.menuData.allItems.find((item: any) => item.id === itemId);
    }
    return null;
  }

  private calculateRecommendedStaffing() {
    const guestCount = this.formData.guestInfo.totalGuests;
    const serviceStyle = this.formData.serviceRequirements.serviceStyle;
    const hasBar = this.formData.serviceRequirements.alcoholService !== 'none';

    // Professional staffing ratios based on service style
    let waitStaffRatio = 20; // guests per wait staff
    let chefRatio = 50; // guests per chef

    switch (serviceStyle) {
      case 'plated':
        waitStaffRatio = 15;
        chefRatio = 40;
        break;
      case 'buffet':
        waitStaffRatio = 25;
        chefRatio = 60;
        break;
      case 'family_style':
        waitStaffRatio = 18;
        chefRatio = 45;
        break;
      case 'cocktail':
        waitStaffRatio = 12;
        chefRatio = 35;
        break;
    }

    return {
      waitStaff: Math.max(2, Math.ceil(guestCount / waitStaffRatio)),
      chefs: Math.max(1, Math.ceil(guestCount / chefRatio)),
      bartenders: hasBar ? Math.max(1, Math.ceil(guestCount / 75)) : 0,
      setupCrew: Math.max(2, Math.ceil(guestCount / 100)),
      coordinator: guestCount >= 100
    };
  }
}