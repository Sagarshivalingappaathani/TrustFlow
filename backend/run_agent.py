from smart_decision_agent import AutonomousSalesAgent, EthereumInterface, EmailService, GeminiAIService

def main():
    # Initialize services
    blockchain_interface = EthereumInterface(rpc_url="http://localhost:8545", contract_address=None)
    email_service = EmailService(smtp_server="smtp.gmail.com", smtp_port=587)
    gemini_service = GeminiAIService(api_key="AIzaSyDxHZnUEmFxIsq1ZBARfERSsjwSlUKQ_38")
    
    # Initialize the autonomous sales agent
    sales_agent = AutonomousSalesAgent(blockchain_interface, email_service, gemini_service)
    
    # Simulate product creation
    product_data = {
        "id": "P12345",
        "name": "Smartphone X",
        "quantity": 100,
        "cost": 299.99,
        "category": "Electronics"
    }
    
    # Trigger the agent's decision-making process
    result = sales_agent.on_product_created(product_data)
    
    # Print the result
    print("\n🎉 Final Result:")
    print(result)

if __name__ == "__main__":
    main()
