import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
    Gem, LayoutDashboard, PlusCircle, Package,
    ShieldCheck, Users, Search, LogOut, Menu, X, Mail
} from "lucide-react";

const links = [
    ["/dashboard", "Dashboard", LayoutDashboard],
    ["/products/new", "Upload Product", PlusCircle],
    ["/products", "Products", Package],
    ["/ai-search", "AI Search", Search],
    ["/gmail-inbox", "Gmail Inbox", Mail],
];

export default function Layout() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    const all = user?.role === "admin"
        ? [
            ...links,
            ["/approvals", "Approvals", ShieldCheck],
            ["/staff", "Staff Accounts", Users]
        ]
        : links;

    function logout() {
        signOut();
        setMenuOpen(false);
        navigate("/login");
    }

    return (
        <div className="min-h-screen md:flex">
            {/* Mobile top bar */}
            <header className="sticky top-0 z-40 flex items-center justify-between bg-[#202b33] px-4 py-3 text-white md:hidden">
                <div className="flex items-center gap-2">
                    <Gem size={25} className="text-[#d4b98b]" />
                    <div>
                        <div className="font-bold tracking-widest">ORRO</div>
                        <div className="text-[10px] text-slate-400">AI SALES ASSISTANT</div>
                    </div>
                </div>
                <button
                    type="button"
                    aria-label={menuOpen ? "Close navigation" : "Open navigation"}
                    aria-expanded={menuOpen}
                    aria-controls="orro-sidebar"
                    onClick={() => setMenuOpen((open) => !open)}
                    className="rounded-lg p-2 hover:bg-[#34424d]"
                >
                    {menuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Backdrop on mobile */}
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
                id="orro-sidebar"
                className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto bg-[#202b33] p-5 text-white transition-transform duration-200 md:sticky md:top-0 md:h-screen md:shrink-0 md:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="mb-9 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Gem className="text-[#d4b98b]" />
                        <div>
                            <div className="font-bold tracking-widest">ORRO</div>
                            <div className="text-xs text-slate-400">AI SALES ASSISTANT</div>
                        </div>
                    </div>
                    <button type="button" className="p-1 md:hidden" aria-label="Close navigation" onClick={() => setMenuOpen(false)}>
                        <X size={22} />
                    </button>
                </div>

                <nav className="flex flex-col gap-1">
                    {all.map(([url, label, Icon]) => (
                        <NavLink
                            key={url}
                            to={url}
                            end
                            className={({ isActive }) =>
                                `flex gap-3 items-center px-3 py-3 rounded-lg text-sm ${
                                    isActive
                                        ? "bg-[#46535e]"
                                        : "hover:bg-[#34424d]"
                                }`
                            }
                        >
                            <Icon size={18} />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className="mt-auto border-t border-slate-600 pt-5 text-sm">
                    <div className="truncate">{user?.full_name || user?.email}</div>
                    <div className="mb-4 capitalize text-slate-400">{user?.role}</div>
                    <button type="button" className="flex items-center gap-2" onClick={logout}>
                        <LogOut size={16} /> Log out
                    </button>
                </div>
            </aside>

            <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-5 sm:px-6 md:px-8 md:py-9">
                <Outlet />
            </main>
        </div>
    );
}
