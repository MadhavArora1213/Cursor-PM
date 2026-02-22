"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const COLUMNS = 5;

export const InitialLoader = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (sessionStorage.getItem("hasLoadedOnce")) {
            setIsLoading(false);
            return;
        }

        document.body.style.overflow = "hidden";

        let current = 0;
        const interval = setInterval(() => {
            // Exponential-like feeling
            const remaining = 100 - current;
            const step = Math.max(1, Math.floor(remaining * 0.1));
            current += step;

            // Add some organic randomness
            if (Math.random() > 0.5) current += Math.floor(Math.random() * 3);

            if (current >= 100) {
                current = 100;
                clearInterval(interval);
                setTimeout(() => {
                    setIsLoading(false);
                    document.body.style.overflow = "";
                    sessionStorage.setItem("hasLoadedOnce", "true");
                }, 600);
            }
            setCount(current);
        }, 40);

        return () => {
            clearInterval(interval);
            document.body.style.overflow = "";
        };
    }, []);

    if (!isLoading) return null;

    return (
        <AnimatePresence>
            {isLoading && (
                <div className="fixed inset-0 z-[10000] pointer-events-none flex">
                    {/* Sliced Curtain Reveal */}
                    {[...Array(COLUMNS)].map((_, i) => (
                        <motion.div
                            key={`col-${i}`}
                            initial={{ scaleY: 1 }}
                            exit={{
                                scaleY: 0,
                                transition: {
                                    duration: 1.2,
                                    ease: [0.76, 0, 0.24, 1],
                                    delay: i * 0.08
                                }
                            }}
                            className="relative w-full h-full bg-[#050505] border-r border-[#1a1a1a] last:border-r-0 pointer-events-auto origin-top"
                        />
                    ))}

                    {/* Master Content Layer */}
                    <motion.div
                        key="content"
                        exit={{ opacity: 0, transition: { duration: 0.3 } }}
                        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto overflow-hidden"
                    >
                        {/* Absolute Ambient Glow */}
                        <motion.div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        />

                        {/* Giant Typography Centerpiece */}
                        <div className="relative mix-blend-difference z-10 flex">
                            <div className="overflow-hidden">
                                <motion.div
                                    initial={{ y: "100%" }}
                                    animate={{ y: "0%" }}
                                    transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
                                    className="flex items-start"
                                >
                                    <h1 className="text-[35vw] font-black leading-[0.85] tracking-tighter text-white m-0 p-0 text-center">
                                        {count}
                                    </h1>
                                    <span className="text-[8vw] font-black text-purple-500 mt-[2vw] tracking-tighter">%</span>
                                </motion.div>
                            </div>
                        </div>

                        {/* Crosshair / Reticle decorations */}
                        <div className="absolute inset-0 pointer-events-none mix-blend-difference opacity-30">
                            <div className="absolute top-[25%] left-[15%] w-8 h-8 border-t-2 border-l-2 border-white" />
                            <div className="absolute top-[25%] right-[15%] w-8 h-8 border-t-2 border-r-2 border-white" />
                            <div className="absolute bottom-[25%] left-[15%] w-8 h-8 border-b-2 border-l-2 border-white" />
                            <div className="absolute bottom-[25%] right-[15%] w-8 h-8 border-b-2 border-r-2 border-white" />

                            {/* Horizontal line */}
                            <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 1.5, ease: [0.76, 0, 0.24, 1] }}
                                className="absolute top-1/2 left-0 w-full h-px bg-white/20 -translate-y-1/2 origin-center"
                            />
                        </div>

                        {/* Top Bar */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 1 }}
                            className="absolute top-0 left-0 w-full p-8 flex justify-between uppercase tracking-widest text-[10px] md:text-sm font-mono text-zinc-500 max-w-[100vw]"
                        >
                            <div className="flex gap-4 items-center">
                                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                <span className="text-white font-semibold">CURSOR PM</span>
                                <span className="hidden md:inline">V2.0 ALPHA</span>
                            </div>
                            <div>
                                SEQUENCE INIT
                            </div>
                        </motion.div>

                        {/* Bottom Bar */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 1 }}
                            className="absolute bottom-0 left-0 w-full p-8 flex flex-col md:flex-row justify-between items-start md:items-end uppercase tracking-widest text-[10px] md:text-sm font-mono text-zinc-500 gap-6"
                        >
                            <div className="flex gap-12">
                                <div className="flex flex-col gap-1">
                                    <span className="text-white font-semibold">LOCATOR</span>
                                    <span>GLOBAL NETWORK</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-white font-semibold">ASSETS</span>
                                    <span>{Math.floor((count / 100) * 142)} FILES PREPPED</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
                                <div className="flex justify-between w-full md:w-48 text-white font-semibold">
                                    <span>LOADING</span>
                                    <span>{count}%</span>
                                </div>
                                <div className="w-full md:w-48 h-[2px] bg-white/10 relative overflow-hidden">
                                    <motion.div
                                        className="absolute top-0 left-0 h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                                        style={{ width: `${count}%` }}
                                    />
                                </div>
                            </div>
                        </motion.div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
