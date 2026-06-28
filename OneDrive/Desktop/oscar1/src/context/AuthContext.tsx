// import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
// import {
//     signInWithEmailAndPassword,
//     signOut as firebaseSignOut,
//     onAuthStateChanged,
//     type User
// } from "firebase/auth";
// import { auth, db } from "@/lib/firebase";
// import { doc, getDoc } from "firebase/firestore";

// interface AuthUser {
//     uid: string;
//     email?: string;
//     username: string;
//     isVip: boolean;
//     isGuest: boolean;
// }

// interface AuthContextType {
//     user: AuthUser | null;
//     loading: boolean;
//     signIn: (email: string, password: string) => Promise<void>;
//     signOut: () => Promise<void>;
// }

// // const TEST_VIP_USER = {
// //     uid: "test_vip_001",
// //     email: "test@oscar.uz",
// //     username: "test_vip",
// //     password: "test123",
// //     isVip: true,
// //     isGuest: false,
// // };
// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export function AuthProvider({ children }: { children: ReactNode }) {
//     const [user, setUser] = useState<AuthUser | null>(null);
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
//             if (firebaseUser) {
//                 try {
//                     const userDoc = await getDoc(doc(db, "vip_users", firebaseUser.uid));
//                     if (userDoc.exists()) {
//                         setUser({
//                             uid: firebaseUser.uid,
//                             email: firebaseUser.email || "",
//                             username: userDoc.data().username,
//                             isVip: true,
//                             isGuest: false,
//                         });
//                     } else {
//                         setUser({
//                             uid: "guest",
//                             username: "Mehmon",
//                             isVip: false,
//                             isGuest: true,
//                         });
//                     }
//                 } catch (error) {
//                     console.error("User data error:", error);
//                     setUser({
//                         uid: "guest",
//                         username: "Mehmon",
//                         isVip: false,
//                         isGuest: true,
//                     });
//                 }
//             } else {
//                 setUser({
//                     uid: "guest",
//                     username: "Mehmon",
//                     isVip: false,
//                     isGuest: true,
//                 });
//             }
//             setLoading(false);
//         });

//         return () => unsubscribe();
//     }, []);

//     const signIn = async (email: string, password: string) => {
//         const userCredential = await signInWithEmailAndPassword(auth, email, password);
//         const userDoc = await getDoc(doc(db, "vip_users", userCredential.user.uid));

//         if (!userDoc.exists()) {
//             throw new Error("VIP user not found");
//         }

//         setUser({
//             uid: userCredential.user.uid,
//             email: userCredential.user.email || "",
//             username: userDoc.data().username,
//             isVip: true,
//             isGuest: false,
//         });
//     };

//     const signOut = async () => {
//         await firebaseSignOut(auth);
//         setUser({
//             uid: "guest",
//             username: "Mehmon",
//             isVip: false,
//             isGuest: true,
//         });
//     };

//     return (
//         <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
//             {children}
//         </AuthContext.Provider>
//     );
// }

// export function useAuth() {
//     const context = useContext(AuthContext);
//     if (context === undefined) {
//         throw new Error("useAuth must be used within an AuthProvider");
//     }
//     return context;
// }



// ======================================= TEST ===========================================================

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface AuthUser {
    uid: string;
    email?: string;
    username: string;
    isVip: boolean;
    isGuest: boolean;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

// ✅ TEST CREDENTIALS (Firebase yo'q)
const TEST_VIP_USER = {
    uid: "test_vip_001",
    email: "test@oscar.uz",
    username: "test_vip",
    password: "test123",
    isVip: true,
    isGuest: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem("oscar_auth_user");
        if (saved) {
            try {
                setUser(JSON.parse(saved));
            } catch {
                setUser({ uid: "guest", username: "Mehmon", isVip: false, isGuest: true });
            }
        } else {
            setUser({ uid: "guest", username: "Mehmon", isVip: false, isGuest: true });
        }
        setLoading(false);
    }, []);

    const signIn = async (email: string, password: string) => {
        if (email === TEST_VIP_USER.email && password === TEST_VIP_USER.password) {
            const vipUser = {
                uid: TEST_VIP_USER.uid,
                email: TEST_VIP_USER.email,
                username: TEST_VIP_USER.username,
                isVip: true,
                isGuest: false,
            };
            setUser(vipUser);
            localStorage.setItem("oscar_auth_user", JSON.stringify(vipUser));
        } else {
            throw new Error("Email yoki parol noto'g'ri");
        }
    };

    const signOut = async () => {
        localStorage.removeItem("oscar_auth_user");
        setUser({ uid: "guest", username: "Mehmon", isVip: false, isGuest: true });
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}