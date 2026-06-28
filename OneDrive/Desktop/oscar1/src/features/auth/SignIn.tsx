import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, LogIn } from "lucide-react";
import { useI18nStore } from "@/store/i18nStore";

export function SignIn() {
    const navigate = useNavigate();
    const { signIn } = useAuth();
    const t = useI18nStore((s) => s.t);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await signIn(email, password);
            navigate("/");
        } catch (err: any) {
            setError(err.message || t('signin.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b">
                <div className="container flex h-14 items-center px-4 max-w-2xl mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 transition-colors -ml-2"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="ml-2 font-semibold text-lg">{t('signin.title')}</h1>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-4xl">👑</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">{t('signin.subtitle')}</h2>
                            <p className="text-slate-500 text-sm mt-2">{t('signin.desc')}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1 mb-1.5 block uppercase tracking-wider">
                                    {t('signin.email')}
                                </label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('signin.email_placeholder')}
                                    required
                                    className="h-12 rounded-xl bg-slate-50/50 border-slate-200"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1 mb-1.5 block uppercase tracking-wider">
                                    {t('signin.password')}
                                </label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('signin.password_placeholder')}
                                    required
                                    className="h-12 rounded-xl bg-slate-50/50 border-slate-200"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">
                                    ⚠ {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 rounded-xl text-base font-bold gap-2"
                            >
                                {loading ? (
                                    t('signin.loading')
                                ) : (
                                    <>
                                        <LogIn className="w-4 h-4" />
                                        {t('signin.button')}
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}