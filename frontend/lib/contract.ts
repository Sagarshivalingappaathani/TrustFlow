export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const HARDHAT_RPC_URL = "http://localhost:8545";

export const CONTRACT_ABI = [
  "function registerCompany(string memory _name, address _address) public",
  "function updateCompanyDetails(string memory _newName, address _newAddress) public",
  "function createProduct(string memory _name, string memory _description, string memory _imageHash, uint256 _quantity, uint256 _pricePerUnit) public",
  "function manufactureProduct(string memory _name, string memory _description, string memory _imageHash, uint256 _quantityToProduce, uint256[] memory _ingredientIds, uint256[] memory _quantitiesNeeded, uint256 _pricePerUnit) public",
  "function transferProduct(uint256 _productId, address _newOwner, uint256 _quantity) public",
  "function requestRelationship(address _supplier, address _buyer, uint256 _productId, uint256 _pricePerUnit, uint256 _startDate, uint256 _endDate) public",
  "function negotiateRelationship(uint256 _relationshipId, uint256 _newPricePerUnit, uint256 _newEndDate) public",
  "function acceptRelationship(uint256 _relationshipId) public",
  "function rejectRelationship(uint256 _relationshipId) public",
  "function placeRelationshipOrder(uint256 _relationshipId, uint256 _quantity) public",
  "function placeOrder(uint256 _relationshipId, uint256 _quantity, string memory _notes) public",
  "function rejectOrder(uint256 _orderId, string memory _reason) public",
  "function payForOrder(uint256 _orderId) public payable",
  "function completeOrderWithExternalPayment(uint256 _orderId, string memory _paymentMethod, string memory _paymentId) public",
  "function cancelExpiredOrder(uint256 _orderId) public",
  "function getOrdersByBuyer(address _buyer) public view returns (uint256[] memory)",
  "function getOrdersBySeller(address _seller) public view returns (uint256[] memory)",
  "function getPendingOrdersForSeller(address _seller) public view returns (uint256[] memory)",
  "function getApprovedOrdersForBuyer(address _buyer) public view returns (uint256[] memory)",
  "function getApprovedOrdersForSeller(address _seller) public view returns (uint256[] memory)",
  "function getOrdersByStatus(address _user, string memory _status) public view returns (uint256[] memory)",
  "function getOrder(uint256 _orderId) public view returns (tuple(uint256 id, address buyer, address seller, uint256 productId, uint256 quantity, uint256 unitPrice, uint256 totalPrice, string orderType, string status, uint256 createdAt, uint256 approvalDeadline, uint256 paymentDeadline, string notes, bool exists, bool isPartialTransfer, uint256 originalProductId, uint256 listingId))",
  "function addDeliveryEvent(uint256 _orderId, string memory _status, string memory _description) public",
  "function getOrderDeliveryHistory(uint256 _orderId) public view returns (tuple(uint256 timestamp, string status, string description, address updatedBy)[] memory)",
  "function getLatestDeliveryEvent(uint256 _orderId) public view returns (tuple(uint256 timestamp, string status, string description, address updatedBy))",
  "function listProductForSale(uint256 _productId, uint256 _quantity, uint256 _pricePerUnit) public",
  "function buyFromSpotMarket(uint256 _listingId, uint256 _quantity) public payable",
  "function createMarketplaceOrder(uint256 _listingId, uint256 _quantity, string memory _notes) public",
  "function removeSpotListing(uint256 _listingId) public",
  "function viewAllActiveListings() public view returns (uint256[] memory)",
  "function getTransactionHistory(address _userAddress) public view returns (uint256[] memory)",
  "function getProductTraceability(uint256 _productId) public view returns (address[] memory)",
  "function getProductTree(uint256 _productId) public view returns (tuple(uint256 productId, uint256 quantityUsed, address supplier, uint256 timestamp)[] memory)",
  "function getRawMaterialSources(uint256 _productId) public view returns (uint256[] memory)",
  "function getNegotiationHistory(uint256 _relationshipId) public view returns (tuple(uint256 step, uint256 pricePerUnit, address requestFrom, uint256 timestamp, uint256 endDate)[] memory)",
  "function getCurrentNegotiationTerms(uint256 _relationshipId) public view returns (uint256 pricePerUnit, uint256 endDate, address requestFrom)",
  "function getActiveRelationships(address _userAddress) public view returns (uint256[] memory)",
  "function getPendingRelationships(address _userAddress) public view returns (uint256[] memory)",
  "function getCompany(address _address) public view returns (tuple(uint256 id, string name, address companyAddress, bool exists))",
  "function getProduct(uint256 _productId) public view returns (tuple(uint256 id, string name, string description, string imageHash, tuple(uint256 productId, uint256 quantityUsed, address supplier, uint256 timestamp)[] components, bool isManufactured, address originalCreator, address[] ownershipHistory, uint256 quantity, uint256 pricePerUnit, address currentOwner, uint256 createdTime, bool exists))",
  "function getRelationship(uint256 _relationshipId) public view returns (tuple(uint256 id, address supplier, address buyer, uint256 productId, uint256 startDate, uint256 endDate, string status, bool exists))",
  "function getSpotListing(uint256 _listingId) public view returns (tuple(uint256 id, uint256 productId, address seller, uint256 quantityAvailable, uint256 pricePerUnit, uint256 listedDate, bool isActive))",
  "function getTransaction(uint256 _transactionId) public view returns (tuple(uint256 id, address buyer, address seller, uint256 productId, uint256 quantity, uint256 totalPrice, string transactionType, uint256 timestamp, string status))",
  "function isCompanyRegistered(address _address) public view returns (bool)",
  "function getAllCompanies() public view returns (address[] memory)",
  "function getProductsByOwner(address _owner) public view returns (uint256[] memory)",
  "function getContractStats() public view returns (uint256 totalCompanies, uint256 totalProducts, uint256 totalRelationships, uint256 totalTransactions, uint256 activeListings)",
  "function getOrderStats() public view returns (uint256 totalOrders, uint256 pendingOrders, uint256 approvedOrders, uint256 completedOrders)",
  "event CompanyRegistered(address indexed companyAddress, uint256 companyId, string name)",
  "event ProductCreated(uint256 indexed productId, string name, address owner, uint256 quantity)",
  "event RelationshipRequested(uint256 indexed relationshipId, address supplier, address buyer, uint256 productId)",
  "event RelationshipAccepted(uint256 indexed relationshipId)",
  "event SpotListingCreated(uint256 indexed listingId, uint256 productId, address seller, uint256 quantity)",
  "event SpotPurchase(uint256 indexed listingId, address buyer, uint256 quantity, uint256 totalPrice)",
  "event TransactionCreated(uint256 indexed transactionId, address buyer, address seller, string transactionType)",
  "event ProductManufactured(uint256 indexed newProductId, uint256[] ingredientIds, uint256[] quantities, address manufacturer)",
  "event InventoryConsumed(uint256 indexed productId, uint256 quantityUsed, address consumer)",
  "event ManufacturingRecipeCreated(uint256 indexed productId, uint256 ingredientCount)",
  "event DeliveryEventAdded(uint256 indexed orderId, string status, string description, address updatedBy)"
];

