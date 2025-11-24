import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, DollarSign, Search, TrendingUp, TrendingDown, Upload, FileSpreadsheet } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type BaseIngredient, insertBaseIngredientSchema } from "@shared/schema";
import { formatCurrency } from "@shared/unitConversion";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const formSchema = insertBaseIngredientSchema.extend({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  purchaseUnit: z.string().min(1, "Purchase unit is required"),
});

type FormValues = z.infer<typeof formSchema>;

const INGREDIENT_CATEGORIES = [
  { value: "meat", label: "Meat & Poultry" },
  { value: "seafood", label: "Seafood" },
  { value: "produce", label: "Produce" },
  { value: "dairy", label: "Dairy & Eggs" },
  { value: "dry_goods", label: "Dry Goods & Grains" },
  { value: "spices", label: "Spices & Seasonings" },
  { value: "beverages", label: "Beverages" },
  { value: "oils", label: "Oils & Fats" },
  { value: "other", label: "Other" },
];

const COMMON_UNITS = [
  { value: "pound", label: "Pound (lb)" },
  { value: "ounce", label: "Ounce (oz)" },
  { value: "kilogram", label: "Kilogram (kg)" },
  { value: "gram", label: "Gram (g)" },
  { value: "gallon", label: "Gallon (gal)" },
  { value: "quart", label: "Quart (qt)" },
  { value: "liter", label: "Liter (L)" },
  { value: "cup", label: "Cup" },
  { value: "each", label: "Each" },
  { value: "dozen", label: "Dozen" },
  { value: "case", label: "Case" },
];

// Mapping for Excel import - normalize various input formats to canonical values
const CATEGORY_MAPPING: Record<string, string> = {
  "meat": "meat",
  "meat & poultry": "meat",
  "meat and poultry": "meat",
  "poultry": "meat",
  "seafood": "seafood",
  "fish": "seafood",
  "produce": "produce",
  "vegetables": "produce",
  "fruits": "produce",
  "fruit": "produce",
  "vegetable": "produce",
  "dairy": "dairy",
  "dairy & eggs": "dairy",
  "dairy and eggs": "dairy",
  "eggs": "dairy",
  "dry goods": "dry_goods",
  "dry_goods": "dry_goods",
  "dry goods & grains": "dry_goods",
  "grains": "dry_goods",
  "spices": "spices",
  "spices & seasonings": "spices",
  "spices and seasonings": "spices",
  "seasonings": "spices",
  "beverages": "beverages",
  "drinks": "beverages",
  "oils": "oils",
  "oils & fats": "oils",
  "oils and fats": "oils",
  "fats": "oils",
  "other": "other",
};

const UNIT_MAPPING: Record<string, string> = {
  "pound": "pound",
  "lb": "pound",
  "lbs": "pound",
  "pound (lb)": "pound",
  "pounds": "pound",
  "ounce": "ounce",
  "oz": "ounce",
  "ounce (oz)": "ounce",
  "ounces": "ounce",
  "kilogram": "kilogram",
  "kg": "kilogram",
  "kilogram (kg)": "kilogram",
  "kilograms": "kilogram",
  "gram": "gram",
  "g": "gram",
  "gram (g)": "gram",
  "grams": "gram",
  "gallon": "gallon",
  "gal": "gallon",
  "gallon (gal)": "gallon",
  "gallons": "gallon",
  "quart": "quart",
  "qt": "quart",
  "quart (qt)": "quart",
  "quarts": "quart",
  "liter": "liter",
  "l": "liter",
  "liter (l)": "liter",
  "liters": "liter",
  "cup": "cup",
  "cups": "cup",
  "each": "each",
  "ea": "each",
  "dozen": "dozen",
  "doz": "dozen",
  "case": "case",
  "cases": "case",
};

