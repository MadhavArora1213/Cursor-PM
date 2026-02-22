"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInWithGitHub,
    resetPassword,
} from "@/lib/firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Eye as EyeIcon, EyeOff as EyeOffIcon } from "lucide-react";

// Hook for calculating eye tracking
const useEyeTracking = (
    svgRef: React.RefObject<SVGSVGElement | null>,
    cx: number,
    cy: number,
    r: number,
    pupilR: number,
    lookAway: boolean = false
) => {
    const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (lookAway) {
            setPupilOffset({
                x: -(r - pupilR - 1),
                y: 0,
            });
            return;
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (!svgRef.current) return;
            const rect = svgRef.current.getBoundingClientRect();

            // Estimate scale factor of SVG
            const scaleX = 400 / rect.width;
            const scaleY = 500 / rect.height;

            // Mouse position within viewBox
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;

            // Distance and angle to mouse
            const dx = mouseX - cx;
            const dy = mouseY - cy;
            const distance = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);

            // Max movement radius for pupil
            const maxMove = r - pupilR - 1;
            const move = Math.min(distance * 0.1, maxMove);

            setPupilOffset({
                x: Math.cos(angle) * move,
                y: Math.sin(angle) * move,
            });
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [cx, cy, r, pupilR, svgRef, lookAway]);

    return pupilOffset;
};

