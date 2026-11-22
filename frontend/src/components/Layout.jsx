
import { useEffect, useState } from "react";
import {
    NavLink,
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import {
    Gem,
    LayoutDashboard,
    PlusCircle,
    Package,
    ShieldCheck,
    Users,
    Search,
    LogOut,
    Menu,
    X,
    Mail,
    BookOpen,
} from "lucide-react";

// Main navigation
const mainLinks = [
    {
        url: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
    },
    {
        url: "/products/new",
        label: "Upload Product",
        icon: PlusCircle,
    },
    {
        url: "/products",
        label: "Products",
        icon: Package,
    },
];

// AI tools
const aiLinks = [
    {
        url: "/ai-search",
        label: "AI Jewellery Search",
        description: "Find and compare products",
        icon: Search,
    },
    {
        url: "/knowledge",
        label: "AI Document Assistant",
        description: "Ask questions about documents",
        icon: BookOpen,
    },
    {
        url: "/gmail-inbox",
        label: "AI Email Assistant",
        description: "Classify and draft replies",
        icon: Mail,
    },
];

// Admin navigation
const adminLinks = [
    {
        url: "/approvals",
        label: "Approvals",
        icon: ShieldCheck,
    },
    {
        url: "/staff",
        label: "Staff Accounts",
        icon: Users,
    },
];

function SidebarLink({
    url,
    label,
    description,
    icon: Icon,
}) {
    return (
        <NavLink
            to={url}
            end
            className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isActive
                        ? "bg-[#46535e] text-white"
                        : "text-slate-200 hover:bg-[#34424d] hover:text-white"
                }`
            }
        >
            <Icon
                size={19}
                className="shrink-0"
            />

            <div className="min-w-0">
                <div className="text-sm font-medium leading-5">
                    {label}
                </div>

                {description && (
                    <div className="mt-0.5 text-[11px] leading-4 text-slate-400">
                        {description}
                    </div>
                )}
            </div>
        </NavLink>
    );
}

export default function Layout() {
    const { user, signOut } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    const [menuOpen, setMenuOpen] = useState(false);

    const isAdmin = user?.role === "admin";

    // Close mobile sidebar after navigation.
    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    function logout() {
        signOut();
        setMenuOpen(false);
        navigate("/login");
    }

    return (
        <div className="min-h-screen md:flex">
            {/* Mobile Top Bar */}
            <header className="sticky top-0 z-40 flex items-center justify-between bg-[#202b33] px-4 py-3 text-white md:hidden">
                <div className="flex items-center gap-2">
                    <Gem
                        size={25}
                        className="text-[#d4b98b]"
                    />

                    <div>
                        <div className="font-bold tracking-widest">
                            Jewel Agent
                        </div>

                        <div className="text-[10px] text-slate-400">
                            AI SALES ASSISTANT
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    aria-label={
                        menuOpen
                            ? "Close navigation"
                            : "Open navigation"
                    }
                    aria-expanded={menuOpen}
                    aria-controls="jewelagent-sidebar"
                    onClick={() =>
                        setMenuOpen((open) => !open)
                    }
                    className="rounded-lg p-2 hover:bg-[#34424d]"
                >
                    {menuOpen ? (
                        <X size={24} />
                    ) : (
                        <Menu size={24} />
                    )}
                </button>
            </header>

            {/* Mobile Backdrop */}
            {menuOpen && (
                <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={() => setMenuOpen(false)}
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                />
            )}

            {/* Sidebar */}
            <aside
                id="jewelagent-sidebar"
                className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto bg-[#202b33] p-5 text-white transition-transform duration-200 md:sticky md:top-0 md:h-screen md:shrink-0 md:translate-x-0 ${
                    menuOpen
                        ? "translate-x-0"
                        : "-translate-x-full"
                }`}
            >
                {/* Branding */}
                <div className="mb-8 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Gem className="shrink-0 text-[#d4b98b]" />

                        <div>
                            <div className="font-bold tracking-widest">
                                Jewel Agent
                            </div>

                            <div className="text-xs text-slate-400">
                                AI SALES ASSISTANT
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="p-1 md:hidden"
                        aria-label="Close navigation"
                        onClick={() => setMenuOpen(false)}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Navigation */}
                <nav
                    aria-label="Main navigation"
                    className="flex flex-col gap-1"
                >
                    {/* Main Links */}
                    {mainLinks.map((link) => (
                        <SidebarLink
                            key={link.url}
                            {...link}
                        />
                    ))}

                    {/* AI Tools Section */}
                    <div className="mb-1 mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        AI Tools
                    </div>

                    {aiLinks.map((link) => (
                        <SidebarLink
                            key={link.url}
                            {...link}
                        />
                    ))}

                    {/* Admin Section */}
                    {isAdmin && (
                        <>
                            <div className="mb-1 mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                Administration
                            </div>

                            {adminLinks.map((link) => (
                                <SidebarLink
                                    key={link.url}
                                    {...link}
                                />
                            ))}
                        </>
                    )}
                </nav>

                {/* User Profile */}
                <div className="mt-auto border-t border-slate-600 pt-5 text-sm">
                    <div className="truncate font-medium">
                        {user?.full_name || user?.email}
                    </div>

                    <div className="mb-4 capitalize text-slate-400">
                        {user?.role}
                    </div>

                    <button
                        type="button"
                        onClick={logout}
                        className="flex items-center gap-2 text-slate-200 transition-colors hover:text-white"
                    >
                        <LogOut size={16} />
                        Log out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-5 sm:px-6 md:px-8 md:py-9">
                <Outlet />
            </main>
        </div>
    );
}
