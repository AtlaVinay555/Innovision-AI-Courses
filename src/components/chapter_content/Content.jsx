"use client";

import React, { useState } from 'react';
import MarkDown from "../MarkDown";
import { Clock, Wand2, Loader2 } from "lucide-react";
import MermaidDiagram from "./MermaidDiagram";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useGeminiRequest } from "@/hooks/useGeminiRequest";
import { useDebounce } from "@/hooks/useDebounce";
import { getCached } from "@/lib/gemini/cacheCore";

// Calculate reading time for a single topic
const calculateTopicReadingTime = (topic) => {
    if (!topic || !topic.content) return 1;

    let text = topic.title || "";
    
    let normalizedContent = [];
    if (Array.isArray(topic.content)) {
        normalizedContent = topic.content;
    } else if (typeof topic.content === "string") {
        normalizedContent = [{ type: "para", content: topic.content }];
    } else if (topic.content && typeof topic.content === "object") {
        normalizedContent = [topic.content];
    }

    normalizedContent.forEach(item => {
        if (typeof item === "string") {
            text += " " + item;
        } else if (item && typeof item.content === "string") {
            text += " " + item.content;
        } else if (item && Array.isArray(item.content)) {
            text += " " + item.content.join(" ");
        }
    });

    // Remove HTML tags and count words
    const cleanText = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    const wordCount = cleanText.split(" ").filter(word => word.length > 0).length;

    // 200 words per minute
    return Math.max(1, Math.ceil(wordCount / 200));
};

const Content = ({ currentTopic }) => {
    const readingTime = calculateTopicReadingTime(currentTopic);
    const [dynamicDiagram, setDynamicDiagram] = useState(null);
    const { request, loading: isGenerating } = useGeminiRequest();

    // Load from memory cache instantly when topic changes
    React.useEffect(() => {
        setDynamicDiagram(null);
        if (currentTopic?.title) {
            const cached = getCached(`diagram:${currentTopic.title}`);
            if (cached && cached.type === 'mermaid' && cached.content) {
                setDynamicDiagram(cached.content);
            }
        }
    }, [currentTopic?.title]);

    const fetchDiagram = async () => {
        const response = await fetch('/api/diagram/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topicContext: currentTopic })
        });

        if (response.status === 429) {
            const errorData = await response.json().catch(() => ({}));
            const err = new Error(errorData.message || "QUOTA_EXCEEDED");
            err.status = 429;
            throw err;
        }

        if (!response.ok) {
            throw new Error('Failed to generate diagram');
        }

        return await response.json();
    };

    const handleGenerateDiagram = async () => {
        if (isGenerating) return;

        // Prevent duplicate generation if we already have it rendered
        if (dynamicDiagram) {
            toast.info("Diagram already generated for this topic.");
            return;
        }
        
        try {
            const data = await request(`diagram:${currentTopic.title}`, fetchDiagram);
            
            if (data.type === 'none') {
                toast.info("AI determined this topic doesn't need a structural diagram.");
            } else if (data.type === 'mermaid' && data.content) {
                setDynamicDiagram(data.content);
                toast.success("Diagram generated successfully!");
            }
        } catch (error) {
            console.error("Error generating diagram:", error);
            if (error.status === 429 || error.message?.includes("QUOTA_EXCEEDED")) {
                toast.error("Diagram generation temporarily unavailable due to quota limits. Please wait.");
            } else {
                toast.error("Failed to generate diagram. Please try again.");
            }
        }
    };

    const debouncedGenerate = useDebounce(handleGenerateDiagram, 500);

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold">{currentTopic.title}</h2>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={debouncedGenerate}
                        disabled={isGenerating || !!dynamicDiagram}
                    >
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-blue-500" />}
                        <span className="hidden sm:inline">
                            {isGenerating ? "Generating..." : dynamicDiagram ? "Generated" : "Generate Diagram"}
                        </span>
                    </Button>
                    <div className="flex items-center gap-1.5 text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">
                            {readingTime} min read
                        </span>
                    </div>
                </div>
            </div>
            <div className="text-lg">
                {(() => {
                    let normalizedContent = [];
                    if (Array.isArray(currentTopic.content)) {
                        normalizedContent = currentTopic.content;
                    } else if (typeof currentTopic.content === "string") {
                        normalizedContent = [{ type: "para", content: currentTopic.content }];
                    } else if (currentTopic.content && typeof currentTopic.content === "object") {
                        normalizedContent = [currentTopic.content];
                    } else {
                        normalizedContent = [{ type: "para", content: "No content available for this topic yet." }];
                    }

                    return normalizedContent.map((item, index) => {
                    switch (item.type) {
                        case "header1":
                            return (
                                <h2
                                    key={index}
                                    className="text-3xl font-bold mt-6 mb-3"
                                >
                                    {item.content}
                                </h2>
                            );
                        case "header2":
                            return (
                                <h2
                                    key={index}
                                    className="text-2xl font-bold mt-6 mb-3"
                                >
                                    {item.content}
                                </h2>
                            );
                        case "header3":
                            return (
                                <h2
                                    key={index}
                                    className="text-xl font-bold mt-6 mb-3"
                                >
                                    {item.content}
                                </h2>
                            );
                        case "para":
                            return (
                                <div
                                    key={index}
                                    className="mb-4 leading-relaxed"
                                >
                                    <MarkDown content={item.content} />
                                </div>
                            );
                        case "code":
                            return (
                                <MarkDown
                                    key={index}
                                    content={item.content}
                                ></MarkDown>
                            );
                        case "points":
                            return (
                                <ul
                                    key={index}
                                    className="list-disc pl-6 mb-4 space-y-2"
                                >
                                    {Array.isArray(item.content) &&
                                        item.content.map((point, i) => (
                                            <li
                                                key={i}
                                                className="leading-relaxed"
                                            >
                                                <MarkDown content={point} />
                                            </li>
                                        ))}
                                </ul>
                            );
                        case "mermaid":
                            return (
                                <div key={index} className="my-6">
                                    <MermaidDiagram chart={item.content} />
                                </div>
                            );
                        default:
                            // Fallback for unknown types (often raw strings from LLM)
                            if (typeof item === "string") {
                                return (
                                    <div key={index} className="mb-4 leading-relaxed">
                                        <MarkDown content={item} />
                                    </div>
                                );
                            }
                            return null;
                    }
                });
                })()}
            </div>

            {/* Render dynamically generated diagram below content if it exists */}
            {dynamicDiagram && (
                <div className="mt-8 p-6 rounded-xl border bg-card/50 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-blue-500" />
                        AI Generated Architecture
                    </h3>
                    <div className="bg-background rounded-lg border overflow-hidden p-4">
                        <MermaidDiagram chart={dynamicDiagram} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Content;