// Reusable Eye Component
const Eye = ({
    cx,
    cy,
    r,
    pupilR,
    svgRef,
    lookAway = false,
}: {
    cx: number;
    cy: number;
    r: number;
    pupilR: number;
    svgRef: React.RefObject<SVGSVGElement | null>;
    lookAway?: boolean;
}) => {
    const offset = useEyeTracking(svgRef, cx, cy, r, pupilR, lookAway);
    return (
        <g>
            <circle cx={cx} cy={cy} r={r} fill="#FFF" />
            <motion.circle
                cx={cx}
                cy={cy}
                r={pupilR}
                fill="#2A2E33" // Dark grey pupil
                animate={{ x: offset.x, y: offset.y }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
            />
        </g>
    );
};

export function AuthOverlay() {
    const { user, loading, isAuthModalOpen, closeAuthModal } = useAuth();
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [view, setView] = useState<"signin" | "signup" | "forgot">("signin");
    const [resetSent, setResetSent] = useState(false);

    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const svgRef = useRef<SVGSVGElement | null>(null);

    const isSecretMode = isPasswordFocused && !showPassword;

    const handleGoogleSignIn = async () => {
        try {
            setErrorMsg("");
            setIsSigningIn(true);
            await signInWithGoogle();
        } catch (e: any) {
            setErrorMsg(e.message || "Error with Google sign in");
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleGithubSignIn = async () => {
        try {
            setErrorMsg("");
            setIsSigningIn(true);
            await signInWithGitHub();
        } catch (e: any) {
            setErrorMsg(e.message || "Error with GitHub sign in");
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setErrorMsg("");
            setIsSigningIn(true);
            if (view === "signin") {
                await signInWithEmail(email, password);
            } else {
                await signUpWithEmail(email, password);
            }
        } catch (e: any) {
            setErrorMsg(e.message || "Incorrect password or email");
        } finally {
            setIsSigningIn(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setErrorMsg("Please enter your email to reset password");
            return;
        }
        try {
            setErrorMsg("");
            setIsSigningIn(true);
            await resetPassword(email);
            setResetSent(true);
            setErrorMsg("Check your email for a reset link");
        } catch (e: any) {
            setErrorMsg(e.message || "Error sending reset email");
        } finally {
            setIsSigningIn(false);
        }
    };

    if (loading || user || !isAuthModalOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex py-8 px-4 sm:px-8 bg-black/40 backdrop-blur-sm overflow-y-auto"
                onClick={closeAuthModal}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 10, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="relative m-auto w-full max-w-[850px] overflow-hidden rounded-[32px] bg-white shadow-2xl flex flex-col md:flex-row min-h-[550px]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button
                        onClick={closeAuthModal}
                        className="absolute top-6 right-6 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors"
                    >
                        <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    {/* Left Hero Illustration - Uses fixed aspect ratio SVG viewBox */}
                    <div className="hidden md:block shrink-0 w-[420px] bg-[#EAEAEA] relative overflow-hidden rounded-l-[32px] border-r border-[#D9D9D9]">
                        <svg
                            ref={svgRef}
                            viewBox="10 40 380 460"
                            className="absolute inset-0 w-full h-[95%] bottom-0 my-auto"
                            preserveAspectRatio="xMidYMax meet"
                        >
                            <g>
                                {/* ---------- T-Shape Red Monster ---------- */}
                                {/* Back leg */}
                                <path d="M 120 160 L 170 450 L 205 450 L 150 160 Z" fill="#F74868" />
                                {/* Front leg */}
                                <path d="M 170 160 L 230 450 L 265 450 L 200 160 Z" fill="#F74868" />

                                {/* Horizontal Top Pill */}
                                <rect x="40" y="100" width="220" height="60" rx="30" fill="#F74868" />

                                {/* Red Monster Eyes */}
                                <Eye cx={110} cy={85} r={18} pupilR={7} svgRef={svgRef} lookAway={showPassword} />
                                <Eye cx={160} cy={85} r={18} pupilR={7} svgRef={svgRef} lookAway={showPassword} />

                                {/* Red Monster Mouth */}
                                <motion.g
                                    animate={isSecretMode ? "secret" : "normal"}
                                    variants={{
                                        secret: { opacity: 0, scale: 0.8 },
                                        normal: { opacity: 1, scale: 1 },
                                    }}
                                    transition={{ duration: 0.2 }}
                                    style={{ originX: "150px", originY: "130px" }}
                                >
                                    <rect x="50" y="110" width="200" height="40" rx="20" fill="#FFF" />
                                    <line x1="50" y1="130" x2="250" y2="130" stroke="#F74868" strokeWidth="4" />
                                    <line x1="80" y1="110" x2="80" y2="150" stroke="#F74868" strokeWidth="4" />
                                    <line x1="110" y1="110" x2="110" y2="150" stroke="#F74868" strokeWidth="4" />
                                    <line x1="140" y1="110" x2="140" y2="150" stroke="#F74868" strokeWidth="4" />
                                    <line x1="170" y1="110" x2="170" y2="150" stroke="#F74868" strokeWidth="4" />
                                    <line x1="200" y1="110" x2="200" y2="150" stroke="#F74868" strokeWidth="4" />
                                    <line x1="230" y1="110" x2="230" y2="150" stroke="#F74868" strokeWidth="4" />
                                </motion.g>

                                <motion.g
                                    animate={isSecretMode ? "secret" : "normal"}
                                    variants={{
                                        secret: { opacity: 1, scale: 1 },
                                        normal: { opacity: 0, scale: 0.5 },
                                    }}
                                    transition={{ duration: 0.2 }}
                                    style={{ originX: "90px", originY: "130px" }}
                                >
                                    <rect x="65" y="120" width="50" height="20" rx="10" fill="#9A223B" />
                                </motion.g>

                                {/* ---------- Big Pink Monster (Background Right) ---------- */}
                                {/* Big Body Blob */}
                                <path d="M 190 500 L 190 280 C 190 120, 390 120, 390 280 L 390 500 Z" fill="#FFB5C6" />
                                <Eye cx={320} cy={230} r={32} pupilR={12} svgRef={svgRef} lookAway={showPassword} />

                                {/* Pink Monster Mouth */}
                                <motion.g
                                    animate={isSecretMode ? "secret" : "normal"}
                                    variants={{
                                        secret: { opacity: 0, scale: 0.8 },
                                        normal: { opacity: 1, scale: 1 },
                                    }}
                                    transition={{ duration: 0.2 }}
                                    style={{ originX: "280px", originY: "330px" }}
                                >
                                    <path d="M 280 280 C 260 360, 360 360, 360 280 Z" fill="#B96A85" />
                                    <rect x="305" y="280" width="16" height="20" rx="4" fill="#FFF" />
                                </motion.g>

                                <motion.g
                                    animate={isSecretMode ? "secret" : "normal"}
                                    variants={{
                                        secret: { opacity: 1, scale: 1 },
                                        normal: { opacity: 0, scale: 0.5 },
                                    }}
                                    transition={{ duration: 0.2 }}
                                    style={{ originX: "320px", originY: "310px" }}
                                >
                                    <circle cx="320" cy="310" r="10" fill="#B96A85" />
                                </motion.g>

                                {/* ---------- Cyan Fluffy Monster ---------- */}
                                <g fill="#61C5C7">
                                    {/* Fluffy Body Circles */}
                                    <circle cx="95" cy="310" r="45" />
                                    <circle cx="65" cy="310" r="25" />
                                    <circle cx="130" cy="310" r="25" />
                                    <circle cx="80" cy="275" r="30" />
                                    <circle cx="115" cy="275" r="30" />
                                    <circle cx="80" cy="345" r="30" />
                                    <circle cx="115" cy="345" r="30" />
                                    {/* Legs */}
                                    <path d="M 75 350 L 65 480 L 90 480 L 95 350 Z" />
                                    <path d="M 115 350 L 125 480 L 150 480 L 130 350 Z" />
                                </g>
                                <Eye cx={80} cy={295} r={14} pupilR={6} svgRef={svgRef} lookAway={showPassword} />
                                <Eye cx={120} cy={295} r={14} pupilR={6} svgRef={svgRef} lookAway={showPassword} />

                                {/* Cyan Monster Mouth */}
                                <motion.g
                                    animate={isSecretMode ? "secret" : "normal"}
                                    variants={{
                                        secret: { opacity: 0 },
                                        normal: { opacity: 1 },
                                    }}
                                    transition={{ duration: 0.2 }}
                                    style={{ originX: "100px", originY: "325px" }}
                                >
                                    <rect x="85" y="320" width="30" height="10" rx="5" fill="#2A7577" />
                                </motion.g>

                                <motion.g
                                    animate={isSecretMode ? "secret" : "normal"}
                                    variants={{
                                        secret: { opacity: 1 },
                                        normal: { opacity: 0 },
                                    }}
                                    transition={{ duration: 0.2 }}
                                    style={{ originX: "100px", originY: "325px" }}
                                >
                                    <ellipse cx="100" cy="325" rx="6" ry="12" fill="#2A7577" />
                                </motion.g>

                                {/* ---------- Blue Round Monster ---------- */}
                                <g fill="#318DF5">
                                    {/* Legs */}
                                    <rect x="155" y="400" width="20" height="90" rx="5" />
                                    <rect x="195" y="400" width="20" height="90" rx="5" />
                                    {/* Body Circle */}
                                    <circle cx="185" cy="370" r="50" />
                                </g>
                                <Eye cx={170} cy={355} r={16} pupilR={7} svgRef={svgRef} lookAway={showPassword} />
                                <Eye cx={205} cy={355} r={16} pupilR={7} svgRef={svgRef} lookAway={showPassword} />

                                {/* Blue Monster Mouth */}
                                <motion.g
                                    animate={isSecretMode ? "secret" : "normal"}
                                    variants={{
                                        secret: { opacity: 0 },
                                        normal: { opacity: 1 },
                                    }}
                                    transition={{ duration: 0.2 }}
                                    style={{ originX: "187px", originY: "395px" }}
                                >
                                    <circle cx="187" cy="395" r="14" fill="#154B94" />
                                    <rect x="183" y="388" width="8" height="8" rx="2" fill="#FFF" />
                                </motion.g>

                                <motion.g
                                    animate={isSecretMode ? "secret" : "normal"}
                                    variants={{
                                        secret: { opacity: 1 },
                                        normal: { opacity: 0 },
                                    }}
                                    transition={{ duration: 0.2 }}
                                    style={{ originX: "187px", originY: "395px" }}
                                >
                                    <circle cx="187" cy="395" r="6" fill="#154B94" />
                                </motion.g>
                            </g>
                        </svg>
                    </div>

                    {/* Right Interface Side */}
                    <div className="flex-1 bg-white p-8 sm:p-12 md:p-16 flex flex-col justify-center max-w-[450px] w-full mx-auto md:max-w-none">
                        <div className="w-full max-w-[340px] mx-auto flex flex-col">
                            {/* Logo / Crown Icon */}
                            <div className="w-full flex justify-center mb-8">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-[30px] h-[30px] text-[#1A1A1A]">
                                    <path d="M4.8 19.5h14.4c.9 0 1.6-.7 1.6-1.6v-7c0-.8-.7-1.1-1.3-.7l-3.5 2.2-3.2-4.6c-.3-.5-1.1-.5-1.4 0l-3.2 4.6-3.5-2.2c-.6-.4-1.3-.1-1.3.7v7c0 .9.7 1.6 1.6 1.6z" />
                                </svg>
                            </div>

                            <div className="text-center w-full mb-10">
                                <h2 className="text-[26px] font-bold tracking-tight text-[#111] mb-2">
                                    {view === "signin" && "Welcome back!"}
                                    {view === "signup" && "Create an account"}
                                    {view === "forgot" && "Reset Password"}
                                </h2>
                                <p className="text-sm font-medium text-[#7C7C7C]">
                                    {view === "signin" && "Please enter your details"}
                                    {view === "signup" && "Please fill in your details here"}
                                    {view === "forgot" && "Enter your email to receive a reset link"}
                                </p>
                            </div>

                            <form onSubmit={view === "forgot" ? handlePasswordReset : handleEmailAuth} className="w-full space-y-6">
                                <div className="space-y-6">
                                    {/* Email Input */}
                                    <div className="relative group">
                                        <label className="text-[13px] font-bold text-[#333] mb-1 block">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder="Enter your email"
                                            className="w-full border-b-[1.5px] border-[#D1D1D1] bg-transparent pb-2 text-sm text-[#111] font-medium outline-none transition-all focus:border-black placeholder:text-[#A1A1A1] placeholder:font-normal"
                                        />
                                    </div>

                                    {/* Password Input (Hidden in Forgot Mode) */}
                                    {view !== "forgot" && (
                                        <div className="relative group">
                                            <label className="text-[13px] font-bold text-[#333] mb-1 block">
                                                Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    onFocus={() => setIsPasswordFocused(true)}
                                                    onBlur={() => setIsPasswordFocused(false)}
                                                    required
                                                    placeholder="••••••••••"
                                                    className={`w-full border-b-[1.5px] bg-transparent pb-2 pr-8 text-sm text-[#111] font-medium outline-none transition-all focus:border-black placeholder:text-[#A1A1A1] ${errorMsg && isPasswordFocused === false ? 'border-[#F85F6A]' : 'border-[#D1D1D1]'
                                                        }`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-0 top-1/2 -translate-y-1/2 text-[#A1A1A1] hover:text-[#333] transition-colors pb-1"
                                                >
                                                    {showPassword ? (
                                                        <EyeOffIcon className="h-4 w-4" />
                                                    ) : (
                                                        <EyeIcon className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                            {/* Inline Error/Success Message imitating the text in design */}
                                            {(errorMsg || resetSent) && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`text-[12px] font-semibold mt-1.5 absolute ${resetSent ? 'text-emerald-500' : 'text-[#F85F6A]'} `}
                                                >
                                                    {errorMsg}
                                                </motion.p>
                                            )}
                                        </div>
                                    )}
                                    {view === "forgot" && (errorMsg || resetSent) && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`text-[12px] font-semibold mt-1 block ${resetSent && !errorMsg.includes("Error") ? 'text-emerald-500' : 'text-[#F85F6A]'} `}
                                        >
                                            {errorMsg}
                                        </motion.p>
                                    )}
                                </div>

                                {view !== "forgot" && (
                                    <div className="flex items-center justify-between pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className="w-[14px] h-[14px] rounded-[3px] border-[1.5px] border-[#C2C2C2] flex items-center justify-center transition-colors group-hover:border-black group-focus-within:border-black">
                                                <input type="checkbox" className="hidden" />
                                                <svg
                                                    className="w-2.5 h-2.5 text-black hidden group-[&:has(input:checked)]:block"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            </div>
                                            <span className="text-[12px] text-[#7C7C7C] font-semibold select-none group-hover:text-[#333] transition-colors">
                                                Remember me
                                            </span>
                                        </label>

                                        {view === "signin" && (
                                            <button onClick={() => { setView('forgot'); setErrorMsg(""); setResetSent(false) }} type="button" className="text-[12px] text-[#D1D1D1] hover:text-[#7C7C7C] font-semibold transition-colors">
                                                Forgot password?
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSigningIn}
                                        className="w-full rounded-xl bg-black py-3.5 text-sm font-bold text-white transition-all hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {view === "signin" && "Log in"}
                                        {view === "signup" && "Sign up"}
                                        {view === "forgot" && "Send Reset Link"}
                                    </button>

                                    {view !== "forgot" && (
                                        <>
                                            <button
                                                type="button"
                                                disabled={isSigningIn}
                                                onClick={handleGoogleSignIn}
                                                className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-transparent bg-[#F2F2F2] py-3.5 text-sm font-bold text-[#111] transition-all hover:bg-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#A1A1A1] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]">
                                                    <path
                                                        fill="#4285F4"
                                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                    />
                                                    <path
                                                        fill="#34A853"
                                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85C3.99 20.53 7.7 23 12 23z"
                                                    />
                                                    <path
                                                        fill="#FBBC05"
                                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                                                    />
                                                    <path
                                                        fill="#EA4335"
                                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                                                    />
                                                </svg>
                                                {view === "signin" ? "Log in with Google" : "Sign up with Google"}
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isSigningIn}
                                                onClick={handleGithubSignIn}
                                                className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-transparent bg-[#F2F2F2] py-3.5 text-sm font-bold text-[#111] transition-all hover:bg-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#A1A1A1] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]">
                                                    <path
                                                        fill="currentColor"
                                                        d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"
                                                    />
                                                </svg>
                                                {view === "signin" ? "Log in with GitHub" : "Sign up with GitHub"}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </form>

                            <div className="mt-8 text-center">
                                {view !== "forgot" ? (
                                    <p className="text-[12px] font-semibold text-[#A1A1A1]">
                                        {view === "signin"
                                            ? "Don't have an account? "
                                            : "Already have an account? "}
                                        <button
                                            onClick={() => setView(view === "signin" ? "signup" : "signin")}
                                            className="font-bold text-[#111] hover:underline underline-offset-2 transition-colors"
                                        >
                                            {view === "signin" ? "Sign Up" : "Log In"}
                                        </button>
                                    </p>
                                ) : (
                                    <p className="text-[12px] font-semibold text-[#A1A1A1]">
                                        Remembered your password?{" "}
                                        <button
                                            onClick={() => { setView("signin"); setErrorMsg(""); setResetSent(false); }}
                                            className="font-bold text-[#111] hover:underline underline-offset-2 transition-colors"
                                        >
                                            Log in
                                        </button>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
