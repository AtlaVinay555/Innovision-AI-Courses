import React from 'react';
import MarkDown from "../MarkDown";
import { Clock } from "lucide-react";
import MermaidDiagram from "./MermaidDiagram";

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

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold">{currentTopic.title}</h2>
                <div className="flex items-center gap-1.5 text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">
                        {readingTime} min read
                    </span>
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

                {/* Sample Static Mermaid Diagram for Phase 1 Testing */}
                {process.env.NODE_ENV === "development" && (
                    <div className="mt-12 pt-8 border-t border-border/50">
                        <h3 className="text-2xl font-bold mb-2">Visual Summary (Mock Concept)</h3>
                        <p className="text-muted-foreground mb-4">This is a static Mermaid.js flowchart to test the rendering pipeline before AI generation is integrated.</p>
                        <MermaidDiagram chart={`graph TD
    A[Client Application] -->|HTTP Request| B(API Gateway)
    B --> C{Load Balancer}
    C -->|Route 1| D[Microservice A]
    C -->|Route 2| E[Microservice B]
    D --> F[(Primary Database)]
    E --> F
    F -.->|Replication| G[(Secondary Database)]
    
    style A fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style B fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff
    style F fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff`} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Content;
