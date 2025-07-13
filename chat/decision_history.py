from typing import Dict, List
import json
from datetime import datetime

class DecisionHistory:
    def __init__(self):
        self.history: List[Dict] = []
    
    def add_decision(self, user_address: str, product_id: int, decision_data: Dict):
        """Add a decision to history"""
        record = {
            "id": len(self.history) + 1,
            "user_address": user_address,
            "product_id": product_id,
            "timestamp": datetime.now().isoformat(),
            "decision": decision_data["decision"],
            "execution_result": decision_data["execution_result"],
            "status": decision_data["status"]
        }
        self.history.append(record)
    
    def get_user_decisions(self, user_address: str) -> List[Dict]:
        """Get all decisions for a user"""
        return [record for record in self.history if record["user_address"].lower() == user_address.lower()]
    
    def get_decision_analytics(self, user_address: str) -> Dict:
        """Get analytics for user's decisions"""
        user_decisions = self.get_user_decisions(user_address)
        
        if not user_decisions:
            return {"total_decisions": 0}
        
        marketplace_count = sum(1 for d in user_decisions if d["decision"]["action"] == "marketplace")
        relationship_count = sum(1 for d in user_decisions if d["decision"]["action"] == "relationships")
        success_count = sum(1 for d in user_decisions if d["status"] == "success")
        
        return {
            "total_decisions": len(user_decisions),
            "marketplace_decisions": marketplace_count,
            "relationship_decisions": relationship_count,
            "success_rate": success_count / len(user_decisions) if user_decisions else 0,
            "avg_confidence": sum(d["decision"]["confidence"] for d in user_decisions) / len(user_decisions)
        }

# Global instance
decision_history = DecisionHistory()
