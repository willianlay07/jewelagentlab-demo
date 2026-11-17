from langgraph.graph import StateGraph, START, END
from app.agents.state import SearchState
from app.agents.nodes import route_node, parse_node, retrieve_node, generate_node

def build_graph():
    builder = StateGraph(SearchState)

    builder.add_node("route", route_node)
    builder.add_node("parse", parse_node)
    builder.add_node("retrieve", retrieve_node)
    builder.add_node("generate", generate_node)
    
    builder.add_edge(START, "route")
    builder.add_edge("route", "parse")
    builder.add_edge("parse", "retrieve")
    builder.add_edge("retrieve", "generate")
    builder.add_edge("generate", END)

    return builder.compile()
