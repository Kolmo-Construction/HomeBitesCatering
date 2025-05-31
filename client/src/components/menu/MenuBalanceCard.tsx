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
  Info,
  PieChart,
  BarChart3,
  Target,
  Award,
  Sparkles
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
    if (!menuData || !menuData.allItems) return { upcharges: 0, breakdown: [], categoryStats: {} };

    let totalUpcharges = 0;
    const breakdown: Array<{
      category: string;
      items: Array<{ name: string; upcharge: number; perPerson: number; total: number }>;
      categoryTotal: number;
    }> = [];
    
    const categoryStats: Record<string, { selected: number; available: number; limit: number | null }> = {};

    // Create lookup for all items by ID
    const itemsLookup: Record<string, any> = {};
    menuData.allItems.forEach(item => {
      itemsLookup[item.id] = item;
    });

    // Process each category's selected items
    Object.entries(selectedItems).forEach(([categoryKey, itemIds]) => {
      if (!itemIds || itemIds.length === 0) return;
      
      const categoryData = menuData.itemsByCategory?.[categoryKey];
      const categoryItems: Array<{ name: string; upcharge: number; perPerson: number; total: number }> = [];
      let categoryUpcharges = 0;

      itemIds.forEach(itemId => {
        const item = itemsLookup[itemId];
        if (item) {
          const upcharge = item.upcharge || 0;
          const itemTotal = upcharge * guestCount;
          categoryUpcharges += itemTotal;
          
          if (upcharge > 0) {
            categoryItems.push({
              name: item.name,
              upcharge: upcharge,
              perPerson: upcharge,
              total: itemTotal
            });
          }
        }
      });

      totalUpcharges += categoryUpcharges;

      if (categoryItems.length > 0) {
        breakdown.push({
          category: categoryData?.title || categoryKey,
          items: categoryItems,
          categoryTotal: categoryUpcharges
        });
      }

      // Track category selection stats
      categoryStats[categoryKey] = {
        selected: itemIds.length,
        available: categoryData?.items?.length || 0,
        limit: categoryData?.selectionLimit || null
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
      <Card className="w-full bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <Calculator className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Ready to Calculate?</h3>
              <p className="text-sm text-gray-500">
                Select guest count and package tier to see live pricing
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Visual cost breakdown with pie chart-like visualization
  const baseCostPercentage = totalCost > 0 ? (baseTotalCost / totalCost) * 100 : 100;
  const upchargePercentage = totalCost > 0 ? (upcharges / totalCost) * 100 : 0;

  return (
    <div className="w-full space-y-4">
      {/* Main Cost Display Card */}
      <Card className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white border-0 shadow-2xl">
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-blue-200" />
              <Badge variant="outline" className="bg-blue-500/20 text-blue-100 border-blue-300">
                {guestCount} guests
              </Badge>
            </div>
            
            <div className="text-5xl font-bold mb-2">
              ${totalCost.toLocaleString()}
            </div>
            
            <div className="text-blue-100 text-lg">
              ${costPerPerson.toFixed(2)} per person
            </div>
            
            <div className="text-blue-200 text-sm uppercase tracking-wide">
              {selectedTier} Package Experience
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Cost Breakdown */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-blue-600" />
            Cost Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Visual Bar Representation */}
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-full h-6 overflow-hidden">
              <div className="h-full flex">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${baseCostPercentage}%` }}
                >
                  {baseCostPercentage > 20 && `${Math.round(baseCostPercentage)}%`}
                </div>
                {upchargePercentage > 0 && (
                  <div 
                    className="bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${upchargePercentage}%` }}
                  >
                    {upchargePercentage > 10 && `+${Math.round(upchargePercentage)}%`}
                  </div>
                )}
              </div>
            </div>

            {/* Breakdown Details */}
            <div className="grid grid-cols-1 gap-3">
              {/* Base Package */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <div>
                    <div className="font-medium text-blue-900">{selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Base</div>
                    <div className="text-sm text-blue-600">${baseCostPerPerson}/person</div>
                  </div>
                </div>
                <div className="text-xl font-bold text-blue-700">
                  ${baseTotalCost.toLocaleString()}
                </div>
              </div>

              {/* Premium Items */}
              {breakdown.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-amber-500 rounded"></div>
                    <div>
                      <div className="font-medium text-amber-900">{category.category}</div>
                      <div className="text-sm text-amber-600">{category.items.length} premium item{category.items.length > 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-amber-700">
                    +${category.categoryTotal.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Progress Visualization */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Selection Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Overall Progress Ring */}
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - overallCompletion / 100)}`}
                    className="text-green-500 transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-green-600">
                    {Math.round(overallCompletion)}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {totalItemsSelected} items selected
              </p>
            </div>

            {/* Category Progress Bars */}
            <div className="space-y-3">
              {Object.entries(categoryStats).map(([key, stats]) => {
                const categoryData = menuData?.itemsByCategory?.[key];
                if (!categoryData || stats.selected === 0) return null;
                
                const completionPercentage = stats.limit 
                  ? Math.min((stats.selected / stats.limit) * 100, 100)
                  : 100;
                const isOverLimit = stats.limit && stats.selected > stats.limit;
                
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center gap-2">
                        {isOverLimit ? (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        ) : completionPercentage === 100 ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-blue-500" />
                        )}
                        {categoryData.title}
                      </span>
                      <span className={`text-sm font-bold ${
                        isOverLimit ? 'text-amber-600' : 
                        completionPercentage === 100 ? 'text-green-600' : 
                        'text-blue-600'
                      }`}>
                        {stats.selected}{stats.limit ? `/${stats.limit}` : ''}
                      </span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isOverLimit ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                          completionPercentage === 100 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                          'bg-gradient-to-r from-blue-400 to-blue-600'
                        }`}
                        style={{ width: `${Math.min(completionPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Value Insight Card */}
      <Card className={`border-2 ${
        pricingInsight.type === 'great' ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' :
        pricingInsight.type === 'good' ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300' :
        pricingInsight.type === 'moderate' ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300' :
        'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-300'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              pricingInsight.type === 'great' ? 'bg-green-500' :
              pricingInsight.type === 'good' ? 'bg-emerald-500' :
              pricingInsight.type === 'moderate' ? 'bg-blue-500' :
              'bg-purple-500'
            }`}>
              {pricingInsight.type === 'great' && <Award className="h-5 w-5 text-white" />}
              {pricingInsight.type === 'good' && <CheckCircle className="h-5 w-5 text-white" />}
              {pricingInsight.type === 'moderate' && <BarChart3 className="h-5 w-5 text-white" />}
              {pricingInsight.type === 'premium' && <Sparkles className="h-5 w-5 text-white" />}
            </div>
            <div className="flex-1">
              <div className={`font-semibold ${
                pricingInsight.type === 'great' ? 'text-green-800' :
                pricingInsight.type === 'good' ? 'text-emerald-800' :
                pricingInsight.type === 'moderate' ? 'text-blue-800' :
                'text-purple-800'
              }`}>
                {pricingInsight.message}
              </div>
              {upcharges > 0 && (
                <div className="text-sm text-gray-600 mt-1">
                  Premium additions: ${upcharges.toLocaleString()} total
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MenuBalanceCard;