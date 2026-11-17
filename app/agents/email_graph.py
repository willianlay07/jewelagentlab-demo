from typing import TypedDict, Any
from langgraph.graph import StateGraph, START, END

from app.agents.email_nodes import classify_email_node


class EmailAgentState(TypedDict, total=False):
    subject: str
    body: str
    classification: dict[str, Any]
    model_used: str


def build_email_graph():
    graph = StateGraph(EmailAgentState)

    graph.add_node("classify_email", classify_email_node)

    graph.add_edge(START, "classify_email")
    graph.add_edge("classify_email", END)

    return graph.compile()


email_graph = build_email_graph()