export default function BaseIngredientsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<BaseIngredient | null>(null);
  const [deletingIngredient, setDeletingIngredient] = useState<BaseIngredient | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  // Fetch ingredients
  const { data: ingredients = [], isLoading } = useQuery<BaseIngredient[]>({
    queryKey: ["/api/ingredients/base-ingredients", { category: categoryFilter, search: searchQuery }],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/ingredients/base-ingredients", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients/base-ingredients"] });
      toast({ title: "Success", description: "Ingredient created successfully" });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ingredient",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormValues }) => {
      const res = await apiRequest("PUT", `/api/ingredients/base-ingredients/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients/base-ingredients"] });
      toast({ title: "Success", description: "Ingredient updated successfully" });
      setEditingIngredient(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ingredient",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/ingredients/base-ingredients/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients/base-ingredients"] });
      toast({ title: "Success", description: "Ingredient deleted successfully" });
      setDeletingIngredient(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete ingredient",
        variant: "destructive",
      });
    },
  });

  // Batch import mutation
  const batchImportMutation = useMutation({
    mutationFn: async (ingredients: any[]) => {
      const res = await apiRequest("POST", "/api/ingredients/base-ingredients/batch-import", { ingredients });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients/base-ingredients"] });
      const message = data.failed > 0 
        ? `Imported ${data.imported} ingredients. ${data.failed} failed validation.`
        : `Successfully imported ${data.imported} ingredients`;
      toast({ 
        title: "Import Complete", 
        description: message,
        variant: data.failed > 0 ? "default" : "default"
      });
      setIsImportDialogOpen(false);
      setImportFile(null);
      setImportPreview([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import ingredients",
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: undefined,
      purchasePrice: 0,
      purchaseUnit: undefined,
      purchaseQuantity: 1,
      supplier: "",
      notes: "",
    },
  });

  // Handle edit
  const handleEdit = (ingredient: BaseIngredient) => {
    setEditingIngredient(ingredient);
    form.reset({
      name: ingredient.name,
      category: ingredient.category,
      purchasePrice: parseFloat(ingredient.purchasePrice),
      purchaseUnit: ingredient.purchaseUnit,
      purchaseQuantity: parseFloat(ingredient.purchaseQuantity),
      supplier: ingredient.supplier || "",
      notes: ingredient.notes || "",
    });
  };

  // Handle form submit
  const onSubmit = (data: FormValues) => {
    if (editingIngredient) {
      updateMutation.mutate({ id: editingIngredient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      parseExcelFile(file);
    }
  };

  // Parse Excel file
  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Helper function to normalize category
        const normalizeCategory = (category: string): string | undefined => {
          if (!category || !category.trim()) return undefined;
          const normalized = category.toLowerCase().trim();
          return CATEGORY_MAPPING[normalized] || undefined;
        };
        
        // Helper function to normalize unit
        const normalizeUnit = (unit: string): string | undefined => {
          if (!unit || !unit.trim()) return undefined;
          const normalized = unit.toLowerCase().trim();
          return UNIT_MAPPING[normalized] || undefined;
        };
        
        // Helper function to sanitize numeric values (remove currency symbols, commas)
        const sanitizeNumber = (value: any): number | undefined => {
          if (typeof value === 'number' && value > 0) return value;
          if (typeof value !== 'string' || !value.trim()) return undefined;
          // Remove currency symbols, commas, and whitespace, keep only digits, decimal, and minus
          const cleaned = value.replace(/[$,\s€£¥]/g, '').trim();
          const parsed = parseFloat(cleaned);
          return (isNaN(parsed) || parsed <= 0) ? undefined : parsed;
        };
        
        // Map Excel columns to ingredient fields
        const mappedData = jsonData.map((row: any) => ({
          name: row.Name || row.name || "",
          category: normalizeCategory(row.Category || row.category || ""),
          purchasePrice: sanitizeNumber(row['Purchase Price'] || row.purchasePrice || row.price),
          purchaseUnit: normalizeUnit(row['Purchase Unit'] || row.purchaseUnit || row.unit || ""),
          purchaseQuantity: sanitizeNumber(row['Purchase Quantity'] || row.purchaseQuantity || row.quantity),
          supplier: row.Supplier || row.supplier || "",
          notes: row.Notes || row.notes || "",
        }));
        
        setImportPreview(mappedData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to parse Excel file. Please check the file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  // Validate imported data
  const validateImportRow = (row: any): boolean => {
    return (
      !!row.name &&
      !!row.name.trim() &&
      !!row.category &&
      typeof row.purchasePrice === 'number' &&
      row.purchasePrice > 0 &&
      !!row.purchaseUnit &&
      typeof row.purchaseQuantity === 'number' &&
      row.purchaseQuantity > 0
    );
  };

  // Handle import submission
  const handleImport = () => {
    if (importPreview.length === 0) return;
    
    // Filter valid rows
    const validRows = importPreview.filter(validateImportRow);
    const invalidCount = importPreview.length - validRows.length;
    
    if (validRows.length === 0) {
      toast({
        title: "No Valid Rows",
        description: "All rows failed validation. Please check that all required fields (Name, Category, Price > 0, Unit, Quantity > 0) are filled.",
        variant: "destructive",
      });
      return;
    }
    
    if (invalidCount > 0) {
      toast({
        title: "Warning",
        description: `${invalidCount} invalid row(s) will be skipped. Importing ${validRows.length} valid ingredient(s).`,
      });
    }
    
    batchImportMutation.mutate(validRows);
  };

  // Calculate total price change
  const calculatePriceChange = (ingredient: BaseIngredient): number | null => {
    if (!ingredient.previousPurchasePrice) return null;
    const currentPrice = parseFloat(ingredient.purchasePrice);
    const previousPrice = parseFloat(ingredient.previousPurchasePrice);
    if (previousPrice === 0) return null;
    return currentPrice - previousPrice;
  };

  const calculatePercentageChange = (ingredient: BaseIngredient): number | null => {
    if (!ingredient.previousPurchasePrice) return null;
    const currentPrice = parseFloat(ingredient.purchasePrice);
    const previousPrice = parseFloat(ingredient.previousPurchasePrice);
    if (previousPrice === 0) return null;
    return ((currentPrice - previousPrice) / previousPrice) * 100;
  };

  const totalPriceChange = ingredients.reduce((sum, ingredient) => {
    const change = calculatePriceChange(ingredient);
    return change !== null ? sum + change : sum;
  }, 0);

  // Filter ingredients
  const filteredIngredients = ingredients.filter((ingredient) => {
    const matchesSearch = ingredient.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || ingredient.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl" data-testid="page-base-ingredients">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Base Ingredients</h1>
            <p className="text-muted-foreground mt-1">
              Manage your ingredient inventory and purchase prices
            </p>
          </div>
          <div className="flex gap-2 items-center relative">
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(true)}
                data-testid="button-import-ingredients"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import from Excel
              </Button>
              {/* Animated attention grabber */}
              <div className="absolute -right-48 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                <div className="text-red-600 font-bold text-lg animate-pulse">
                  ← Mike USE ME !!!!
                </div>
              </div>
            </div>
            <Button
              onClick={() => {
                form.reset({
                  name: "",
                  category: undefined,
                  purchasePrice: 0,
                  purchaseUnit: undefined,
                  purchaseQuantity: 1,
                  supplier: "",
                  notes: "",
                });
                setIsAddDialogOpen(true);
              }}
              data-testid="button-add-ingredient"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Ingredient
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Ingredients</CardDescription>
              <CardTitle className="text-3xl" data-testid="text-total-ingredients">
                {ingredients.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Categories</CardDescription>
              <CardTitle className="text-3xl" data-testid="text-total-categories">
                {new Set(ingredients.map((i) => i.category)).size}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Price Change</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2" data-testid="text-price-change">
                {totalPriceChange === 0 ? (
                  <span className="text-muted-foreground">$0.00</span>
                ) : totalPriceChange > 0 ? (
                  <>
                    <TrendingUp className="h-6 w-6 text-red-500" />
                    <span className="text-red-500">+{formatCurrency(totalPriceChange)}</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-6 w-6 text-green-500" />
                    <span className="text-green-500">{formatCurrency(totalPriceChange)}</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {INGREDIENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Ingredients Table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center py-12" data-testid="text-loading">Loading...</div>
            ) : filteredIngredients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-no-ingredients">
                No ingredients found. Add your first ingredient to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Purchase Price</TableHead>
                      <TableHead>Price Change</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIngredients.map((ingredient) => {
                      const priceChange = calculatePriceChange(ingredient);
                      const percentageChange = calculatePercentageChange(ingredient);
                      
                      return (
                        <TableRow key={ingredient.id} data-testid={`row-ingredient-${ingredient.id}`}>
                          <TableCell className="font-medium">{ingredient.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {INGREDIENT_CATEGORIES.find((c) => c.value === ingredient.category)?.label ||
                                ingredient.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(
                              parseFloat(ingredient.purchasePrice) / parseFloat(ingredient.purchaseQuantity)
                            )}
                          </TableCell>
                          <TableCell>
                            {priceChange === null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : priceChange === 0 ? (
                              <span className="text-muted-foreground">No change</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                {priceChange > 0 ? (
                                  <>
                                    <TrendingUp className="h-4 w-4 text-red-500" />
                                    <span className="text-red-500 font-medium">
                                      +{formatCurrency(priceChange)}
                                    </span>
                                    <span className="text-xs text-red-500">
                                      ({percentageChange! > 0 ? '+' : ''}{percentageChange!.toFixed(1)}%)
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <TrendingDown className="h-4 w-4 text-green-500" />
                                    <span className="text-green-500 font-medium">
                                      {formatCurrency(priceChange)}
                                    </span>
                                    <span className="text-xs text-green-500">
                                      ({percentageChange!.toFixed(1)}%)
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {ingredient.purchaseQuantity} {ingredient.purchaseUnit}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {ingredient.supplier || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(ingredient)}
                                data-testid={`button-edit-${ingredient.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingIngredient(ingredient)}
                                data-testid={`button-delete-${ingredient.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddDialogOpen || editingIngredient !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingIngredient(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingIngredient ? "Edit Ingredient" : "Add New Ingredient"}
            </DialogTitle>
            <DialogDescription>
              Enter the purchase information for this ingredient
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ingredient Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Beef Tenderloin" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INGREDIENT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Price *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-10"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            data-testid="input-price"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchaseQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="1"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                          data-testid="input-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="purchaseUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Unit *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-unit">
                          <SelectValue placeholder="Select a unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMMON_UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Restaurant Depot" 
                        {...field} 
                        value={field.value || ""}
                        data-testid="input-supplier" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Storage notes, quality specs, etc."
                        {...field}
                        value={field.value || ""}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingIngredient(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingIngredient
                    ? "Update Ingredient"
                    : "Create Ingredient"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingIngredient !== null}
        onOpenChange={(open) => !open && setDeletingIngredient(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ingredient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingIngredient?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingIngredient && deleteMutation.mutate(deletingIngredient.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Ingredients from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel file (.xlsx, .xls) with ingredient data. Expected columns: Name, Category, Purchase Price, Purchase Unit, Purchase Quantity, Supplier, Notes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Excel File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="mt-2"
                data-testid="input-file-upload"
              />
            </div>

            {importPreview.length > 0 && (
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Preview ({importPreview.length} ingredients)</h3>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-green-50">
                      {importPreview.filter(validateImportRow).length} valid
                    </Badge>
                    {importPreview.filter(row => !validateImportRow(row)).length > 0 && (
                      <Badge variant="destructive">
                        {importPreview.filter(row => !validateImportRow(row)).length} invalid
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Supplier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.slice(0, 10).map((item, idx) => {
                        const isValid = validateImportRow(item);
                        return (
                          <TableRow key={idx} className={!isValid ? "bg-red-50" : ""}>
                            <TableCell>
                              {isValid ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">✓</Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">✗</Badge>
                              )}
                            </TableCell>
                            <TableCell className={!item.name?.trim() ? "text-red-500" : ""}>{item.name || "(missing)"}</TableCell>
                            <TableCell className={!item.category ? "text-red-500" : ""}>{item.category || "(missing)"}</TableCell>
                            <TableCell className={typeof item.purchasePrice !== 'number' || item.purchasePrice <= 0 ? "text-red-500" : ""}>
                              {typeof item.purchasePrice === 'number' && item.purchasePrice > 0 ? `$${item.purchasePrice.toFixed(2)}` : "(missing)"}
                            </TableCell>
                            <TableCell className={!item.purchaseUnit ? "text-red-500" : ""}>{item.purchaseUnit || "(missing)"}</TableCell>
                            <TableCell className={typeof item.purchaseQuantity !== 'number' || item.purchaseQuantity <= 0 ? "text-red-500" : ""}>
                              {typeof item.purchaseQuantity === 'number' && item.purchaseQuantity > 0 ? item.purchaseQuantity : "(missing)"}
                            </TableCell>
                            <TableCell>{item.supplier || "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {importPreview.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Showing first 10 of {importPreview.length} ingredients
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportFile(null);
                setImportPreview([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importPreview.length === 0 || batchImportMutation.isPending}
              data-testid="button-confirm-import"
            >
              {batchImportMutation.isPending ? "Importing..." : `Import ${importPreview.length} Ingredients`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
