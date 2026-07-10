from langgraph.graph import StateGraph, END
from .state import HealingState
from .nodes import (intake_node, diagnosis_node, fix_node, 
                    verify_node, deploy_node, escalate_node,
                    should_attempt_fix, should_retry_or_deploy)

def build_healing_graph():
    graph = StateGraph(HealingState)
    
    # Add nodes
    graph.add_node("intake", intake_node)
    graph.add_node("diagnosis", diagnosis_node)
    graph.add_node("fix", fix_node)
    graph.add_node("verify", verify_node)
    graph.add_node("deploy", deploy_node)
    graph.add_node("escalate", escalate_node)
    
    # Set entry point
    graph.set_entry_point("intake")
    
    # Add edges
    graph.add_edge("intake", "diagnosis")
    
    # Conditional: after diagnosis, fix or escalate (or deploy if bug_free)
    graph.add_conditional_edges(
        "diagnosis",
        should_attempt_fix,
        {
            "fix": "fix",
            "escalate": "escalate",
            "deploy": "deploy"
        }
    )
    
    # Fix always goes to verify
    graph.add_edge("fix", "verify")
    
    # Conditional: after verify, retry fix, deploy, or escalate
    graph.add_conditional_edges(
        "verify",
        should_retry_or_deploy,
        {
            "fix": "fix",
            "deploy": "deploy",
            "escalate": "escalate"
        }
    )
    
    # Terminal nodes
    graph.add_edge("deploy", END)
    graph.add_edge("escalate", END)
    
    return graph.compile()

# Create the graph instance
healing_graph = build_healing_graph()
