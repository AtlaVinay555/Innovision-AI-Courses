"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ThumbsDown, Check, X, BookOpen, Clock, ArrowRight, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useGeminiRequest } from "@/hooks/useGeminiRequest";

const RecommendedCourses = ({ query = "" }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    const { request } = useGeminiRequest();

    const fetchRecommendations = async (searchQuery = "") => {
        setLoading(true);
        try {
            const apiFn = async () => {
                const url = searchQuery
                    ? `/api/recommendations?query=${encodeURIComponent(searchQuery)}`
                    : "/api/recommendations";
                const response = await fetch(url);
                if (response.status === 429) {
                    const err = new Error("QUOTA_EXCEEDED");
                    err.status = 429;
                    throw err;
                }
                const data = await response.json();
                if (!data.success) throw new Error("Failed");
                return data;
            };
            
            const data = await request(`rec:user:${searchQuery}`, apiFn);
            if (data) {
                setRecommendations(data.recommendations);
                setLastUpdated(data.lastUpdated);
            }
        } catch (error) {
            console.error("Failed to fetch recommendations:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        
        // Initial fetch or fetch on manual refresh
        if (!query) {
            const run = async () => {
                if (cancelled) return;
                await fetchRecommendations();
            };
            run();
        }
        
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!query) return;

        let cancelled = false;
        const timer = setTimeout(() => {
            if (!cancelled) fetchRecommendations(query);
        }, 800); // 800ms debounce

        return () => {
            clearTimeout(timer);
            cancelled = true;
        };
    }, [query]);

    const handleFeedback = async (courseId, feedbackType) => {
        try {
            const response = await fetch("/api/recommendations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseId, feedbackType }),
            });

            if (response.ok) {
                if (feedbackType === "refresh") {
                    toast.success("Recommendations updated!");
                    fetchRecommendations();
                    return;
                }
                toast.success(feedbackType === "not_interested" ? "We'll show you fewer courses like this." : "Got it! We'll update your recommendations.");
                setRecommendations(prev => prev.filter(r => r.id !== courseId));
            }
        } catch (error) {
            toast.error("Failed to update recommendations");
        }
    };

    if (loading) {
        return (
            <div className="w-full space-y-3 mb-8">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-32" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-32 w-full rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4 mb-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 group cursor-default">
                    <div className="bg-blue-500/10 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground/80">Recommended for You</h2>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback(null, "refresh")}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600 rounded-full"
                    title="Refresh recommendations"
                >
                    <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {recommendations.length === 0 ? (
                <div className="p-10 border-2 border-dashed border-blue-500/10 rounded-xl bg-blue-500/5 flex flex-col items-center justify-center text-center">
                    <BookOpen className="h-8 w-8 text-blue-500/20 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Looking for something new?</p>
                    <p className="text-xs text-muted-foreground/60 max-w-50 mt-1">
                        Publish some courses in the library or start a new roadmap to see AI suggestions.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <AnimatePresence>
                        {recommendations.map((course) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card className="group h-full flex flex-col border-blue-500/5 hover:border-blue-500/30 bg-card/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
                                    <div className="p-4 flex flex-col h-full space-y-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <h3 className="text-sm font-bold line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                {course.title}
                                            </h3>
                                            <button
                                                onClick={() => handleFeedback(course.id, "not_interested")}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                                                title="Dismiss"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>

                                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                                            {course.description || (course.isIdea ? "Suggested based on your current path." : "Top choice based on your history.")}
                                        </p>

                                        <div className="flex items-center justify-between pt-1 mt-auto">
                                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/80">
                                                <BookOpen className="h-3 w-3 text-blue-500/50" />
                                                <span>{course.isIdea ? "New Path" : (course.chapterCount || "?") + " Chapters"}</span>
                                            </div>
                                            <Button asChild variant="ghost" className="h-7 text-[10px] px-2 hover:text-blue-600 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link href={course.isIdea ? `/generate?title=${encodeURIComponent(course.title)}&ref=idea` : `/generate?ref=rec&id=${course.id}`}>
                                                    {course.isIdea ? "Generate" : "Pick UP"}
                                                    <ArrowRight className="h-3 w-3" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};


export default RecommendedCourses;
