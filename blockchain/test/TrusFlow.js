const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TrustFlow", function () {
  let TrustFlow;
  let trustFlow;
  let owner;
  let supplier;
  let buyer;
  let otherAccount;

  beforeEach(async function () {
    // Get signers
    [owner, supplier, buyer, otherAccount] = await ethers.getSigners();

    // Deploy the contract
    TrustFlow = await ethers.getContractFactory("TrustFlow");
    trustFlow = await TrustFlow.deploy();
    await trustFlow.waitForDeployment();
  });

  describe("Company Registration", function () {
    it("Should register a company successfully", async function () {
      await trustFlow.connect(supplier).registerCompany("Supplier Inc", supplier.address);
      
      const company = await trustFlow.getCompany(supplier.address);
      expect(company.name).to.equal("Supplier Inc");
      expect(company.companyAddress).to.equal(supplier.address);
      expect(company.exists).to.be.true;
    });

    it("Should fail to register with empty name", async function () {
      await expect(
        trustFlow.connect(supplier).registerCompany("", supplier.address)
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should fail to register twice", async function () {
      await trustFlow.connect(supplier).registerCompany("Supplier Inc", supplier.address);
      
      await expect(
        trustFlow.connect(supplier).registerCompany("Supplier Inc 2", supplier.address)
      ).to.be.revertedWith("Company already registered");
    });

    it("Should update company details", async function () {
      await trustFlow.connect(supplier).registerCompany("Supplier Inc", supplier.address);
      
      await trustFlow.connect(supplier).updateCompanyDetails("New Supplier Inc", supplier.address);
      
      const company = await trustFlow.getCompany(supplier.address);
      expect(company.name).to.equal("New Supplier Inc");
    });

    it("Should fail to update if not registered", async function () {
      await expect(
        trustFlow.connect(supplier).updateCompanyDetails("New Name", supplier.address)
      ).to.be.revertedWith("Company not registered");
    });
  });

  describe("Product Management", function () {
    beforeEach(async function () {
      // Register supplier
      await trustFlow.connect(supplier).registerCompany("Supplier Inc", supplier.address);
    });

    it("Should create a product successfully", async function () {
      await trustFlow.connect(supplier).createProduct("Laptop", 100, ethers.parseEther("1"));
      
      const product = await trustFlow.getProduct(1);
      expect(product.name).to.equal("Laptop");
      expect(product.quantity).to.equal(100);
      expect(product.pricePerUnit).to.equal(ethers.parseEther("1"));
      expect(product.currentOwner).to.equal(supplier.address);
      expect(product.exists).to.be.true;
      
      const history = await trustFlow.getProductTraceability(1);
      expect(history).to.deep.equal([supplier.address]);
    });

    it("Should fail to create product with empty name", async function () {
      await expect(
        trustFlow.connect(supplier).createProduct("", 100, ethers.parseEther("1"))
      ).to.be.revertedWith("Product name cannot be empty");
    });

    it("Should fail to create product with zero quantity", async function () {
      await expect(
        trustFlow.connect(supplier).createProduct("Laptop", 0, ethers.parseEther("1"))
      ).to.be.revertedWith("Quantity must be greater than 0");
    });

    it("Should transfer product successfully", async function () {
      // Register buyer
      await trustFlow.connect(buyer).registerCompany("Buyer Corp", buyer.address);
      
      // Create product
      await trustFlow.connect(supplier).createProduct("Laptop", 100, ethers.parseEther("1"));
      
      // Transfer full product
      await trustFlow.connect(supplier).transferProduct(1, buyer.address, 100);
      
      const product = await trustFlow.getProduct(1);
      expect(product.currentOwner).to.equal(buyer.address);
      expect(product.quantity).to.equal(0);
      
      const history = await trustFlow.getProductTraceability(1);
      expect(history).to.deep.equal([supplier.address, buyer.address]);
    });

    it("Should transfer partial product successfully", async function () {
      // Register buyer
      await trustFlow.connect(buyer).registerCompany("Buyer Corp", buyer.address);
      
      // Create product
      await trustFlow.connect(supplier).createProduct("Laptop", 100, ethers.parseEther("1"));
      
      // Transfer partial product
      await trustFlow.connect(supplier).transferProduct(1, buyer.address, 30);
      
      const originalProduct = await trustFlow.getProduct(1);
      expect(originalProduct.currentOwner).to.equal(supplier.address);
      expect(originalProduct.quantity).to.equal(70);
      
      const newProduct = await trustFlow.getProduct(2);
      expect(newProduct.currentOwner).to.equal(buyer.address);
      expect(newProduct.quantity).to.equal(30);
      
      const newHistory = await trustFlow.getProductTraceability(2);
      expect(newHistory).to.deep.equal([supplier.address, buyer.address]);
    });

    it("Should fail to transfer if not owner", async function () {
      await trustFlow.connect(buyer).registerCompany("Buyer Corp", buyer.address);
      await trustFlow.connect(supplier).createProduct("Laptop", 100, ethers.parseEther("1"));
      
      await expect(
        trustFlow.connect(buyer).transferProduct(1, buyer.address, 50)
      ).to.be.revertedWith("Not product owner");
    });

    it("Should fail to transfer to unregistered company", async function () {
      await trustFlow.connect(supplier).createProduct("Laptop", 100, ethers.parseEther("1"));
      
      await expect(
        trustFlow.connect(supplier).transferProduct(1, buyer.address, 50)
      ).to.be.revertedWith("New owner not registered");
    });
  });

  describe("Relationship Management", function () {
    beforeEach(async function () {
      // Register companies
      await trustFlow.connect(supplier).registerCompany("Supplier Inc", supplier.address);
      await trustFlow.connect(buyer).registerCompany("Buyer Corp", buyer.address);
      
      // Create product
      await trustFlow.connect(supplier).createProduct("Laptop", 100, ethers.parseEther("1"));
    });

    it("Should request relationship successfully", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const startDate = currentTime + 86400; // 1 day from now
      const endDate = currentTime + 86400 * 30; // 30 days from now
      
      await trustFlow.connect(buyer).requestRelationship(
        supplier.address,
        buyer.address,
        1,
        ethers.parseEther("0.9"),
        startDate,
        endDate
      );
      
      const relationship = await trustFlow.getRelationship(1);
      expect(relationship.supplier).to.equal(supplier.address);
      expect(relationship.buyer).to.equal(buyer.address);
      expect(relationship.productId).to.equal(1);
      expect(relationship.status).to.equal("pending");
      expect(relationship.exists).to.be.true;
      
      const history = await trustFlow.getNegotiationHistory(1);
      expect(history.length).to.equal(1);
      expect(history[0].pricePerUnit).to.equal(ethers.parseEther("0.9"));
      expect(history[0].requestFrom).to.equal(buyer.address);
    });

    it("Should negotiate relationship successfully", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const startDate = currentTime + 86400;
      const endDate = currentTime + 86400 * 30;
      
      // Request relationship
      await trustFlow.connect(buyer).requestRelationship(
        supplier.address,
        buyer.address,
        1,
        ethers.parseEther("0.9"),
        startDate,
        endDate
      );
      
      // Supplier negotiates
      await trustFlow.connect(supplier).negotiateRelationship(
        1,
        ethers.parseEther("0.95"),
        endDate
      );
      
      const history = await trustFlow.getNegotiationHistory(1);
      expect(history.length).to.equal(2);
      expect(history[1].pricePerUnit).to.equal(ethers.parseEther("0.95"));
      expect(history[1].requestFrom).to.equal(supplier.address);
      expect(history[1].step).to.equal(2);
    });

    it("Should accept relationship successfully", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const startDate = currentTime + 86400;
      const endDate = currentTime + 86400 * 30;
      
      await trustFlow.connect(buyer).requestRelationship(
        supplier.address,
        buyer.address,
        1,
        ethers.parseEther("0.9"),
        startDate,
        endDate
      );
      
      await trustFlow.connect(supplier).acceptRelationship(1);
      
      const relationship = await trustFlow.getRelationship(1);
      expect(relationship.status).to.equal("accepted");
    });

    it("Should reject relationship successfully", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const startDate = currentTime + 86400;
      const endDate = currentTime + 86400 * 30;
      
      await trustFlow.connect(buyer).requestRelationship(
        supplier.address,
        buyer.address,
        1,
        ethers.parseEther("0.9"),
        startDate,
        endDate
      );
      
      await trustFlow.connect(supplier).rejectRelationship(1);
      
      const relationship = await trustFlow.getRelationship(1);
      expect(relationship.status).to.equal("rejected");
    });

    it("Should fail to negotiate non-existent relationship", async function () {
      await expect(
        trustFlow.connect(supplier).negotiateRelationship(
          999,
          ethers.parseEther("0.95"),
          Math.floor(Date.now() / 1000) + 86400 * 30
        )
      ).to.be.revertedWith("Relationship does not exist");
    });

    it("Should fail to negotiate if not a party", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const startDate = currentTime + 86400;
      const endDate = currentTime + 86400 * 30;
      
      await trustFlow.connect(buyer).requestRelationship(
        supplier.address,
        buyer.address,
        1,
        ethers.parseEther("0.9"),
        startDate,
        endDate
      );
      
      await expect(
        trustFlow.connect(otherAccount).negotiateRelationship(
          1,
          ethers.parseEther("0.95"),
          endDate
        )
      ).to.be.revertedWith("Not a party to this relationship");
    });
  });

  describe("Relationship Orders", function () {
    beforeEach(async function () {
      // Register companies
      await trustFlow.connect(supplier).registerCompany("Supplier Inc", supplier.address);
      await trustFlow.connect(buyer).registerCompany("Buyer Corp", buyer.address);
      
      // Create product
      await trustFlow.connect(supplier).createProduct("Laptop", 100, ethers.parseEther("1"));
      
      // Create and accept relationship
      const latestBlock = await ethers.provider.getBlock('latest');
      const currentTime = latestBlock.timestamp;
      const startDate = currentTime; // Starts now
      const endDate = currentTime + 86400 * 30; // Ends in 30 days
      
      await trustFlow.connect(buyer).requestRelationship(
        supplier.address,
        buyer.address,
        1,
        ethers.parseEther("0.9"),
        startDate,
        endDate
      );
      
      await trustFlow.connect(supplier).acceptRelationship(1);
    });

    it("Should place relationship order successfully", async function () {
      // Relationship should be active immediately
      
      await trustFlow.connect(buyer).placeRelationshipOrder(1, 10);
      
      const transaction = await trustFlow.getTransaction(1);
      expect(transaction.buyer).to.equal(buyer.address);
      expect(transaction.seller).to.equal(supplier.address);
      expect(transaction.quantity).to.equal(10);
      expect(transaction.totalPrice).to.equal(ethers.parseEther("9")); // 10 * 0.9
      expect(transaction.transactionType).to.equal("relationship");
      expect(transaction.status).to.equal("completed");
    });

    it("Should fail to place order if relationship not accepted", async function () {
      // Create new pending relationship
      const currentTime = Math.floor(Date.now() / 1000);
      
      await trustFlow.connect(buyer).requestRelationship(
        supplier.address,
        buyer.address,
        1,
        ethers.parseEther("0.8"),
        currentTime + 86400,
        currentTime + 86400 * 30
      );
      
      await expect(
        trustFlow.connect(buyer).placeRelationshipOrder(2, 10)
      ).to.be.revertedWith("Relationship not accepted");
    });

    it("Should fail to place order if not buyer", async function () {
      await expect(
        trustFlow.connect(supplier).placeRelationshipOrder(1, 10)
      ).to.be.revertedWith("Only buyer can place orders");
    });
  });

  describe("Spot Marketplace", function () {
    beforeEach(async function () {
      // Register companies
      await trustFlow.connect(supplier).registerCompany("Supplier Inc", supplier.address);
      await trustFlow.connect(buyer).registerCompany("Buyer Corp", buyer.address);
      
      // Create product
      await trustFlow.connect(supplier).createProduct("Laptop", 100, ethers.parseEther("1"));
    });

    it("Should list product for sale successfully", async function () {
      await trustFlow.connect(supplier).listProductForSale(1, 50, ethers.parseEther("1.1"));
      
      const listing = await trustFlow.getSpotListing(1);
      expect(listing.productId).to.equal(1);
      expect(listing.seller).to.equal(supplier.address);
      expect(listing.quantityAvailable).to.equal(50);
      expect(listing.pricePerUnit).to.equal(ethers.parseEther("1.1"));
      expect(listing.isActive).to.be.true;
      
      const activeListings = await trustFlow.viewAllActiveListings();
      expect(activeListings).to.deep.equal([1n]);
    });

    it("Should buy from spot market successfully", async function () {
      // List product
      await trustFlow.connect(supplier).listProductForSale(1, 50, ethers.parseEther("1.1"));
      
      // Buy from spot market
      const buyQuantity = 20;
      const totalPrice = ethers.parseEther("22"); // 20 * 1.1
      
      const supplierBalanceBefore = await ethers.provider.getBalance(supplier.address);
      
      await trustFlow.connect(buyer).buyFromSpotMarket(1, buyQuantity, {
        value: totalPrice
      });
      
      const supplierBalanceAfter = await ethers.provider.getBalance(supplier.address);
      expect(supplierBalanceAfter - supplierBalanceBefore).to.equal(totalPrice);
      
      // Check listing updated
      const listing = await trustFlow.getSpotListing(1);
      expect(listing.quantityAvailable).to.equal(30);
      expect(listing.isActive).to.be.true;
      
      // Check transaction created
      const transaction = await trustFlow.getTransaction(1);
      expect(transaction.buyer).to.equal(buyer.address);
      expect(transaction.seller).to.equal(supplier.address);
      expect(transaction.quantity).to.equal(buyQuantity);
      expect(transaction.totalPrice).to.equal(totalPrice);
      expect(transaction.transactionType).to.equal("spot");
      
      // Check product was transferred (new product created)
      const newProduct = await trustFlow.getProduct(2);
      expect(newProduct.currentOwner).to.equal(buyer.address);
      expect(newProduct.quantity).to.equal(buyQuantity);
    });

    it("Should remove listing when fully sold", async function () {
      await trustFlow.connect(supplier).listProductForSale(1, 20, ethers.parseEther("1.1"));
      
      // Buy entire quantity
      await trustFlow.connect(buyer).buyFromSpotMarket(1, 20, {
        value: ethers.parseEther("22")
      });
      
      const listing = await trustFlow.getSpotListing(1);
      expect(listing.isActive).to.be.false;
      expect(listing.quantityAvailable).to.equal(0);
      
      const activeListings = await trustFlow.viewAllActiveListings();
      expect(activeListings.length).to.equal(0);
    });

    it("Should remove spot listing successfully", async function () {
      await trustFlow.connect(supplier).listProductForSale(1, 50, ethers.parseEther("1.1"));
      
      await trustFlow.connect(supplier).removeSpotListing(1);
      
      const listing = await trustFlow.getSpotListing(1);
      expect(listing.isActive).to.be.false;
      
      const activeListings = await trustFlow.viewAllActiveListings();
      expect(activeListings.length).to.equal(0);
    });

    it("Should fail to buy from inactive listing", async function () {
      await trustFlow.connect(supplier).listProductForSale(1, 50, ethers.parseEther("1.1"));
      await trustFlow.connect(supplier).removeSpotListing(1);
      
      await expect(
        trustFlow.connect(buyer).buyFromSpotMarket(1, 10, {
          value: ethers.parseEther("11")
        })
      ).to.be.revertedWith("Listing not active");
    });

    it("Should fail to buy with insufficient payment", async function () {
      await trustFlow.connect(supplier).listProductForSale(1, 50, ethers.parseEther("1.1"));
      
      await expect(
        trustFlow.connect(buyer).buyFromSpotMarket(1, 10, {
          value: ethers.parseEther("10") // Should be 11
        })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should refund excess payment", async function () {
      await trustFlow.connect(supplier).listProductForSale(1, 50, ethers.parseEther("1.1"));
      
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
      
      const tx = await trustFlow.connect(buyer).buyFromSpotMarket(1, 10, {
        value: ethers.parseEther("15") // Overpayment
      });
      
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * (receipt.gasPrice || receipt.effectiveGasPrice);
      
      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      const expectedBalance = buyerBalanceBefore - ethers.parseEther("11") - gasUsed;
      
      // Allow for small differences due to gas estimation
      const difference = buyerBalanceAfter > expectedBalance ? 
        buyerBalanceAfter - expectedBalance : expectedBalance - buyerBalanceAfter;
      expect(difference).to.be.lessThan(ethers.parseEther("0.001"));
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      // Register companies
      await trustFlow.connect(supplier).registerCompany("Supplier Inc", supplier.address);
      await trustFlow.connect(buyer).registerCompany("Buyer Corp", buyer.address);
      
      // Create products
      await trustFlow.connect(supplier).createProduct("Laptop", 100, ethers.parseEther("1"));
      await trustFlow.connect(supplier).createProduct("Mouse", 200, ethers.parseEther("0.1"));
    });

    it("Should get transaction history", async function () {
      // Create and accept relationship
      const latestBlock = await ethers.provider.getBlock('latest');
      const currentTime = latestBlock.timestamp;
      await trustFlow.connect(buyer).requestRelationship(
        supplier.address,
        buyer.address,
        1,
        ethers.parseEther("0.9"),
        currentTime,
        currentTime + 86400 * 30
      );
      await trustFlow.connect(supplier).acceptRelationship(1);
      
      // Place order
      await trustFlow.connect(buyer).placeRelationshipOrder(1, 10);
      
      const buyerTransactions = await trustFlow.getTransactionHistory(buyer.address);
      const supplierTransactions = await trustFlow.getTransactionHistory(supplier.address);
      
      expect(buyerTransactions).to.deep.equal([1n]);
      expect(supplierTransactions).to.deep.equal([1n]);
    });

    it("Should get products by owner", async function () {
      const products = await trustFlow.getProductsByOwner(supplier.address);
      expect(products).to.deep.equal([1n, 2n]);
    });

    it("Should get active relationships", async function () {
      const latestBlock = await ethers.provider.getBlock('latest');
      const currentTime = latestBlock.timestamp;
      
      // Create and accept relationship
      await trustFlow.connect(buyer).requestRelationship(
        supplier.address,
        buyer.address,
        1,
        ethers.parseEther("0.9"),
        currentTime,
        currentTime + 86400 * 30
      );
      await trustFlow.connect(supplier).acceptRelationship(1);
      
      const buyerActive = await trustFlow.getActiveRelationships(buyer.address);
      const supplierActive = await trustFlow.getActiveRelationships(supplier.address);
      
      expect(buyerActive).to.deep.equal([1n]);
      expect(supplierActive).to.deep.equal([1n]);
    });

    it("Should get pending relationships", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Create pending relationship
      await trustFlow.connect(buyer).requestRelationship(
        supplier.address,
        buyer.address,
        1,
        ethers.parseEther("0.9"),
        currentTime + 86400,
        currentTime + 86400 * 30
      );
      
      const buyerPending = await trustFlow.getPendingRelationships(buyer.address);
      const supplierPending = await trustFlow.getPendingRelationships(supplier.address);
      
      expect(buyerPending).to.deep.equal([1n]);
      expect(supplierPending).to.deep.equal([1n]);
    });

    it("Should get contract stats", async function () {
      const stats = await trustFlow.getContractStats();
      
      expect(stats.totalCompanies).to.equal(2);
      expect(stats.totalProducts).to.equal(2);
      expect(stats.totalRelationships).to.equal(0);
      expect(stats.totalTransactions).to.equal(0);
      expect(stats.activeListings).to.equal(0);
    });

    it("Should check if company is registered", async function () {
      expect(await trustFlow.isCompanyRegistered(supplier.address)).to.be.true;
      expect(await trustFlow.isCompanyRegistered(otherAccount.address)).to.be.false;
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should fail to get non-existent company", async function () {
      await expect(
        trustFlow.getCompany(supplier.address)
      ).to.be.revertedWith("Company not found");
    });

    it("Should fail to get non-existent product", async function () {
      await expect(
        trustFlow.getProduct(999)
      ).to.be.revertedWith("Product not found");
    });

    it("Should fail to get non-existent relationship", async function () {
      await expect(
        trustFlow.getRelationship(999)
      ).to.be.revertedWith("Relationship not found");
    });

    it("Should fail to get traceability of non-existent product", async function () {
      await expect(
        trustFlow.getProductTraceability(999)
      ).to.be.revertedWith("Product does not exist");
    });

    it("Should fail operations without company registration", async function () {
      await expect(
        trustFlow.connect(supplier).createProduct("Laptop", 100, ethers.parseEther("1"))
      ).to.be.revertedWith("Company not registered");
      
      // First register company and create product to test listing failure
      await trustFlow.connect(buyer).registerCompany("Buyer Corp", buyer.address);
      await trustFlow.connect(buyer).createProduct("Mouse", 50, ethers.parseEther("0.5"));
      
      await expect(
        trustFlow.connect(supplier).listProductForSale(999, 50, ethers.parseEther("1.1"))
      ).to.be.revertedWith("Company not registered");
    });
  });
});
