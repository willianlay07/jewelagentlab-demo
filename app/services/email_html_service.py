import re

import bleach
from bs4 import BeautifulSoup
from bleach.css_sanitizer import CSSSanitizer


ALLOWED_TAGS = [
    "div", "span", "p", "br", "img",
    "table", "thead", "tbody", "tfoot",
    "tr", "td", "th",
    "h1", "h2", "h3", "h4",
    "strong", "b", "em", "i", "u",
    "ul", "ol", "li",
    "blockquote", "hr", "a"
]

ALLOWED_ATTRIBUTES = {
    "*": [
        "class", "style", "align",
        "width", "height", "valign"
    ],
    "a": ["href", "title"],
    "td": ["colspan", "rowspan", "bgcolor"],
    "th": ["colspan", "rowspan", "bgcolor"],
    "img": [
        "data-remote-index",
        "alt", "width", "height",
        "style", "align"
    ]
}

CSS_PROPERTIES = [
    "color", "background-color",
    "font-family", "font-size",
    "font-weight", "font-style",
    "text-align", "text-decoration",
    "line-height", "letter-spacing",
    "width", "max-width", "height",
    "padding", "padding-top", "padding-bottom",
    "padding-left", "padding-right",
    "margin", "margin-top", "margin-bottom",
    "margin-left", "margin-right",
    "border", "border-radius",
    "border-collapse", "vertical-align",
    "display"
]

css_sanitizer = CSSSanitizer(
    allowed_css_properties=CSS_PROPERTIES
)


def sanitize_email_html(
    html: str,
    remote_images=None
) -> str:
    if not html:
        return ""

    remote_images = remote_images or []

    # Match original image URLs to the saved
    # image indices used by the authenticated proxy.
    image_indices = {
        item["url"]: index
        for index, item in enumerate(remote_images)
        if isinstance(item, dict) and item.get("url")
    }

    soup = BeautifulSoup(html, "html.parser")

    # Remove active elements and external resources.
    for tag in soup.find_all([
        "script", "style", "iframe", "object",
        "embed", "form", "input", "button",
        "svg", "meta", "link", "base",
        "video", "audio", "source",
        "picture", "canvas", "template"
    ]):
        tag.decompose()

    # Replace images with safe placeholders.
    for img in soup.find_all("img"):
        src = (img.get("src") or "").strip()
        image_index = image_indices.get(src)

        if image_index is None:
            img.decompose()
            continue

        # Preserve only approved presentation attributes.
        attributes = {}

        for name in (
            "alt", "width", "height",
            "style", "align"
        ):
            if img.has_attr(name):
                attributes[name] = img.get(name)

        img.attrs = attributes
        img["data-remote-index"] = str(image_index)

        # No src, srcset, or remote URL is retained.

    # Remove CSS capable of requesting resources.
    for tag in soup.find_all(True):
        style = tag.get("style")

        if style and re.search(
            r"url\s*\(|@import|expression\s*\(|"
            r"image-set\s*\(|-moz-binding",
            str(style),
            flags=re.IGNORECASE
        ):
            del tag["style"]

    return bleach.clean(
        str(soup),
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=["https", "mailto"],
        css_sanitizer=css_sanitizer,
        strip=True,
        strip_comments=True
    )
