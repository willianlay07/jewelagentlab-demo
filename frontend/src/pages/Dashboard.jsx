import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import {
    PackagePlus,
    Search,
    ClipboardCheck,
    Users
} from "lucide-react";

export default function Dashboard() {
    const { user } = useAuth();

    const cards = [
        [
            "Upload Jewellery",
            "Create a new product draft and analyze its images.",
            "/products/new",
            PackagePlus
        ],
        [
            "AI Product Search",
            "Find approved jewellery using natural language.",
            "/ai-search",
            Search
        ],
        ...(
            user?.role === "admin"
                ? [
                    [
                        "Review Submissions",
                        "Approve or reject staff products.",
                        "/approvals",
                        ClipboardCheck
                    ],
                    [
                        "Manage Staff",
                        "Create and manage staff accounts.",
                        "/staff",
                        Users
                    ]
                ]
                : []
        )
    ];

    return (
        <>
            <h1 className="text-2xl sm:text-3xl font-bold">
                Welcome to Jewel Agent
            </h1>

            <p className="muted mt-2 mb-7">
                Signed in as {user?.full_name || user?.email} · {user?.role}
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {cards.map(([title, desc, url, Icon]) => (
                    <Link
                        to={url}
                        key={url}
                        className="card hover:shadow-md transition"
                    >
                        <Icon
                            className="text-[#b49b77] mb-4"
                            size={28}
                        />

                        <h2 className="font-semibold text-lg">
                            {title}
                        </h2>

                        <p className="muted text-sm mt-1">
                            {desc}
                        </p>
                    </Link>
                ))}
            </div>
        </>
    );
}