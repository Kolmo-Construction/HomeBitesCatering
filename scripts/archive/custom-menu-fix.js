// This file contains the fixed code for the custom menu component

// 1. State management section: Replace old multi-level selection with direct category selection
const [selectedActualCategory, setSelectedActualCategory] = useState<string | null>(null);

const handleActualCategorySelect = (categoryKey: string) => {
  setSelectedActualCategory(categoryKey);
};

// 2. UI rendering section: Replace old 3-level rendering with 2-level rendering
// Get the theme data for custom_menu
const customMenuData = themeMenuData.custom_menu;

// Rendering section
{!selectedActualCategory ? (
  // STAGE 1: Display all available categories from custom_menu.categories
  <div>
    <h3 className="text-xl font-semibold mb-4">Select a Category</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {Object.keys(customMenuData.categories).map((categoryKey) => {
        const categoryDetails = customMenuData.categories[categoryKey];
        if (!categoryDetails) return null; // Should not happen if data is well-formed
        return (
          <div
            key={categoryKey}
            className="border rounded-md p-4 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-primary/5"
            onClick={() => handleActualCategorySelect(categoryKey)}
          >
            <h4 className="text-lg font-medium mb-2">{categoryDetails.title}</h4>
            <p className="text-sm text-gray-600">{categoryDetails.description}</p>
          </div>
        );
      })}
    </div>
  </div>
) : (
  // STAGE 2: Display items for the selectedActualCategory
  <div>
    <div className="flex items-center mb-6">
      <button
        className="text-primary hover:underline flex items-center mr-2"
        onClick={() => setSelectedActualCategory(null)} // Go back to category list
      >
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Categories
      </button>
      <span className="text-gray-500">→</span>
      <span className="ml-2 font-medium">
        {customMenuData.categories[selectedActualCategory]?.title}
      </span>
    </div>

    <h3 className="text-xl font-semibold mb-4">
      {customMenuData.categories[selectedActualCategory]?.title}
    </h3>
    <p className="text-sm text-gray-600 mb-4">
      {customMenuData.categories[selectedActualCategory]?.description}
    </p>

    <div className="grid grid-cols-1 gap-3 mt-4">
      {customMenuData.categories[selectedActualCategory]?.items?.map((item) => {
        if (!item) return null;
        const isSelected = isCustomItemSelected(selectedActualCategory, item.id);
        return (
          <div
            key={item.id}
            className={`border rounded-md p-3 cursor-pointer ${
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-primary/30'
            }`}
            onClick={() => handleCustomItemSelection(selectedActualCategory, item.id, !isSelected)}
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">{item.name}</span>
                {item.upcharge && item.upcharge > 0 && (
                  <span className="text-amber-600 text-sm ml-2">
                    (+${item.upcharge.toFixed(2)} upcharge per person)
                  </span>
                )}
              </div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isSelected ? 'bg-primary text-white' : 'border border-gray-300'
              }`}>
                {isSelected && <Check className="h-4 w-4" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
    
    <div className="flex justify-between items-center mt-8 p-4 bg-gray-50 rounded-md">
      <span className="text-sm">
        Selected items: {
          Object.keys(menuSelections || {})
            .filter(key => selectedActualCategory && key === selectedActualCategory)
            .reduce((total, key) => {
              const selections = menuSelections[key];
              return total + (Array.isArray(selections) ? selections.length : 0);
            }, 0)
        }
      </span>
      <Button 
        type="button"
        variant="outline"
        onClick={() => setSelectedActualCategory(null)}
      >
        Choose Another Category
      </Button>
    </div>
  </div>
)}