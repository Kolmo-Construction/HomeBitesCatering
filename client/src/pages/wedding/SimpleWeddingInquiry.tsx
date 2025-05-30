import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';

export default function SimpleWeddingInquiry() {
  const [step, setStep] = useState(1);
  const [menuData, setMenuData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({});
  const [currentCost, setCurrentCost] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    eventDate: '',
    guestCount: '',
    venue: ''
  });

  const loadMenuData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await import('@/data/generated');
      console.log('Loaded menu data:', response);
      
      if (!response.menusByTheme) {
        throw new Error('No menu themes found');
      }
      
      setMenuData(response);
      setLoading(false);
    } catch (err) {
      console.error('Menu loading error:', err);
      setError('Failed to load menu data');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 3) {
      loadMenuData();
    }
  }, [step]);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleMenuItem = (category: string, itemId: string) => {
    const newItems = { ...selectedItems };
    if (!newItems[category]) {
      newItems[category] = [];
    }
    
    const index = newItems[category].indexOf(itemId);
    if (index > -1) {
      newItems[category].splice(index, 1);
    } else {
      newItems[category].push(itemId);
    }
    
    setSelectedItems(newItems);
    calculateCost(newItems);
  };

  const calculateCost = (items: Record<string, string[]>) => {
    const guestCount = parseInt(formData.guestCount) || 100;
    const tierPricing = { bronze: 32, silver: 38, gold: 46, platinum: 55 };
    const basePrice = tierPricing[selectedTier as keyof typeof tierPricing] || 0;
    
    let total = basePrice * guestCount;
    
    // Add upcharges
    if (menuData?.menusByTheme?.[selectedTheme]) {
      Object.entries(items).forEach(([category, itemIds]) => {
        itemIds.forEach(itemId => {
          const item = menuData.menusByTheme[selectedTheme].allItems?.find((i: any) => i.id === itemId);
          if (item?.upcharge) {
            total += item.upcharge * guestCount;
          }
        });
      });
    }
    
    setCurrentCost(total);
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Contact Information</h2>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => updateFormData('name', e.target.value)}
          placeholder="Your full name"
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => updateFormData('email', e.target.value)}
          placeholder="your@email.com"
        />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => updateFormData('phone', e.target.value)}
          placeholder="(555) 123-4567"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Event Details</h2>
      <div>
        <Label htmlFor="eventDate">Wedding Date</Label>
        <Input
          id="eventDate"
          type="date"
          value={formData.eventDate}
          onChange={(e) => updateFormData('eventDate', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="guestCount">Number of Guests</Label>
        <Input
          id="guestCount"
          type="number"
          value={formData.guestCount}
          onChange={(e) => updateFormData('guestCount', e.target.value)}
          placeholder="100"
        />
      </div>
      <div>
        <Label htmlFor="venue">Venue</Label>
        <Input
          id="venue"
          value={formData.venue}
          onChange={(e) => updateFormData('venue', e.target.value)}
          placeholder="Venue name"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Menu Selection</h2>
      
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading menu options...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">{error}</p>
          <Button onClick={loadMenuData} variant="outline" className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {menuData && !loading && !error && (
        <>
          {/* Theme Selection */}
          {!selectedTheme && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Choose Cuisine Theme</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(menuData.menusByTheme || {}).map(([key, theme]: [string, any]) => (
                  <Card 
                    key={key}
                    className="cursor-pointer hover:shadow-md"
                    onClick={() => setSelectedTheme(key)}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold">{theme.name}</h4>
                      <p className="text-sm text-gray-600">{theme.description || 'Delicious cuisine options'}</p>
                      <Badge variant="secondary" className="mt-2">
                        {theme.allItems?.length || 0} items
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Tier Selection */}
          {selectedTheme && !selectedTier && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Package Tier</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { id: 'bronze', name: 'Bronze', price: 32 },
                  { id: 'silver', name: 'Silver', price: 38 },
                  { id: 'gold', name: 'Gold', price: 46 },
                  { id: 'platinum', name: 'Platinum', price: 55 }
                ].map((tier) => (
                  <Card 
                    key={tier.id}
                    className="cursor-pointer hover:shadow-md text-center"
                    onClick={() => { setSelectedTier(tier.id); calculateCost(selectedItems); }}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold">{tier.name}</h4>
                      <div className="text-2xl font-bold text-blue-600">
                        ${tier.price}
                        <span className="text-sm text-gray-600">/person</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Menu Items */}
          {selectedTheme && selectedTier && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Customize Your Menu</h3>
              {menuData.menusByTheme[selectedTheme]?.itemsByCategory && 
                Object.entries(menuData.menusByTheme[selectedTheme].itemsByCategory).map(([category, items]: [string, any]) => (
                  <div key={category} className="mb-6">
                    <h4 className="font-medium mb-3 capitalize">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(items || []).map((item: any) => (
                        <Card 
                          key={item.id}
                          className={`cursor-pointer transition-all ${
                            selectedItems[category]?.includes(item.id) 
                              ? 'ring-2 ring-green-500 bg-green-50' 
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => toggleMenuItem(category, item.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-medium text-sm">{item.name}</h5>
                              {item.upcharge > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  +${item.upcharge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                            
                            <div className="flex flex-wrap gap-1">
                              {item.isVegetarian && (
                                <Badge variant="outline" className="text-xs bg-green-50">
                                  Vegetarian
                                </Badge>
                              )}
                              {item.isVegan && (
                                <Badge variant="outline" className="text-xs bg-green-100">
                                  Vegan
                                </Badge>
                              )}
                              {item.isGlutenFree && (
                                <Badge variant="outline" className="text-xs bg-yellow-50">
                                  Gluten-Free
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return <div>Thank you for your inquiry!</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cost Display */}
      {currentCost > 0 && (
        <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border">
          <h4 className="font-semibold">Current Estimate</h4>
          <div className="text-2xl font-bold text-green-600">
            ${currentCost.toLocaleString()}
          </div>
          {formData.guestCount && (
            <div className="text-sm text-gray-600">
              ${(currentCost / parseInt(formData.guestCount)).toFixed(2)} per person
            </div>
          )}
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Wedding Catering Inquiry
            </h1>
            <p className="text-lg text-gray-600">
              Let's create the perfect menu for your special day
            </p>
          </div>

          <div className="mb-8">
            <Progress value={(step / 3) * 100} className="h-2" />
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>Step {step} of 3</span>
              <span>{Math.round((step / 3) * 100)}% Complete</span>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              {renderCurrentStep()}
            </CardContent>
          </Card>

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
            >
              Previous
            </Button>

            <Button
              onClick={() => {
                if (step === 3) {
                  alert('Form submitted! We will contact you within 24 hours.');
                } else {
                  setStep(step + 1);
                }
              }}
            >
              {step === 3 ? 'Submit Inquiry' : 'Next Step'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}