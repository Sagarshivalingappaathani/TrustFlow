pragma solidity ^0.8.28;
contract TrustFlow {
    struct Company {
        uint256 id;
        string name;
        address companyAddress;
        bool exists;
    }
    struct NegotiationStep {
        uint256 step;
        uint256 pricePerUnit;
        address requestFrom;
        uint256 timestamp;
        uint256 endDate;
    }
    struct ComponentSource {
        uint256 productId;
        uint256 quantityUsed;
        address supplier;
        uint256 timestamp;
    }
    struct Product {
        uint256 id;
        string name;
        string description;
        string imageHash;
        ComponentSource[] components;
        bool isManufactured;
        address originalCreator;
        address[] ownershipHistory;
        uint256 quantity;
        uint256 pricePerUnit;
        address currentOwner;
        uint256 createdTime;
        bool exists;
    }
    struct Relationship {
        uint256 id;
        address supplier;
        address buyer;
        uint256 productId;
        uint256 startDate;
        uint256 endDate;
        string status;
        NegotiationStep[] negotiationHistory;
        bool exists;
    }
    struct SpotListing {
        uint256 id;
        uint256 productId;
        address seller;
        uint256 quantityAvailable;
        uint256 pricePerUnit;
        uint256 listedDate;
        bool isActive;
    }
    struct DeliveryEvent {
        uint256 timestamp;
        string status;
        string description;
        address updatedBy;
    }
    struct Order {
        uint256 id;
        address buyer;
        address seller;
        uint256 productId;
        uint256 quantity;
        uint256 unitPrice;
        uint256 totalPrice;
        string orderType;
        string status;
        uint256 createdAt;
        uint256 approvalDeadline;
        uint256 paymentDeadline;
        string notes;
        DeliveryEvent[] deliveryEvents;
        bool exists;
        bool isPartialTransfer;
        uint256 originalProductId;
        uint256 listingId;
    }
    struct Transaction {
        uint256 id;
        address buyer;
        address seller;
        uint256 productId;
        uint256 quantity;
        uint256 totalPrice;
        string transactionType;
        uint256 timestamp;
        string status;
    }
    mapping(address => Company) public companies;
    mapping(uint256 => Product) public products;
    mapping(uint256 => Relationship) public relationships;
    mapping(uint256 => SpotListing) public spotListings;
    mapping(uint256 => Order) public orders;
    mapping(uint256 => Transaction) public transactions;
    uint256[] public activeSpotListings;
    address[] public allCompanies;
    mapping(address => uint256[]) public userTransactions;
    mapping(address => uint256[]) public userOrders;
    uint256 public nextCompanyId = 1;
    uint256 public nextProductId = 1;
    uint256 public nextRelationshipId = 1;
    uint256 public nextSpotListingId = 1;
    uint256 public nextOrderId = 1;
    uint256 public nextTransactionId = 1;
    event CompanyRegistered(address indexed companyAddress, uint256 companyId, string name);
    event CompanyUpdated(address indexed companyAddress, string newName, address newAddress);
    event ProductCreated(uint256 indexed productId, string name, address owner, uint256 quantity);
    event ProductTransferred(uint256 indexed productId, address from, address to, uint256 quantity);
    event RelationshipRequested(uint256 indexed relationshipId, address supplier, address buyer, uint256 productId);
    event RelationshipNegotiated(uint256 indexed relationshipId, uint256 step, uint256 pricePerUnit, address requestFrom);
    event RelationshipAccepted(uint256 indexed relationshipId);
    event RelationshipRejected(uint256 indexed relationshipId);
    event RelationshipOrderPlaced(uint256 indexed relationshipId, uint256 quantity, uint256 totalPrice);
    event OrderPlaced(uint256 indexed orderId, address buyer, address seller, uint256 quantity, string orderType);
    event OrderApproved(uint256 indexed orderId, address approver);
    event OrderRejected(uint256 indexed orderId, address rejector, string reason);
    event OrderPaid(uint256 indexed orderId, address buyer, uint256 amount);
    event OrderCompleted(uint256 indexed orderId);
    event OrderExpired(uint256 indexed orderId, string reason);
    event DeliveryEventAdded(uint256 indexed orderId, string status, string description, address updatedBy);
    event SpotListingCreated(uint256 indexed listingId, uint256 productId, address seller, uint256 quantity);
    event SpotPurchase(uint256 indexed listingId, address buyer, uint256 quantity, uint256 totalPrice);
    event SpotListingRemoved(uint256 indexed listingId);
    event TransactionCreated(uint256 indexed transactionId, address buyer, address seller, string transactionType);
    event ProductManufactured(uint256 indexed newProductId, uint256[] ingredientIds, uint256[] quantities, address manufacturer);
    event InventoryConsumed(uint256 indexed productId, uint256 quantityUsed, address consumer);
    event ManufacturingRecipeCreated(uint256 indexed productId, uint256 ingredientCount);
    modifier onlyRegisteredCompany() {
        require(companies[msg.sender].exists, "Company not registered");
        _;
    }
    modifier onlyProductOwner(uint256 _productId) {
        require(products[_productId].exists, "Product does not exist");
        require(products[_productId].currentOwner == msg.sender, "Not product owner");
        _;
    }
    modifier relationshipExists(uint256 _relationshipId) {
        require(relationships[_relationshipId].exists, "Relationship does not exist");
        _;
    }
    modifier onlyRelationshipParties(uint256 _relationshipId) {
        require(
            relationships[_relationshipId].supplier == msg.sender || 
            relationships[_relationshipId].buyer == msg.sender,
            "Not a party to this relationship"
        );
        _;
    }
    modifier orderExists(uint256 _orderId) {
        require(orders[_orderId].exists, "Order does not exist");
        _;
    }
    modifier onlyOrderParties(uint256 _orderId) {
        require(
            orders[_orderId].buyer == msg.sender || 
            orders[_orderId].seller == msg.sender,
            "Not a party to this order"
        );
        _;
    }
    function registerCompany(string memory _name, address _address) public {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(_address != address(0), "Invalid address");
        require(!companies[_address].exists, "Company already registered");
        companies[_address] = Company({
            id: nextCompanyId,
            name: _name,
            companyAddress: _address,
            exists: true
        });
        allCompanies.push(_address);
        emit CompanyRegistered(_address, nextCompanyId, _name);
        nextCompanyId++;
    }
    function updateCompanyDetails(string memory _newName, address _newAddress) public onlyRegisteredCompany {
        require(bytes(_newName).length > 0, "Name cannot be empty");
        require(_newAddress != address(0), "Invalid address");
        Company storage company = companies[msg.sender];
        company.name = _newName;
        company.companyAddress = _newAddress;
        emit CompanyUpdated(msg.sender, _newName, _newAddress);
    }
    function createProduct(string memory _name, string memory _description, string memory _imageHash, uint256 _quantity, uint256 _pricePerUnit) public onlyRegisteredCompany {
        require(bytes(_name).length > 0, "Product name cannot be empty");
        require(bytes(_description).length > 0, "Product description cannot be empty");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_pricePerUnit > 0, "Price must be greater than 0");
        products[nextProductId].id = nextProductId;
        products[nextProductId].name = _name;
        products[nextProductId].description = _description;
        products[nextProductId].imageHash = _imageHash;
        products[nextProductId].quantity = _quantity;
        products[nextProductId].pricePerUnit = _pricePerUnit;
        products[nextProductId].currentOwner = msg.sender;
        products[nextProductId].createdTime = block.timestamp;
        products[nextProductId].exists = true;
        products[nextProductId].isManufactured = false;
        products[nextProductId].originalCreator = msg.sender;
        products[nextProductId].ownershipHistory.push(msg.sender);
        emit ProductCreated(nextProductId, _name, msg.sender, _quantity);
        nextProductId++;
    }
    function manufactureProduct(
        string memory _name,
        string memory _description,
        string memory _imageHash,
        uint256 _quantityToProduce,
        uint256[] memory _ingredientIds,
        uint256[] memory _quantitiesNeeded,
        uint256 _pricePerUnit
    ) public onlyRegisteredCompany {
        require(bytes(_name).length > 0, "Product name cannot be empty");
        require(bytes(_description).length > 0, "Product description cannot be empty");
        require(_quantityToProduce > 0, "Quantity must be greater than 0");
        require(_pricePerUnit > 0, "Price must be greater than 0");
        require(_ingredientIds.length > 0, "Must have at least one ingredient");
        require(_ingredientIds.length == _quantitiesNeeded.length, "Ingredients and quantities arrays must match");
        
        // Validate all ingredients exist and caller owns sufficient quantities
        for (uint256 i = 0; i < _ingredientIds.length; i++) {
            require(products[_ingredientIds[i]].exists, "Ingredient product does not exist");
            require(products[_ingredientIds[i]].currentOwner == msg.sender, "You don't own this ingredient");
            require(products[_ingredientIds[i]].quantity >= _quantitiesNeeded[i] * _quantityToProduce, "Insufficient ingredient quantity");
            require(_quantitiesNeeded[i] > 0, "Ingredient quantity must be greater than 0");
        }
        
        // Deduct ingredients from inventory
        for (uint256 i = 0; i < _ingredientIds.length; i++) {
            uint256 totalNeeded = _quantitiesNeeded[i] * _quantityToProduce;
            products[_ingredientIds[i]].quantity -= totalNeeded;
            emit InventoryConsumed(_ingredientIds[i], totalNeeded, msg.sender);
        }
        
        // Create new manufactured product
        products[nextProductId].id = nextProductId;
        products[nextProductId].name = _name;
        products[nextProductId].description = _description;
        products[nextProductId].imageHash = _imageHash;
        products[nextProductId].quantity = _quantityToProduce;
        products[nextProductId].pricePerUnit = _pricePerUnit;
        products[nextProductId].currentOwner = msg.sender;
        products[nextProductId].createdTime = block.timestamp;
        products[nextProductId].exists = true;
        products[nextProductId].isManufactured = true;
        products[nextProductId].originalCreator = msg.sender;
        products[nextProductId].ownershipHistory.push(msg.sender);
        
        // Add component sources to track what went into manufacturing
        for (uint256 i = 0; i < _ingredientIds.length; i++) {
            products[nextProductId].components.push(ComponentSource({
                productId: _ingredientIds[i],
                quantityUsed: _quantitiesNeeded[i],
                supplier: msg.sender,
                timestamp: block.timestamp
            }));
        }
        
        emit ProductCreated(nextProductId, _name, msg.sender, _quantityToProduce);
        emit ProductManufactured(nextProductId, _ingredientIds, _quantitiesNeeded, msg.sender);
        emit ManufacturingRecipeCreated(nextProductId, _ingredientIds.length);
        nextProductId++;
    }
    function transferProduct(uint256 _productId, address _newOwner, uint256 _quantity) public onlyProductOwner(_productId) {
        _transferProductAndGetId(_productId, _newOwner, _quantity, msg.sender);
    }
    function _transferProductAndGetId(uint256 _productId, address _newOwner, uint256 _quantity, address _currentOwner) internal returns (uint256) {
        require(companies[_newOwner].exists, "New owner not registered");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(products[_productId].quantity >= _quantity, "Insufficient quantity");
        require(products[_productId].currentOwner == _currentOwner, "Not current owner");
        Product storage product = products[_productId];
        if (_quantity == product.quantity) {
            product.currentOwner = _newOwner;
            product.ownershipHistory.push(_newOwner);
            emit ProductTransferred(_productId, _currentOwner, _newOwner, _quantity);
            return _productId;
        } else {
            product.quantity -= _quantity;
            uint256 newProductId = nextProductId;
            products[newProductId].id = newProductId;
            products[newProductId].name = product.name;
            products[newProductId].description = product.description;
            products[newProductId].imageHash = product.imageHash;
            products[newProductId].quantity = _quantity;
            products[newProductId].pricePerUnit = product.pricePerUnit; 
            products[newProductId].currentOwner = _newOwner;
            products[newProductId].createdTime = block.timestamp;
            products[newProductId].exists = true;
            for (uint i = 0; i < product.ownershipHistory.length; i++) {
                products[newProductId].ownershipHistory.push(product.ownershipHistory[i]);
            }
            products[newProductId].ownershipHistory.push(_newOwner);
            emit ProductCreated(newProductId, product.name, _newOwner, _quantity);
            emit ProductTransferred(_productId, _currentOwner, _newOwner, _quantity);
            nextProductId++;
            return newProductId;
        }
    }
    function requestRelationship(
        address _supplier, 
        address _buyer, 
        uint256 _productId, 
        uint256 _pricePerUnit, 
        uint256 _startDate, 
        uint256 _endDate
    ) public onlyRegisteredCompany {
        require(companies[_supplier].exists && companies[_buyer].exists, "Both parties must be registered");
        require(products[_productId].exists, "Product does not exist");
        require(msg.sender == _supplier || msg.sender == _buyer, "Must be one of the parties");
        if (msg.sender == _supplier) {
            require(products[_productId].currentOwner == _supplier, "Supplier does not own this product");
        }
        require(_supplier != _buyer, "Cannot create relationship with yourself");
        require(msg.sender == _supplier || msg.sender == _buyer, "You must be either supplier or buyer");
        require(_startDate < _endDate, "Invalid dates");
        require(_startDate > block.timestamp - 86400, "Start date must not be more than 1 day in the past");
        require(_pricePerUnit > 0, "Price must be greater than 0");
        NegotiationStep memory firstStep = NegotiationStep({
            step: 1,
            pricePerUnit: _pricePerUnit,
            requestFrom: msg.sender,
            timestamp: block.timestamp,
            endDate: _endDate
        });
        relationships[nextRelationshipId].id = nextRelationshipId;
        relationships[nextRelationshipId].supplier = _supplier;
        relationships[nextRelationshipId].buyer = _buyer;
        relationships[nextRelationshipId].productId = _productId;
        relationships[nextRelationshipId].startDate = _startDate;
        relationships[nextRelationshipId].endDate = _endDate;
        relationships[nextRelationshipId].status = "pending";
        relationships[nextRelationshipId].exists = true;
        relationships[nextRelationshipId].negotiationHistory.push(firstStep);
        emit RelationshipRequested(nextRelationshipId, _supplier, _buyer, _productId);
        emit RelationshipNegotiated(nextRelationshipId, 1, _pricePerUnit, msg.sender);
        nextRelationshipId++;
    }
    function negotiateRelationship(
        uint256 _relationshipId, 
        uint256 _newPricePerUnit, 
        uint256 _newEndDate
    ) public relationshipExists(_relationshipId) onlyRelationshipParties(_relationshipId) {
        require(
            keccak256(bytes(relationships[_relationshipId].status)) == keccak256(bytes("pending")),
            "Relationship not in pending status"
        );
        require(_newPricePerUnit > 0, "Price must be greater than 0");
        require(_newEndDate > block.timestamp, "End date must be in the future");
        Relationship storage rel = relationships[_relationshipId];
        require(rel.negotiationHistory.length > 0, "No negotiation history");
        NegotiationStep storage currentStep = rel.negotiationHistory[rel.negotiationHistory.length - 1];
        require(currentStep.requestFrom != msg.sender, "Cannot negotiate when you are the requestFrom party");
        uint256 nextStep = rel.negotiationHistory.length + 1;
        NegotiationStep memory newStep = NegotiationStep({
            step: nextStep,
            pricePerUnit: _newPricePerUnit,
            requestFrom: msg.sender,
            timestamp: block.timestamp,
            endDate: _newEndDate
        });
        rel.negotiationHistory.push(newStep);
        rel.endDate = _newEndDate; 
        emit RelationshipNegotiated(_relationshipId, nextStep, _newPricePerUnit, msg.sender);
    }
    function acceptRelationship(uint256 _relationshipId) public relationshipExists(_relationshipId) onlyRelationshipParties(_relationshipId) {
        require(
            keccak256(bytes(relationships[_relationshipId].status)) == keccak256(bytes("pending")),
            "Relationship not in pending status"
        );
        Relationship storage rel = relationships[_relationshipId];
        require(rel.negotiationHistory.length > 0, "No negotiation history");
        NegotiationStep storage currentStep = rel.negotiationHistory[rel.negotiationHistory.length - 1];
        require(currentStep.requestFrom != msg.sender, "Cannot accept when you are the requestFrom party");
        relationships[_relationshipId].status = "accepted";
        emit RelationshipAccepted(_relationshipId);
    }
    function rejectRelationship(uint256 _relationshipId) public relationshipExists(_relationshipId) onlyRelationshipParties(_relationshipId) {
        require(
            keccak256(bytes(relationships[_relationshipId].status)) == keccak256(bytes("pending")),
            "Relationship not in pending status"
        );
        Relationship storage rel = relationships[_relationshipId];
        require(rel.negotiationHistory.length > 0, "No negotiation history");
        NegotiationStep storage currentStep = rel.negotiationHistory[rel.negotiationHistory.length - 1];
        require(currentStep.requestFrom != msg.sender, "Cannot reject when you are the requestFrom party");
        relationships[_relationshipId].status = "rejected";
        emit RelationshipRejected(_relationshipId);
    }
    function placeOrder(uint256 _relationshipId, uint256 _quantity, string memory _notes) public relationshipExists(_relationshipId) {
        require(
            keccak256(bytes(relationships[_relationshipId].status)) == keccak256(bytes("accepted")),
            "Relationship not accepted"
        );
        require(
            relationships[_relationshipId].buyer == msg.sender,
            "Only buyer can place orders"
        );
        require(_quantity > 0, "Quantity must be greater than 0");
        require(
            block.timestamp >= relationships[_relationshipId].startDate &&
            block.timestamp <= relationships[_relationshipId].endDate,
            "Relationship not currently active for orders"
        );
        Product storage product = products[relationships[_relationshipId].productId];
        require(product.currentOwner == relationships[_relationshipId].supplier, "Supplier no longer owns this product");
        require(product.quantity >= _quantity, "Insufficient product quantity available");
        Relationship storage rel = relationships[_relationshipId];
        NegotiationStep storage latestStep = rel.negotiationHistory[rel.negotiationHistory.length - 1];
        uint256 unitPrice = latestStep.pricePerUnit;
        require(_quantity <= type(uint256).max / unitPrice, "Order value too large");
        uint256 totalPrice = unitPrice * _quantity;
        orders[nextOrderId].id = nextOrderId;
        orders[nextOrderId].buyer = rel.buyer;
        orders[nextOrderId].seller = rel.supplier;
        orders[nextOrderId].productId = rel.productId;
        orders[nextOrderId].quantity = _quantity;
        orders[nextOrderId].unitPrice = unitPrice;
        orders[nextOrderId].totalPrice = totalPrice;
        orders[nextOrderId].orderType = "relationship";
        orders[nextOrderId].status = "pending";
        orders[nextOrderId].createdAt = block.timestamp;
        orders[nextOrderId].approvalDeadline = block.timestamp + 48 hours; 
        orders[nextOrderId].paymentDeadline = 0; 
        orders[nextOrderId].notes = _notes;
        orders[nextOrderId].exists = true;
        orders[nextOrderId].isPartialTransfer = false;
        orders[nextOrderId].originalProductId = 0;
        orders[nextOrderId].listingId = 0;
        userOrders[rel.buyer].push(nextOrderId);
        userOrders[rel.supplier].push(nextOrderId);
        emit OrderPlaced(nextOrderId, rel.buyer, rel.supplier, _quantity, "relationship");
        nextOrderId++;
    }
    function createMarketplaceOrder(uint256 _listingId, uint256 _quantity, string memory _notes) public onlyRegisteredCompany {
        require(spotListings[_listingId].isActive, "Listing not active");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(spotListings[_listingId].quantityAvailable >= _quantity, "Insufficient quantity");
        require(spotListings[_listingId].seller != msg.sender, "Cannot buy from yourself");
        SpotListing storage listing = spotListings[_listingId];
        uint256 unitPrice = listing.pricePerUnit;
        require(_quantity <= type(uint256).max / unitPrice, "Order value too large");
        uint256 totalPrice = unitPrice * _quantity;
        require(products[listing.productId].currentOwner == listing.seller, "Seller no longer owns this product");
        require(products[listing.productId].quantity >= _quantity, "Insufficient product quantity available");
        orders[nextOrderId].id = nextOrderId;
        orders[nextOrderId].buyer = msg.sender;
        orders[nextOrderId].seller = listing.seller;
        orders[nextOrderId].productId = listing.productId;
        orders[nextOrderId].quantity = _quantity;
        orders[nextOrderId].unitPrice = unitPrice;
        orders[nextOrderId].totalPrice = totalPrice;
        orders[nextOrderId].orderType = "marketplace";
        orders[nextOrderId].status = "pending";
        orders[nextOrderId].createdAt = block.timestamp;
        orders[nextOrderId].approvalDeadline = block.timestamp + 48 hours;
        orders[nextOrderId].paymentDeadline = 0;
        orders[nextOrderId].notes = _notes;
        orders[nextOrderId].exists = true;
        orders[nextOrderId].isPartialTransfer = false;
        orders[nextOrderId].originalProductId = 0;
        orders[nextOrderId].listingId = _listingId;
        userOrders[msg.sender].push(nextOrderId);
        userOrders[listing.seller].push(nextOrderId);
        emit OrderPlaced(nextOrderId, msg.sender, listing.seller, _quantity, "marketplace");
        nextOrderId++;
    }
    function rejectOrder(uint256 _orderId, string memory _reason) public orderExists(_orderId) {
        require(orders[_orderId].seller == msg.sender, "Only seller can reject orders");
        require(
            keccak256(bytes(orders[_orderId].status)) == keccak256(bytes("pending")),
            "Order not in pending status"
        );
        orders[_orderId].status = "rejected";
        emit OrderRejected(_orderId, msg.sender, _reason);
    }
    function payForOrder(uint256 _orderId) public payable orderExists(_orderId) {
        require(orders[_orderId].buyer == msg.sender, "Only buyer can pay for orders");
        Order storage order = orders[_orderId];
        bool qualityCheckCompleted = false;
        for (uint i = 0; i < order.deliveryEvents.length; i++) {
            if (keccak256(bytes(order.deliveryEvents[i].status)) == keccak256(bytes("quality_checked"))) {
                qualityCheckCompleted = true;
                break;
            }
        }
        require(qualityCheckCompleted, "Cannot pay before quality check is completed");
        for (uint i = 0; i < order.deliveryEvents.length; i++) {
            if (keccak256(bytes(order.deliveryEvents[i].status)) == keccak256(bytes("payment_sent"))) {
                revert("Payment already completed");
            }
        }
        require(msg.value >= order.totalPrice, "Insufficient payment");
        payable(order.seller).transfer(order.totalPrice);
        if (msg.value > order.totalPrice) {
            payable(msg.sender).transfer(msg.value - order.totalPrice);
        }
        emit OrderPaid(_orderId, msg.sender, order.totalPrice);
        _addPaymentSentEvent(_orderId, "Payment completed");
        order.status = "completed";
        transactions[nextTransactionId] = Transaction({
            id: nextTransactionId,
            buyer: order.buyer,
            seller: order.seller,
            productId: order.productId,
            quantity: order.quantity,
            totalPrice: order.totalPrice,
            transactionType: order.orderType,
            timestamp: block.timestamp,
            status: "completed"
        });
        userTransactions[order.buyer].push(nextTransactionId);
        userTransactions[order.seller].push(nextTransactionId);
        emit OrderCompleted(order.id);
        emit TransactionCreated(nextTransactionId, order.buyer, order.seller, order.orderType);
        nextTransactionId++;
    }
    function cancelExpiredOrder(uint256 _orderId) public orderExists(_orderId) onlyOrderParties(_orderId) {
        Order storage order = orders[_orderId];
        string memory status = order.status;
        bool canCancel = false;
        string memory reason = "";
        if (keccak256(bytes(status)) == keccak256(bytes("pending")) && 
            block.timestamp > order.approvalDeadline) {
            canCancel = true;
            reason = "Approval deadline exceeded";
        } else if (keccak256(bytes(status)) == keccak256(bytes("approved")) && 
                   block.timestamp > order.paymentDeadline) {
            canCancel = true;
            reason = "Payment deadline exceeded";
            revertProductOwnership(_orderId);
        }
        require(canCancel, "Order cannot be cancelled");
        order.status = "expired";
        emit OrderExpired(_orderId, reason);
    }
    function revertProductOwnership(uint256 _orderId) internal {
        Order storage order = orders[_orderId];
        if (order.isPartialTransfer) {
            Product storage newProduct = products[order.productId];
            if (newProduct.exists && newProduct.currentOwner == order.buyer) {
                newProduct.exists = false;
                Product storage originalProduct = products[order.originalProductId];
                originalProduct.quantity += order.quantity;
            }
        } else {
            Product storage product = products[order.productId];
            if (product.currentOwner == order.buyer) {
                product.currentOwner = order.seller;
                if (product.ownershipHistory.length > 0 && 
                    product.ownershipHistory[product.ownershipHistory.length - 1] == order.buyer) {
                    product.ownershipHistory.pop();
                }
            }
        }
    }
    function _addPaymentSentEvent(uint256 _orderId, string memory _description) internal {
        Order storage order = orders[_orderId];
        order.deliveryEvents.push(DeliveryEvent({
            timestamp: block.timestamp,
            status: "payment_sent",
            description: _description,
            updatedBy: order.buyer
        }));
        emit DeliveryEventAdded(_orderId, "payment_sent", _description, order.buyer);
    }
    function addDeliveryEvent(uint256 _orderId, string memory _status, string memory _description) public orderExists(_orderId) onlyOrderParties(_orderId) {
        require(bytes(_status).length > 0, "Status cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        Order storage order = orders[_orderId];
        string memory lastStatus = "";
        if (order.deliveryEvents.length > 0) {
            lastStatus = order.deliveryEvents[order.deliveryEvents.length - 1].status;
            require(keccak256(bytes(lastStatus)) != keccak256(bytes(_status)), "Event already exists");
        }
        if (keccak256(bytes(_status)) == keccak256(bytes("approved"))) {
            require(order.deliveryEvents.length == 0, "Approved must be first event");
            require(keccak256(bytes(order.status)) == keccak256(bytes("pending")), "Order must be pending");
        } else if (keccak256(bytes(_status)) == keccak256(bytes("packed"))) {
            require(keccak256(bytes(lastStatus)) == keccak256(bytes("approved")), "Must be approved before packing");
        } else if (keccak256(bytes(_status)) == keccak256(bytes("shipped"))) {
            require(keccak256(bytes(lastStatus)) == keccak256(bytes("packed")), "Must be packed before shipping");
        } else if (keccak256(bytes(_status)) == keccak256(bytes("delivered"))) {
            require(keccak256(bytes(lastStatus)) == keccak256(bytes("shipped")), "Must be shipped before delivery");
        } else if (keccak256(bytes(_status)) == keccak256(bytes("quality_checked"))) {
            require(keccak256(bytes(lastStatus)) == keccak256(bytes("delivered")), "Must be delivered before quality check");
        } else if (keccak256(bytes(_status)) == keccak256(bytes("payment_sent"))) {
            require(keccak256(bytes(lastStatus)) == keccak256(bytes("quality_checked")), "Must complete quality check before payment");
        }
        if (keccak256(bytes(_status)) == keccak256(bytes("approved")) ||
            keccak256(bytes(_status)) == keccak256(bytes("packed")) ||
            keccak256(bytes(_status)) == keccak256(bytes("shipped"))) {
            require(order.seller == msg.sender, "Only seller can add supplier events");
        }
        if (keccak256(bytes(_status)) == keccak256(bytes("delivered")) ||
            keccak256(bytes(_status)) == keccak256(bytes("quality_checked"))) {
            require(order.buyer == msg.sender, "Only buyer can add buyer events");
        }
        if (keccak256(bytes(_status)) == keccak256(bytes("payment_sent"))) {
            revert("payment_sent can only be added through payForOrder function");
        }
        DeliveryEvent memory newEvent = DeliveryEvent({
            timestamp: block.timestamp,
            status: _status,
            description: _description,
            updatedBy: msg.sender
        });
        order.deliveryEvents.push(newEvent);
        if (keccak256(bytes(_status)) == keccak256(bytes("approved"))) {
            order.status = "approved";
            order.paymentDeadline = block.timestamp + 7 days; 
            Product storage product = products[order.productId];
            require(product.quantity >= order.quantity, "Insufficient product quantity");
            if (order.quantity == product.quantity) {
                product.currentOwner = order.buyer;
                product.ownershipHistory.push(order.buyer);
                order.isPartialTransfer = false;
                order.originalProductId = order.productId;
            } else {
                product.quantity -= order.quantity;
                order.isPartialTransfer = true;
                order.originalProductId = order.productId;
                products[nextProductId].id = nextProductId;
                products[nextProductId].name = product.name;
                products[nextProductId].description = product.description;
                products[nextProductId].imageHash = product.imageHash;
                products[nextProductId].quantity = order.quantity;
                products[nextProductId].pricePerUnit = order.unitPrice;
                products[nextProductId].currentOwner = order.buyer;
                products[nextProductId].createdTime = block.timestamp;
                products[nextProductId].exists = true;
                for (uint i = 0; i < product.ownershipHistory.length; i++) {
                    products[nextProductId].ownershipHistory.push(product.ownershipHistory[i]);
                }
                products[nextProductId].ownershipHistory.push(order.buyer);
                order.productId = nextProductId;
                nextProductId++;
            }
            if (keccak256(bytes(order.orderType)) == keccak256(bytes("marketplace"))) {
                SpotListing storage listing = spotListings[order.listingId];
                require(listing.quantityAvailable >= order.quantity, "Insufficient listing quantity");
                listing.quantityAvailable -= order.quantity;
                if (listing.quantityAvailable == 0) {
                    listing.isActive = false;
                }
            }
            emit OrderApproved(_orderId, msg.sender);
        }
        emit DeliveryEventAdded(_orderId, _status, _description, msg.sender);
    }
    function getOrderDeliveryHistory(uint256 _orderId) public view orderExists(_orderId) returns (DeliveryEvent[] memory) {
        return orders[_orderId].deliveryEvents;
    }
    function getLatestDeliveryEvent(uint256 _orderId) public view orderExists(_orderId) returns (DeliveryEvent memory) {
        Order storage order = orders[_orderId];
        require(order.deliveryEvents.length > 0, "No delivery events found");
        return order.deliveryEvents[order.deliveryEvents.length - 1];
    }
    function placeRelationshipOrder(uint256 _relationshipId, uint256 _quantity) public relationshipExists(_relationshipId) {
        placeOrder(_relationshipId, _quantity, "");
    }
    function listProductForSale(uint256 _productId, uint256 _quantity, uint256 _pricePerUnit) public onlyRegisteredCompany onlyProductOwner(_productId) {
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_pricePerUnit > 0, "Price must be greater than 0");
        require(products[_productId].quantity >= _quantity, "Insufficient quantity");
        spotListings[nextSpotListingId] = SpotListing({
            id: nextSpotListingId,
            productId: _productId,
            seller: msg.sender,
            quantityAvailable: _quantity,
            pricePerUnit: _pricePerUnit,
            listedDate: block.timestamp,
            isActive: true
        });
        activeSpotListings.push(nextSpotListingId);
        emit SpotListingCreated(nextSpotListingId, _productId, msg.sender, _quantity);
        nextSpotListingId++;
    }
    function buyFromSpotMarket(uint256 _listingId, uint256 _quantity) public payable onlyRegisteredCompany {
        require(spotListings[_listingId].isActive, "Listing not active");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(spotListings[_listingId].quantityAvailable >= _quantity, "Insufficient quantity");
        require(spotListings[_listingId].seller != msg.sender, "Cannot buy from yourself");
        SpotListing storage listing = spotListings[_listingId];
        require(_quantity <= type(uint256).max / listing.pricePerUnit, "Purchase value too large");
        uint256 totalPrice = listing.pricePerUnit * _quantity;
        require(msg.value >= totalPrice, "Insufficient payment");
        listing.quantityAvailable -= _quantity;
        if (listing.quantityAvailable == 0) {
            listing.isActive = false;
            for (uint i = 0; i < activeSpotListings.length; i++) {
                if (activeSpotListings[i] == _listingId) {
                    activeSpotListings[i] = activeSpotListings[activeSpotListings.length - 1];
                    activeSpotListings.pop();
                    break;
                }
            }
        }
        payable(listing.seller).transfer(totalPrice);
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }
        uint256 originalProductId = listing.productId;
        uint256 actualProductId = _transferProductAndGetId(listing.productId, msg.sender, _quantity, listing.seller);
        transactions[nextTransactionId] = Transaction({
            id: nextTransactionId,
            buyer: msg.sender,
            seller: listing.seller,
            productId: actualProductId,  
            quantity: _quantity,
            totalPrice: totalPrice,
            transactionType: "spot",
            timestamp: block.timestamp,
            status: "completed"
        });
        userTransactions[msg.sender].push(nextTransactionId);
        userTransactions[listing.seller].push(nextTransactionId);
        emit SpotPurchase(_listingId, msg.sender, _quantity, totalPrice);
        emit TransactionCreated(nextTransactionId, msg.sender, listing.seller, "spot");
        nextTransactionId++;
    }
    function removeSpotListing(uint256 _listingId) public {
        require(spotListings[_listingId].seller == msg.sender, "Not listing owner");
        require(spotListings[_listingId].isActive, "Listing not active");
        spotListings[_listingId].isActive = false;
        for (uint i = 0; i < activeSpotListings.length; i++) {
            if (activeSpotListings[i] == _listingId) {
                activeSpotListings[i] = activeSpotListings[activeSpotListings.length - 1];
                activeSpotListings.pop();
                break;
            }
        }
        emit SpotListingRemoved(_listingId);
    }
    function viewAllActiveListings() public view returns (uint256[] memory) {
        return activeSpotListings;
    }
    function getTransactionHistory(address _userAddress) public view returns (uint256[] memory) {
        return userTransactions[_userAddress];
    }
    function getProductTraceability(uint256 _productId) public view returns (address[] memory) {
        require(products[_productId].exists, "Product does not exist");
        if (products[_productId].isManufactured) {
            return getComponentSuppliers(_productId);
        } else {
            return products[_productId].ownershipHistory;
        }
    }
    function getProductTree(uint256 _productId) public view returns (ComponentSource[] memory) {
        require(products[_productId].exists, "Product does not exist");
        return products[_productId].components;
    }
    function getComponentSuppliers(uint256 _productId) internal view returns (address[] memory) {
        require(products[_productId].exists, "Product does not exist");
        ComponentSource[] memory components = products[_productId].components;
        address[] memory suppliers = new address[](components.length);
        for (uint256 i = 0; i < components.length; i++) {
            suppliers[i] = components[i].supplier;
        }
        return suppliers;
    }
    function getRawMaterialSources(uint256 _productId) public view returns (uint256[] memory) {
        require(products[_productId].exists, "Product does not exist");
        if (!products[_productId].isManufactured) {
            uint256[] memory rawMaterials = new uint256[](1);
            rawMaterials[0] = _productId;
            return rawMaterials;
        }
        
        ComponentSource[] memory components = products[_productId].components;
        uint256[] memory allRawMaterials = new uint256[](100); // Temporary large array
        uint256 count = 0;
        
        for (uint256 i = 0; i < components.length; i++) {
            uint256[] memory subMaterials = getRawMaterialSources(components[i].productId);
            for (uint256 j = 0; j < subMaterials.length; j++) {
                allRawMaterials[count] = subMaterials[j];
                count++;
            }
        }
        
        // Create result array with exact size
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = allRawMaterials[i];
        }
        return result;
    }
    function getNegotiationHistory(uint256 _relationshipId) public view returns (NegotiationStep[] memory) {
        require(relationships[_relationshipId].exists, "Relationship does not exist");
        return relationships[_relationshipId].negotiationHistory;
    }
    function getCurrentNegotiationTerms(uint256 _relationshipId) public view returns (uint256 pricePerUnit, uint256 endDate, address requestFrom) {
        require(relationships[_relationshipId].exists, "Relationship does not exist");
        Relationship storage rel = relationships[_relationshipId];
        require(rel.negotiationHistory.length > 0, "No negotiation history");
        NegotiationStep storage latestStep = rel.negotiationHistory[rel.negotiationHistory.length - 1];
        return (latestStep.pricePerUnit, latestStep.endDate, latestStep.requestFrom);
    }
    function getActiveRelationships(address _userAddress) public view returns (uint256[] memory) {
        uint256[] memory tempArray = new uint256[](nextRelationshipId);
        uint256 count = 0;
        for (uint256 i = 1; i < nextRelationshipId; i++) {
            if (relationships[i].exists && 
                (relationships[i].supplier == _userAddress || relationships[i].buyer == _userAddress) &&
                keccak256(bytes(relationships[i].status)) == keccak256(bytes("accepted"))) {
                tempArray[count] = i;
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempArray[i];
        }
        return result;
    }
    function getPendingRelationships(address _userAddress) public view returns (uint256[] memory) {
        uint256[] memory tempArray = new uint256[](nextRelationshipId);
        uint256 count = 0;
        for (uint256 i = 1; i < nextRelationshipId; i++) {
            if (relationships[i].exists && 
                (relationships[i].supplier == _userAddress || relationships[i].buyer == _userAddress) &&
                keccak256(bytes(relationships[i].status)) == keccak256(bytes("pending"))) {
                tempArray[count] = i;
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempArray[i];
        }
        return result;
    }
    function getCompany(address _address) public view returns (Company memory) {
        require(companies[_address].exists, "Company not found");
        return companies[_address];
    }
    function getProduct(uint256 _productId) public view returns (Product memory) {
        require(products[_productId].exists, "Product not found");
        return products[_productId];
    }
    function getRelationship(uint256 _relationshipId) public view returns (Relationship memory) {
        require(relationships[_relationshipId].exists, "Relationship not found");
        return relationships[_relationshipId];
    }
    function getSpotListing(uint256 _listingId) public view returns (SpotListing memory) {
        return spotListings[_listingId];
    }
    function getTransaction(uint256 _transactionId) public view returns (Transaction memory) {
        return transactions[_transactionId];
    }
    function isCompanyRegistered(address _address) public view returns (bool) {
        return companies[_address].exists;
    }
    function getAllCompanies() public view returns (address[] memory) {
        return allCompanies;
    }
    function getProductsByOwner(address _owner) public view returns (uint256[] memory) {
        uint256[] memory tempArray = new uint256[](nextProductId);
        uint256 count = 0;
        for (uint256 i = 1; i < nextProductId; i++) {
            if (products[i].exists && products[i].currentOwner == _owner && products[i].quantity > 0) {
                tempArray[count] = i;
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempArray[i];
        }
        return result;
    }
    function seedTestData() public {
        // Register companies
        companies[0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266] = Company(1, "TechCorp Industries", 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, true);
        companies[0x70997970C51812dc3A010C7d01b50e0d17dc79C8] = Company(2, "ComponentSupplier Ltd", 0x70997970C51812dc3A010C7d01b50e0d17dc79C8, true);
        allCompanies.push(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        allCompanies.push(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        nextCompanyId = 3;
        
        // Create raw materials (owned by ComponentSupplier)
        // Product 1: CPU Chips
        products[1].id = 1;
        products[1].name = "Intel i7 CPU Chip";
        products[1].description = "High-performance Intel i7 processor chip for laptops";
        products[1].imageHash = "bafkreiano33rlaa7dl5ac3rtwtgfxzizsudsxlgsibnkefldssxxksyrqa";
        products[1].quantity = 100;
        products[1].pricePerUnit = 0.3 ether;
        products[1].currentOwner = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        products[1].createdTime = block.timestamp;
        products[1].exists = true;
        products[1].isManufactured = false;
        products[1].originalCreator = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        products[1].ownershipHistory.push(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        
        // Product 2: Motherboards
        products[2].id = 2;
        products[2].name = "Gaming Motherboard";
        products[2].description = "High-end motherboard with DDR5 support and PCIe 5.0";
        products[2].imageHash = "bafkreifvmtu7xmljec6znhqy5xe4j3auqo4dzx7qkqlnpxmcpmgp2aaqfe";
        products[2].quantity = 80;
        products[2].pricePerUnit = 0.2 ether;
        products[2].currentOwner = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        products[2].createdTime = block.timestamp;
        products[2].exists = true;
        products[2].isManufactured = false;
        products[2].originalCreator = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        products[2].ownershipHistory.push(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        
        // Product 3: Keyboards
        products[3].id = 3;
        products[3].name = "Mechanical Keyboard";
        products[3].description = "RGB mechanical keyboard with Cherry MX switches";
        products[3].imageHash = "bafkreifvmtu7xmljec6znhqy5xe4j3auqo4dzx7qkqlnpxmcpmgp2aaqfe";
        products[3].quantity = 150;
        products[3].pricePerUnit = 0.05 ether;
        products[3].currentOwner = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        products[3].createdTime = block.timestamp;
        products[3].exists = true;
        products[3].isManufactured = false;
        products[3].originalCreator = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        products[3].ownershipHistory.push(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        
        // Product 4: Manufactured Laptop (owned by TechCorp, made from components)
        products[4].id = 4;
        products[4].name = "Gaming Laptop Pro";
        products[4].description = "High-end gaming laptop assembled from premium components";
        products[4].imageHash = "bafkreifvmtu7xmljec6znhqy5xe4j3auqo4dzx7qkqlnpxmcpmgp2aaqfe";
        products[4].quantity = 10;
        products[4].pricePerUnit = 1.5 ether;
        products[4].currentOwner = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        products[4].createdTime = block.timestamp;
        products[4].exists = true;
        products[4].isManufactured = true;
        products[4].originalCreator = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        products[4].ownershipHistory.push(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        
        // Add components for the laptop (recipe: 2 chips + 1 motherboard + 1 keyboard = 1 laptop)
        products[4].components.push(ComponentSource({
            productId: 1,
            quantityUsed: 2,
            supplier: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
            timestamp: block.timestamp - 3600
        }));
        products[4].components.push(ComponentSource({
            productId: 2,
            quantityUsed: 1,
            supplier: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
            timestamp: block.timestamp - 3600
        }));
        products[4].components.push(ComponentSource({
            productId: 3,
            quantityUsed: 1,
            supplier: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
            timestamp: block.timestamp - 3600
        }));
        
        nextProductId = 5;
        
        // Create relationships between companies
        relationships[1].id = 1;
        relationships[1].supplier = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        relationships[1].buyer = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        relationships[1].productId = 1; // For CPU chips
        relationships[1].startDate = block.timestamp;
        relationships[1].endDate = block.timestamp + 180 days;
        relationships[1].status = "accepted";
        relationships[1].exists = true;
        relationships[1].negotiationHistory.push(NegotiationStep(1, 0.28 ether, 0x70997970C51812dc3A010C7d01b50e0d17dc79C8, block.timestamp, block.timestamp + 180 days));
        nextRelationshipId = 2;
        
        // Create spot market listings
        spotListings[1] = SpotListing(1, 2, 0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 20, 0.18 ether, block.timestamp, true);
        spotListings[2] = SpotListing(2, 3, 0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 50, 0.045 ether, block.timestamp, true);
        spotListings[3] = SpotListing(3, 4, 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 3, 1.4 ether, block.timestamp, true);
        activeSpotListings.push(1);
        activeSpotListings.push(2);
        activeSpotListings.push(3);
        nextSpotListingId = 4;
    }
    function getContractStats() public view returns (
        uint256 totalCompanies,
        uint256 totalProducts,
        uint256 totalRelationships,
        uint256 totalTransactions,
        uint256 activeListings
    ) {
        return (
            nextCompanyId - 1,
            nextProductId - 1,
            nextRelationshipId - 1,
            nextTransactionId - 1,
            activeSpotListings.length
        );
    }
    function getOrdersByBuyer(address _buyer) public view returns (uint256[] memory) {
        return userOrders[_buyer];
    }
    function getOrdersBySeller(address _seller) public view returns (uint256[] memory) {
        return userOrders[_seller];
    }
    function getPendingOrdersForSeller(address _seller) public view returns (uint256[] memory) {
        uint256[] memory allOrders = userOrders[_seller];
        uint256[] memory tempArray = new uint256[](allOrders.length);
        uint256 count = 0;
        for (uint256 i = 0; i < allOrders.length; i++) {
            if (orders[allOrders[i]].seller == _seller && 
                keccak256(bytes(orders[allOrders[i]].status)) == keccak256(bytes("pending"))) {
                tempArray[count] = allOrders[i];
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempArray[i];
        }
        return result;
    }
    function getApprovedOrdersForBuyer(address _buyer) public view returns (uint256[] memory) {
        uint256[] memory allOrders = userOrders[_buyer];
        uint256[] memory tempArray = new uint256[](allOrders.length);
        uint256 count = 0;
        for (uint256 i = 0; i < allOrders.length; i++) {
            if (orders[allOrders[i]].buyer == _buyer && 
                keccak256(bytes(orders[allOrders[i]].status)) == keccak256(bytes("approved"))) {
                tempArray[count] = allOrders[i];
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempArray[i];
        }
        return result;
    }
    function getApprovedOrdersForSeller(address _seller) public view returns (uint256[] memory) {
        uint256[] memory allOrders = userOrders[_seller];
        uint256[] memory tempArray = new uint256[](allOrders.length);
        uint256 count = 0;
        for (uint256 i = 0; i < allOrders.length; i++) {
            if (orders[allOrders[i]].seller == _seller && 
                keccak256(bytes(orders[allOrders[i]].status)) == keccak256(bytes("approved"))) {
                tempArray[count] = allOrders[i];
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempArray[i];
        }
        return result;
    }
    function getOrdersByStatus(address _user, string memory _status) public view returns (uint256[] memory) {
        uint256[] memory allOrders = userOrders[_user];
        uint256[] memory tempArray = new uint256[](allOrders.length);
        uint256 count = 0;
        for (uint256 i = 0; i < allOrders.length; i++) {
            if (keccak256(bytes(orders[allOrders[i]].status)) == keccak256(bytes(_status))) {
                tempArray[count] = allOrders[i];
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempArray[i];
        }
        return result;
    }
    function completeOrderWithExternalPayment(uint256 _orderId, string memory _paymentMethod, string memory _paymentId) public orderExists(_orderId) {
        Order storage order = orders[_orderId];
        require(order.buyer == msg.sender, "Only buyer can complete payment");
        
        // Check if quality check is completed
        bool qualityCheckCompleted = false;
        for (uint i = 0; i < order.deliveryEvents.length; i++) {
            if (keccak256(bytes(order.deliveryEvents[i].status)) == keccak256(bytes("quality_checked"))) {
                qualityCheckCompleted = true;
                break;
            }
        }
        require(qualityCheckCompleted, "Cannot complete payment before quality check");
        
        // Check if payment not already sent
        for (uint i = 0; i < order.deliveryEvents.length; i++) {
            if (keccak256(bytes(order.deliveryEvents[i].status)) == keccak256(bytes("payment_sent"))) {
                revert("Payment already completed");
            }
        }
        
        // Add payment_sent delivery event
        string memory description = string(abi.encodePacked("Payment completed via ", _paymentMethod, " (ID: ", _paymentId, ")"));
        order.deliveryEvents.push(DeliveryEvent({
            timestamp: block.timestamp,
            status: "payment_sent",
            description: description,
            updatedBy: msg.sender
        }));
        
        // Mark order as completed
        order.status = "completed";
        
        // Create transaction record
        transactions[nextTransactionId] = Transaction({
            id: nextTransactionId,
            buyer: order.buyer,
            seller: order.seller,
            productId: order.productId,
            quantity: order.quantity,
            totalPrice: order.totalPrice,
            transactionType: string(abi.encodePacked(order.orderType, "_", _paymentMethod)),
            timestamp: block.timestamp,
            status: "completed"
        });
        
        userTransactions[order.buyer].push(nextTransactionId);
        userTransactions[order.seller].push(nextTransactionId);
        
        emit DeliveryEventAdded(_orderId, "payment_sent", description, msg.sender);
        emit OrderCompleted(_orderId);
        emit TransactionCreated(nextTransactionId, order.buyer, order.seller, string(abi.encodePacked(order.orderType, "_", _paymentMethod)));
        
        nextTransactionId++;
    }

    function getOrder(uint256 _orderId) public view returns (Order memory) {
        require(orders[_orderId].exists, "Order not found");
        return orders[_orderId];
    }
    function getOrderStats() public view returns (
        uint256 totalOrders,
        uint256 pendingOrders,
        uint256 approvedOrders,
        uint256 completedOrders
    ) {
        uint256 pending = 0;
        uint256 approved = 0;
        uint256 completed = 0;
        for (uint256 i = 1; i < nextOrderId; i++) {
            if (orders[i].exists) {
                if (keccak256(bytes(orders[i].status)) == keccak256(bytes("pending"))) {
                    pending++;
                } else if (keccak256(bytes(orders[i].status)) == keccak256(bytes("approved"))) {
                    approved++;
                } else if (keccak256(bytes(orders[i].status)) == keccak256(bytes("completed"))) {
                    completed++;
                }
            }
        }
        return (nextOrderId - 1, pending, approved, completed);
    }
}
