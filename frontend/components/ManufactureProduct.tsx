"use client";

import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Product, ManufacturingRecipe } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Package, Factory, AlertCircle, Upload, Image as ImageIcon, X as XIcon, Loader2, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { ethers } from "ethers";
import { getIPFSUrl, uploadToIPFS, isValidImageFile, isValidFileSize } from '@/lib/ipfs';

interface ManufactureProductProps {
  onSuccess?: () => void;
}

export default function ManufactureProduct({ onSuccess }: ManufactureProductProps) {
  const { account, contract, isConnected } = useWeb3();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  
  // Form state
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [imageHash, setImageHash] = useState("");
  const [quantityToProduce, setQuantityToProduce] = useState(1);
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [recipe, setRecipe] = useState<ManufacturingRecipe[]>([]);
  
  // Image upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  
  // AI Price Suggestion state
  const [isLoadingPriceSuggestion, setIsLoadingPriceSuggestion] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState<string>("");
  const [showPriceSuggestion, setShowPriceSuggestion] = useState(false);

  // Load user's products when dialog opens
  useEffect(() => {
    if (isOpen && account && contract) {
      loadUserProducts();
    }
  }, [isOpen, account, contract]);

  const loadUserProducts = async () => {
    if (!contract || !account) return;
    
    try {
      setIsLoading(true);
      const productIds = await contract.getProductsByOwner(account);
      const products = await Promise.all(
        productIds.map(async (id: bigint) => {
          const product = await contract.getProduct(id);
          return {
            id: Number(id),
            name: product.name,
            description: product.description,
            imageHash: product.imageHash,
            quantity: Number(product.quantity),
            pricePerUnit: Number(ethers.formatEther(product.pricePerUnit.toString())),
            currentOwner: product.currentOwner,
            createdTime: Number(product.createdTime),
            exists: product.exists,
            isManufactured: product.isManufactured,
            originalCreator: product.originalCreator,
            ownershipHistory: product.ownershipHistory,
            components: product.components?.map((comp: any) => ({
              productId: Number(comp.productId),
              quantityUsed: Number(comp.quantityUsed),
              supplier: comp.supplier,
              timestamp: Number(comp.timestamp)
            })) || []
          };
        })
      );
      setUserProducts(products.filter(p => p.quantity > 0));
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load your products");
    } finally {
      setIsLoading(false);
    }
  };

  const addIngredient = () => {
    setRecipe([...recipe, { 
      ingredientId: 0, 
      quantityNeeded: 1, 
      productName: "", 
      availableQuantity: 0 
    }]);
  };

  const removeIngredient = (index: number) => {
    setRecipe(recipe.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof ManufacturingRecipe, value: any) => {
    const updatedRecipe = recipe.map((item, i) => {
      if (i === index) {
        const updated = { ...item, [field]: value };
        
        // Auto-fill product details when ingredient is selected
        if (field === 'ingredientId') {
          const selectedProduct = userProducts.find(p => p.id === value);
          if (selectedProduct) {
            updated.productName = selectedProduct.name;
            updated.availableQuantity = selectedProduct.quantity;
          }
        }
        
        return updated;
      }
      return item;
    });
    setRecipe(updatedRecipe);
  };

  const calculateTotalCost = () => {
    return recipe.reduce((total, item) => {
      const product = userProducts.find(p => p.id === item.ingredientId);
      if (product) {
        const priceInEth = typeof product.pricePerUnit === 'number' ? product.pricePerUnit : Number(ethers.formatEther(product.pricePerUnit.toString()));
        return total + (priceInEth * item.quantityNeeded * quantityToProduce);
      }
      return total;
    }, 0);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, WebP)');
      return;
    }

    if (!isValidFileSize(file, 10)) {
      toast.error('File size too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setImageHash("");
  };

  const handlePriceSuggestion = async () => {
    if (!productName.trim() || recipe.length === 0) {
      toast.error("Please enter product name and add ingredients first");
      return;
    }

    try {
      setIsLoadingPriceSuggestion(true);
      setShowPriceSuggestion(false);
      
      // Prepare comprehensive product data for AI analysis
      const rawMaterials = recipe.map(item => {
        const product = userProducts.find(p => p.id === item.ingredientId);
        const unitPrice = product ? (typeof product.pricePerUnit === 'number' ? product.pricePerUnit : Number(ethers.formatEther(product.pricePerUnit.toString()))) : 0;
        const totalCostForThisMaterial = unitPrice * item.quantityNeeded * quantityToProduce;
        
        return {
          id: item.ingredientId,
          name: item.productName || product?.name || 'Unknown Material',
          description: product?.description || '',
          quantityNeeded: item.quantityNeeded,
          quantityPerUnit: item.quantityNeeded, // per unit of final product
          totalQuantityNeeded: item.quantityNeeded * quantityToProduce,
          unitPrice: unitPrice,
          totalCost: totalCostForThisMaterial,
          availableQuantity: item.availableQuantity,
          isManufactured: product?.isManufactured || false,
          createdTime: product?.createdTime || 0
        };
      });

      const totalManufacturingCost = calculateTotalCost();
      const costPerUnit = totalManufacturingCost / quantityToProduce;

      const productData = {
        product_name: productName,
        description: description,
        quantity_to_produce: quantityToProduce,
        raw_materials: rawMaterials.map(m => ({
          id: m.id,
          name: m.name,
          description: m.description,
          quantity_needed: m.quantityNeeded,
          unit_price: m.unitPrice,
          total_cost: m.totalCost
        })),
        total_manufacturing_cost: totalManufacturingCost,
        cost_per_unit: costPerUnit
      };


      console.log('Sending to AI Price Prediction:', productData);

      const response = await fetch('https://479e197b80f0.ngrok-free.app/predict-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Format the AI response nicely
      const formattedSuggestion = `💰 Price Range: ${result.price_min.toLocaleString()} - ${result.price_max.toLocaleString()} ${result.currency}
      
📊 ${result.summary}`;
      
      setPriceSuggestion(formattedSuggestion);
      setShowPriceSuggestion(true);
      
    } catch (error: any) {
      console.error('Error getting price suggestion:', error);
      toast.error('Failed to get AI price suggestion. Make sure the AI service is running on port 8080.');
    } finally {
      setIsLoadingPriceSuggestion(false);
    }
  };

  const validateRecipe = () => {
    if (!productName.trim()) return "Product name is required";
    if (!description.trim()) return "Description is required";
    if (quantityToProduce <= 0) return "Quantity must be greater than 0";
    if (!pricePerUnit || parseFloat(pricePerUnit) <= 0) return "Valid price is required";
    if (recipe.length === 0) return "At least one ingredient is required";
    
    for (const item of recipe) {
      if (item.ingredientId === 0) return "Please select all ingredients";
      if (item.quantityNeeded <= 0) return "All ingredient quantities must be greater than 0";
      
      const totalNeeded = item.quantityNeeded * quantityToProduce;
      if (totalNeeded > item.availableQuantity) {
        return `Insufficient ${item.productName}. Need ${totalNeeded}, have ${item.availableQuantity}`;
      }
    }
    
    return null;
  };

  const handleManufacture = async () => {
    if (!contract) {
      toast.error("Contract not connected");
      return;
    }
    
    const validationError = validateRecipe();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setIsLoading(true);
      let finalImageHash = imageHash;

      // Upload image to IPFS if a file is selected
      if (selectedFile) {
        setUploadProgress('Uploading image to IPFS...');
        finalImageHash = await uploadToIPFS(selectedFile);
        setUploadProgress('Image uploaded successfully!');
      }
      
      setUploadProgress('Creating manufactured product on blockchain...');
      const ingredientIds = recipe.map(item => item.ingredientId);
      const quantitiesNeeded = recipe.map(item => item.quantityNeeded);
      const priceInWei = ethers.parseEther(pricePerUnit);

      const tx = await contract.manufactureProduct(
        productName,
        description,
        finalImageHash || "default-hash",
        quantityToProduce,
        ingredientIds,
        quantitiesNeeded,
        priceInWei
      );

      toast.success("Manufacturing transaction submitted...");
      await tx.wait();
      
      toast.success(`Successfully manufactured ${quantityToProduce} ${productName}!`);
      
      // Reset form
      setProductName("");
      setDescription("");
      setImageHash("");
      setQuantityToProduce(1);
      setPricePerUnit("");
      setRecipe([]);
      setSelectedFile(null);
      setImagePreview(null);
      setUploadProgress("");
      setPriceSuggestion("");
      setShowPriceSuggestion(false);
      setIsOpen(false);
      
      if (onSuccess) onSuccess();
      
    } catch (error: any) {
      console.error("Manufacturing error:", error);
      toast.error(error.message || "Failed to manufacture product");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Button disabled>
        <AlertCircle className="h-4 w-4 mr-2" />
        Connect Wallet to Manufacture
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
          <Factory className="h-4 w-4 mr-2" />
          Manufacture Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Manufacture New Product
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        {isLoading && (
          <div className="bg-purple-50 border-t border-purple-200 p-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-purple-600 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-900">Manufacturing Product...</p>
                <p className="text-xs text-purple-700 mt-1">{uploadProgress}</p>
                <div className="w-full bg-purple-200 rounded-full h-1.5 mt-2">
                  <div className="bg-purple-600 h-1.5 rounded-full transition-all duration-300 animate-pulse" style={{width: '60%'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Product Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <ImageIcon className="w-5 h-5 mr-2 text-blue-600" />
                  Product Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                {imagePreview ? (
                  <div className="space-y-4">
                    <div className="relative inline-block w-full">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-xl shadow-md"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        disabled={isLoading}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 text-center">{selectedFile?.name}</p>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">No image selected</p>
                      <label className={`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        Choose Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isLoading}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <Label htmlFor="imageHash">Or enter Image Hash/URL</Label>
                  <Input
                    id="imageHash"
                    value={imageHash}
                    onChange={(e) => setImageHash(e.target.value)}
                    placeholder="IPFS hash or URL"
                    disabled={!!selectedFile}
                  />
                  {selectedFile && (
                    <p className="text-xs text-gray-500 mt-1">Remove uploaded image to use hash/URL</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right Side - Product Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Factory className="w-5 h-5 mr-2 text-purple-600" />
                  Product Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="productName">Product Name</Label>
                    <Input
                      id="productName"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantityToProduce">Quantity to Produce</Label>
                    <Input
                      id="quantityToProduce"
                      type="number"
                      min="1"
                      value={quantityToProduce}
                      onChange={(e) => setQuantityToProduce(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your manufactured product"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="pricePerUnit">Price per Unit (ETH)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="pricePerUnit"
                      type="number"
                      step="0.001"
                      value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(e.target.value)}
                      placeholder="0.1"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handlePriceSuggestion}
                      disabled={isLoadingPriceSuggestion || !productName.trim() || recipe.length === 0}
                      variant="outline"
                      size="sm"
                      className="shrink-0 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white border-0"
                    >
                      {isLoadingPriceSuggestion ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* AI Price Suggestion Display */}
                  {showPriceSuggestion && priceSuggestion && (
                    <div className="mt-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-2 rounded-lg">
                          <Zap className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-yellow-800 mb-1">AI Price Suggestion</h4>
                          <p className="text-sm text-yellow-700 leading-relaxed">{priceSuggestion}</p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => setShowPriceSuggestion(false)}
                          variant="ghost"
                          size="sm"
                          className="text-yellow-600 hover:text-yellow-800"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recipe/Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Manufacturing Recipe</span>
                <Button onClick={addIngredient} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ingredient
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recipe.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No ingredients added yet</p>
                  <p className="text-sm">Click "Add Ingredient" to start building your recipe</p>
                </div>
              ) : (
                recipe.map((item, index) => (
                  <Card key={index} className="border border-muted">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-4">
                          <Label>Ingredient Product</Label>
                          <select
                            className="w-full p-2 border rounded-md"
                            value={item.ingredientId}
                            onChange={(e) => updateIngredient(index, 'ingredientId', parseInt(e.target.value))}
                          >
                            <option value={0}>Select a product...</option>
                            {userProducts.map(product => (
                              <option key={product.id} value={product.id}>
                                {product.name} (Available: {product.quantity})
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="col-span-2">
                          <Label>Qty Needed</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantityNeeded}
                            onChange={(e) => updateIngredient(index, 'quantityNeeded', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        
                        <div className="col-span-2">
                          <Label>Total Needed</Label>
                          <div className="p-2 bg-muted rounded-md text-center">
                            {item.quantityNeeded * quantityToProduce}
                          </div>
                        </div>
                        
                        <div className="col-span-2">
                          <Label>Available</Label>
                          <div className="p-2 bg-muted rounded-md text-center">
                            <Badge variant={item.quantityNeeded * quantityToProduce <= item.availableQuantity ? "default" : "destructive"}>
                              {item.availableQuantity}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="col-span-2">
                          <Button
                            onClick={() => removeIngredient(index)}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Cost Summary */}
          {recipe.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cost Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recipe.map((item, index) => {
                    const product = userProducts.find(p => p.id === item.ingredientId);
                    const cost = product ? (typeof product.pricePerUnit === 'number' ? product.pricePerUnit : Number(ethers.formatEther(product.pricePerUnit.toString()))) * item.quantityNeeded * quantityToProduce : 0;
                    return (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.productName || 'Unknown Product'} ({item.quantityNeeded * quantityToProduce} units)</span>
                        <span>{cost.toFixed(4)} ETH</span>
                      </div>
                    );
                  })}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total Manufacturing Cost</span>
                    <span>{calculateTotalCost().toFixed(4)} ETH</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Revenue ({quantityToProduce} × {pricePerUnit || 0} ETH)</span>
                    <span>{((parseFloat(pricePerUnit) || 0) * quantityToProduce).toFixed(4)} ETH</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-600">
                    <span>Estimated Profit</span>
                    <span>{(((parseFloat(pricePerUnit) || 0) * quantityToProduce) - calculateTotalCost()).toFixed(4)} ETH</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleManufacture}
              disabled={isLoading || recipe.length === 0}
              className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              {isLoading ? "Manufacturing..." : `Manufacture ${quantityToProduce} ${productName || 'Product'}`}
            </Button>
            <Button
              onClick={() => {
                setProductName("");
                setDescription("");
                setImageHash("");
                setQuantityToProduce(1);
                setPricePerUnit("");
                setRecipe([]);
                setSelectedFile(null);
                setImagePreview(null);
                setUploadProgress("");
                setPriceSuggestion("");
                setShowPriceSuggestion(false);
                setIsOpen(false);
              }}
              variant="outline"
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}