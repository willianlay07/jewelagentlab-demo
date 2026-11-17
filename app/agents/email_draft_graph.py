from typing import TypedDict, Any

from langgraph.graph import StateGraph, START, END

from app.agents.email_draft_nodes import (
    analyze_email_attachments,
    retrieve_email_products,
    generate_email_reply,
)


class EmailDraftState(TypedDict, total=False):
    message_id: int
    subject: str
    body: str
    classification: dict[str, Any]

    attachment_findings: list[dict]
    attachments_require_review: bool

    products: list[dict]

    draft_subject: str
    draft_body: str
    model_used: str | None


def build_email_draft_graph():
    graph = StateGraph(EmailDraftState)

    graph.add_node(
        "analyze_attachments",
        analyze_email_attachments
    )

    graph.add_node(
        "retrieve_products",
        retrieve_email_products
    )

    graph.add_node(
        "generate_reply",
        generate_email_reply
    )

    graph.add_edge(
        START,
        "analyze_attachments"
    )

    graph.add_edge(
        "analyze_attachments",
        "retrieve_products"
    )

    graph.add_edge(
        "retrieve_products",
        "generate_reply"
    )

    graph.add_edge(
        "generate_reply",
        END
    )

    return graph.compile()


email_draft_graph = build_email_draft_graph()