export interface Company {
  id: number;
  name: string;
  companyAddress: string;
  exists: boolean;
}

export interface ComponentSource {
  productId: number;
  quantityUsed: number;
  supplier: string;
  timestamp: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  imageHash: string;
  quantity: number;
  pricePerUnit: number | bigint;
  currentOwner: string;
  createdTime: number;
  exists: boolean;
  isManufactured: boolean;
  originalCreator: string;
  ownershipHistory: string[];
  components?: ComponentSource[];
}

export interface Relationship {
  id: number;
  supplier: string;
  buyer: string;
  productId: number;
  pricePerUnit: number;
  startDate: number;
  endDate: number;
  status: string;
  exists: boolean;
}

export interface SpotListing {
  id: number;
  productId: number;
  seller: string;
  quantityAvailable: number;
  pricePerUnit: number;
  listedDate: number;
  isActive: boolean;
}

export interface Transaction {
  id: number;
  buyer: string;
  seller: string;
  productId: number;
  quantity: number;
  totalPrice: number;
  transactionType: string;
  timestamp: number;
  status: string;
}

export interface NegotiationStep {
  step: number;
  pricePerUnit: number;
  requestFrom: string;
  timestamp: number;
  endDate: number;
}

export interface DeliveryEvent {
  timestamp: number;
  status: string;
  description: string;
  updatedBy: string;
}

export interface Order {
  id: number;
  buyer: string;
  seller: string;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  orderType: string;
  status: string;
  createdAt: number;
  approvalDeadline: number;
  paymentDeadline: number;
  notes: string;
  deliveryEvents?: DeliveryEvent[];
  exists: boolean;
  isPartialTransfer: boolean;
  originalProductId: number;
  listingId: number;
}

export interface ContractStats {
  totalCompanies: number;
  totalProducts: number;
  totalRelationships: number;
  totalTransactions: number;
  activeListings: number;
}

export interface ManufacturingRecipe {
  ingredientId: number;
  quantityNeeded: number;
  productName: string;
  availableQuantity: number;
}