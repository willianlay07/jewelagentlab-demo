import ipaddress
import socket

from urllib.parse import urlsplit

import httpx
from fastapi import HTTPException


MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGES_PER_EMAIL = 30

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp"
}


def validate_remote_url(url: str):
    """
    Validate a remote image URL.

    This is a preliminary SSRF safeguard.
    Production deployments should additionally
    restrict outbound networking.
    """

    if not isinstance(url, str) or len(url) > 2048:
        raise HTTPException(400, "Invalid image URL")

    parsed = urlsplit(url)

    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.port not in (None, 443)
    ):
        raise HTTPException(400, "Unsupported image URL")

    hostname = parsed.hostname.lower()

    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise HTTPException(400, "Local addresses are not allowed")

    try:
        addresses = socket.getaddrinfo(
            hostname,
            443,
            type=socket.SOCK_STREAM
        )
    except socket.gaierror:
        raise HTTPException(400, "Unable to resolve image host")

    if not addresses:
        raise HTTPException(400, "Unable to resolve image host")

    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])

        if not ip.is_global:
            raise HTTPException(400, "Private network addresses are blocked")


def fetch_remote_image(url: str):
    validate_remote_url(url)

    try:
        with httpx.Client(
            follow_redirects=False,
            timeout=httpx.Timeout(10.0),
            trust_env=False
        ) as client:

            with client.stream(
                "GET",
                url,
                headers={
                    "Accept": "image/avif,image/webp,image/png,image/jpeg,image/gif"
                }
            ) as response:

                if response.status_code != 200:
                    raise HTTPException(
                        502,
                        "Remote image unavailable"
                    )

                mime_type = response.headers.get(
                    "content-type", ""
                ).split(";")[0].strip().lower()

                if mime_type not in ALLOWED_MIME_TYPES:
                    raise HTTPException(
                        415,
                        "Unsupported remote image type"
                    )

                chunks = []
                total = 0

                for chunk in response.iter_bytes():
                    total += len(chunk)

                    if total > MAX_IMAGE_BYTES:
                        raise HTTPException(
                            413,
                            "Remote image exceeds 5 MB"
                        )

                    chunks.append(chunk)

                return b"".join(chunks), mime_type

    except httpx.RequestError:
        raise HTTPException(
            502,
            "Unable to fetch remote image"
        )
