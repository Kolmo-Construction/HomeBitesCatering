import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calculator,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  upcharge: number;
  category: string;
}

interface MenuBalanceCardProps {
  selectedItems: Record<string, string[]>;
  menuData: {
    allItems: MenuItem[];
    itemsByCategory: Record<string, {
      title: string;
      description: string;
      selectionLimit: number | null;
      items: MenuItem[];
    }>;
  } | null;
  guestCount: number;
  selectedTier: string;
  basePricing: Record<string, number>;
}

const MenuBalanceCard: React.FC<MenuBalanceCardProps> = ({
  selectedItems,
  menuData,
  guestCount,
  selectedTier,
  basePricing
}) => {
  // Calculate base cost from tier pricing
  const baseCostPerPerson = basePricing[selectedTier] || 0;
  const baseTotalCost = baseCostPerPerson * guestCount;

  // Calculate upcharges and build detailed breakdown
  const calculateCostBreakdown = () => {
    if (!menuData) return { upcharges: 0, breakdown: [], categoryStats: {} };

    let totalUpcharges = 0;
    const breakdown: Array<{
      category: string;
      items: Array<{ name: string; upcharge: number; perPerson: number; total: number }>;
      categoryTotal: number;
    }> = [];
    
    const categoryStats: Record<string, { selected: number; available: number; limit: number | null }> = {};

    // Create lookup for all items
    const itemsLookup: Record<string, MenuItem> = {};
    menuData.allItems.forEach(item => {
      itemsLookup[item.id] = item;
    });

    // Process each category
    Object.entries(selectedItems).forEach(([categoryKey, itemIds]) => {
      const categoryData = menuData.itemsByCategory[categoryKey];
      if (!categoryData) return;

      const categoryItems: Array<{ name: string; upcharge: number; perPerson: number; total: number }> = [];
      let categoryUpcharges = 0;

      itemIds.forEach(itemId => {
        const item = itemsLookup[itemId];
        if (item && item.upcharge > 0) {
          const itemTotal = item.upcharge * guestCount;
          categoryUpcharges += itemTotal;
          categoryItems.push({
            name: item.name,
            upcharge: item.upcharge,
            perPerson: item.upcharge,
            total: itemTotal
          });
        }
      });

      if (categoryItems.length > 0) {
        breakdown.push({
          category: categoryData.title,
          items: categoryItems,
          categoryTotal: categoryUpcharges
        });
      }

      totalUpcharges += categoryUpcharges;

      // Track category selection stats
      categoryStats[categoryKey] = {
        selected: itemIds.length,
        available: categoryData.items.length,
        limit: categoryData.selectionLimit
      };
    });

    return { upcharges: totalUpcharges, breakdown, categoryStats };
  };

  const { upcharges, breakdown, categoryStats } = calculateCostBreakdown();
  const totalCost = baseTotalCost + upcharges;
  const costPerPerson = guestCount > 0 ? totalCost / guestCount : 0;

  // Calculate value metrics
  const totalItemsSelected = Object.values(selectedItems).flat().length;
  const averageUpchargePerItem = totalItemsSelected > 0 ? upcharges / (totalItemsSelected * guestCount) : 0;
  
  // Calculate completion percentage
  const categoryCompletionStats = Object.entries(categoryStats).map(([key, stats]) => {
    if (stats.limit) {
      return Math.min((stats.selected / stats.limit) * 100, 100);
    }
    return stats.selected > 0 ? 100 : 0;
  });
  const overallCompletion = categoryCompletionStats.length > 0 
    ? categoryCompletionStats.reduce((a, b) => a + b, 0) / categoryCompletionStats.length 
    : 0;

  // Determine pricing insights
  const getPricingInsight = () => {
    if (upcharges === 0) {
      return { type: 'great', message: 'Perfect! No additional charges for your selections.' };
    } else if (averageUpchargePerItem < 2) {
      return { type: 'good', message: 'Excellent value - minimal premium items selected.' };
    } else if (averageUpchargePerItem < 5) {
      return { type: 'moderate', message: 'Good balance of standard and premium items.' };
    } else {
      return { type: 'premium', message: 'Premium selection - higher-end menu items chosen.' };
    }
  };

  const pricingInsight = getPricingInsight();

  if (guestCount === 0 || !selectedTier) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-500" />
            Menu Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Select guest count and package tier to see pricing breakdown
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-500" />
          Menu Balance
          <Badge variant="outline" className="ml-auto">
            {guestCount} guests
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Cost Display */}
        <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
          <div className="text-3xl font-bold text-blue-600">
            ${totalCost.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground">
            ${costPerPerson.toFixed(2)} per person
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Package
          </p>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Cost Breakdown
          </h4>
          
          <div className="space-y-2">
            {/* Base Package */}
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div>
                <span className="font-medium">{selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Package Base</span>
                <p className="text-xs text-muted-foreground">${baseCostPerPerson}/person</p>
              </div>
              <span className="font-semibold">${baseTotalCost.toLocaleString()}</span>
            </div>

            {/* Premium Items */}
            {breakdown.map((category, index) => (
              <div key={index} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-amber-800">{category.category} Premiums</span>
                  <span className="font-semibold text-amber-700">+${category.categoryTotal.toLocaleString()}</span>
                </div>
                <div className="space-y-1">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex justify-between text-xs text-amber-700">
                      <span>{item.name}</span>
                      <span>+${item.perPerson}/person</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selection Progress */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Menu Completion
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Overall Progress</span>
              <span className="text-sm font-medium">{Math.round(overallCompletion)}%</span>
            </div>
            <Progress value={overallCompletion} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {totalItemsSelected} items selected across {Object.keys(selectedItems).length} categories
            </p>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(categoryStats).map(([key, stats]) => {
              const categoryData = menuData?.itemsByCategory[key];
              if (!categoryData) return null;
              
              const isComplete = stats.limit ? stats.selected >= stats.limit : stats.selected > 0;
              const isOverLimit = stats.limit && stats.selected > stats.limit;
              
              return (
                <div key={key} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                  <span className="flex items-center gap-1">
                    {isComplete && !isOverLimit && <CheckCircle className="h-3 w-3 text-green-500" />}
                    {isOverLimit && <AlertCircle className="h-3 w-3 text-amber-500" />}
                    {!isComplete && <Info className="h-3 w-3 text-muted-foreground" />}
                    {categoryData.title}
                  </span>
                  <span className={`font-medium ${isOverLimit ? 'text-amber-600' : isComplete ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {stats.selected}{stats.limit ? `/${stats.limit}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing Insight */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Value Analysis
          </h4>
          <div className={`p-3 rounded-lg border ${
            pricingInsight.type === 'great' ? 'bg-green-50 border-green-200' :
            pricingInsight.type === 'good' ? 'bg-emerald-50 border-emerald-200' :
            pricingInsight.type === 'moderate' ? 'bg-blue-50 border-blue-200' :
            'bg-purple-50 border-purple-200'
          }`}>
            <div className="flex items-center gap-2">
              {pricingInsight.type === 'great' && <TrendingDown className="h-4 w-4 text-green-600" />}
              {pricingInsight.type === 'good' && <CheckCircle className="h-4 w-4 text-emerald-600" />}
              {pricingInsight.type === 'moderate' && <TrendingUp className="h-4 w-4 text-blue-600" />}
              {pricingInsight.type === 'premium' && <DollarSign className="h-4 w-4 text-purple-600" />}
              <span className={`text-sm font-medium ${
                pricingInsight.type === 'great' ? 'text-green-800' :
                pricingInsight.type === 'good' ? 'text-emerald-800' :
                pricingInsight.type === 'moderate' ? 'text-blue-800' :
                'text-purple-800'
              }`}>
                {pricingInsight.message}
              </span>
            </div>
            {upcharges > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Premium additions: ${upcharges.toLocaleString()} total
              </p>
            )}
          </div>
        </div>

        {/* Guest Count Impact */}
        <div className="text-center p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Users className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">Guest Impact</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Each additional guest adds ${costPerPerson.toFixed(2)} to your total
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuBalanceCard;