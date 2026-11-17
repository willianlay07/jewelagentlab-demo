import re

# Rules avoid LLM cost for unambiguous requests. Complex requests use a model.
# Define keywords

COMPLEX_TERMS = ("compare", "recommend", "which is best", "better for", "versus", "vs ")
SEMANTIC_TERMS = ("elegant", "minimalist", "classic", "modern", "delicate", "luxury", "similar", "vintage")

def choose_route(
    question: str
) -> str:
    
    q = question.lower()

    if any(term in q for term in COMPLEX_TERMS):
        return "strong"
    
    if any(term in q for term in SEMANTIC_TERMS):
        return "semantic"
    
    # Rule parser handles only explicit categories, prices and attributes.
    if re.search(r"\b(rings?|necklaces?|earrings?|bracelets?|bangles?)\b", q):
        return "rules"
    
    return "small"

# COMPLEX_TERMS → Questions requiring more advanced AI processing.
# SEMANTIC_TERMS → Questions involving meaning, style, or similarity.
# Select semantic search, which uses embeddings to find relevant products.

# rules → Python regex, no LLM parsing.
# semantic → Embedding-based search.
# small → Cheaper LLM.
# strong → More capable LLM.

# Example results
# User question	                Route
# Show rings below $500	        rules
# Compare two diamond rings	    strong
# Recommend a necklace	        strong
# Show elegant rings	        semantic
# Find something for my wife	small