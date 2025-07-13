"use client";

import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Product, ComponentSource } from "@/lib/contract";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TreePine, Package, Factory, User, Clock, ChevronDown, ChevronRight, History } from "lucide-react";
import toast from "react-hot-toast";
import { ethers } from "ethers";

interface ProductTreeViewerProps {
  productId: number;
  productName: string;
  trigger?: React.ReactNode;
}

interface TreeNode {
  product: Product;
  components: ComponentSource[];
  children: TreeNode[];
  depth: number;
}

export default function ProductTreeViewer({ productId, productName, trigger }: ProductTreeViewerProps) {
  const { contract } = useWeb3();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [rawMaterials, setRawMaterials] = useState<Product[]>([]);

  useEffect(() => {
    if (isOpen && contract) {
      loadProductTree();
      loadRawMaterials();
    }
  }, [isOpen, contract, productId]);

  const loadProductTree = async () => {
    try {
      setIsLoading(true);
      const tree = await buildTree(productId, 0);
      setTreeData(tree);
      
      // Auto-expand first level
      if (tree && tree.components.length > 0) {
        const newExpanded = new Set<number>();
        newExpanded.add(productId);
        tree.components.forEach(comp => newExpanded.add(comp.productId));
        setExpandedNodes(newExpanded);
      }
    } catch (error) {
      console.error("Error loading product tree:", error);
      toast.error("Failed to load product tree");
    } finally {
      setIsLoading(false);
    }
  };

  const loadRawMaterials = async () => {
    if (!contract) return;
    
    try {
      const rawMaterialIds = await contract.getRawMaterialSources(productId);
      const materials = await Promise.all(
        rawMaterialIds.map(async (id: bigint) => {
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
      setRawMaterials(materials);
    } catch (error) {
      console.error("Error loading raw materials:", error);
    }
  };

  const buildTree = async (pid: number, depth: number): Promise<TreeNode> => {
    if (!contract) throw new Error("Contract not available");
    
    const product = await contract.getProduct(pid);
    const productData: Product = {
      id: pid,
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

    let components: ComponentSource[] = [];
    let children: TreeNode[] = [];

    if (product.isManufactured) {
      const componentData = await contract.getProductTree(pid);
      components = componentData.map((comp: any) => ({
        productId: Number(comp.productId),
        quantityUsed: Number(comp.quantityUsed),
        supplier: comp.supplier,
        timestamp: Number(comp.timestamp),
      }));

      // Recursively build children
      children = await Promise.all(
        components.map(comp => buildTree(comp.productId, depth + 1))
      );
    }

    return {
      product: productData,
      components,
      children,
      depth
    };
  };

  const toggleNode = (nodeId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderTreeNode = (node: TreeNode) => {
    const isExpanded = expandedNodes.has(node.product.id);
    const hasChildren = node.children.length > 0;
    const indent = node.depth * 20;

    return (
      <div key={node.product.id} className="select-none">
        {/* Main Product Line */}
        <div className="flex items-start gap-2 py-1" style={{ marginLeft: `${indent}px` }}>
          {/* Tree Lines and Expander */}
          <div className="flex items-center gap-1 pt-1">
            {hasChildren && (
              <button
                onClick={() => toggleNode(node.product.id)}
                className="w-4 h-4 flex items-center justify-center hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-4" />}
            
            {/* Tree connector */}
            {node.depth > 0 && (
              <div className="text-gray-400 text-xs mr-1">
                {hasChildren ? '├──' : '└──'}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {node.product.isManufactured ? (
              <Factory className="h-4 w-4 text-purple-600 flex-shrink-0" />
            ) : (
              <Package className="h-4 w-4 text-green-600 flex-shrink-0" />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{node.product.name}</span>
                <span className="text-xs text-gray-500">(ID: {node.product.id})</span>
                <Badge variant={node.product.isManufactured ? "secondary" : "default"} className="text-xs">
                  {node.product.isManufactured ? "Manufactured" : "Raw"}
                </Badge>
                <span className="text-xs text-gray-600">Qty: {node.product.quantity}</span>
                <span className="text-xs text-gray-600">{Number(node.product.pricePerUnit).toFixed(4)} ETH</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ownership History - Indented under product */}
        {node.product.ownershipHistory && node.product.ownershipHistory.length > 0 && (
          <div className="py-1" style={{ marginLeft: `${indent + 24}px` }}>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <History className="h-3 w-3" />
              <span className="font-medium">Ownership:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {node.product.ownershipHistory.map((owner, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className={`${idx === 0 ? 'text-blue-600' : idx === node.product.ownershipHistory.length - 1 ? 'text-green-600' : 'text-gray-500'}`}>
                      {formatAddress(owner)}
                    </span>
                    {idx < node.product.ownershipHistory.length - 1 && (
                      <span className="text-gray-400">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Manufacturing Components - Show as sub-tree when expanded */}
        {hasChildren && isExpanded && node.product.isManufactured && (
          <div className="py-1" style={{ marginLeft: `${indent + 24}px` }}>
            <div className="flex items-center gap-2 text-xs font-medium text-purple-700 mb-1">
              <Factory className="h-3 w-3" />
              <span>Made from:</span>
            </div>
          </div>
        )}

        {/* Render Children as true sub-tree */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child, index) => (
              <div key={child.product.id}>
                {renderTreeNode(child)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <TreePine className="h-4 w-4 mr-2" />
            View Tree
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TreePine className="h-5 w-5" />
            Supply Chain Tree: {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Factory className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                <p>Loading supply chain tree...</p>
              </div>
            </div>
          ) : treeData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TreePine className="h-5 w-5" />
                  Supply Chain Tree
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                  {renderTreeNode(treeData)}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tree data available</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function countManufacturedProducts(node: TreeNode): number {
  let count = node.product.isManufactured ? 1 : 0;
  for (const child of node.children) {
    count += countManufacturedProducts(child);
  }
  return count;
}

function getTreeDepth(node: TreeNode): number {
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(child => getTreeDepth(child)));
}