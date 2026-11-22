from langgraph.graph import StateGraph, START, END

from app.agents.knowledge_state import KnowledgeState

from app.agents.knowledge_nodes import (
    retrieve_knowledge_node,
    generate_knowledge_node,
)

from app.agents.knowledge_intent import (
    intent_router_node,
    direct_response_node,
)


def route_knowledge_intent(
    state: KnowledgeState
) -> str:
    """
    Route document questions to RAG.
    Other intents receive a direct response.
    """

    if state.get("intent") == "document_search":
        return "retrieve"

    return "direct_response"


def build_knowledge_graph():
    builder = StateGraph(KnowledgeState)

    # Register nodes.
    builder.add_node("intent_router", intent_router_node)
    builder.add_node("direct_response", direct_response_node)
    builder.add_node("retrieve", retrieve_knowledge_node)
    builder.add_node("generate", generate_knowledge_node)

    # Start with LLM intent classification.
    builder.add_edge(START, "intent_router")

    # Conditional routing.
    builder.add_conditional_edges(
        "intent_router",
        route_knowledge_intent,
        {
            "retrieve": "retrieve",
            "direct_response": "direct_response",
        },
    )

    # Document RAG workflow.
    builder.add_edge("retrieve", "generate")
    builder.add_edge("generate", END)

    # Greeting / capabilities / out-of-scope workflow.
    builder.add_edge("direct_response", END)

    return builder.compile()
