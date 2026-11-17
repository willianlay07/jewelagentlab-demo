import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import { login, me } from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                if(sessionStorage.getItem("orro_token")) {
                    const u = await me();

                    if (active) {
                        setUser(u);
                    }
                }
            } catch {
                sessionStorage.removeItem("orro_token");
            } finally {
                if(active) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, []);

    async function signIn(email, password) {
        const data = await login(email, password);

        sessionStorage.setItem(
            "orro_token",
            data.access_token
        );

        try {
            const profile = await me();

            setUser(profile);
            
            return profile;
        } catch(e) {
            sessionStorage.removeItem("orro_token");
            throw e;
        }
    }

    function signOut() {
        sessionStorage.removeItem("orro_token");

        setUser(null);
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                signIn,
                signOut
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);