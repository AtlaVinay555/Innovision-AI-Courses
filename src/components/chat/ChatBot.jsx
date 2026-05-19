"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    MessageCircle,
    X,
    Send,
    Loader2,
    Bot,
    User,
    Trash2,
    Minimize2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export default function ChatBot({ courseId, chapterId, courseTitle }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [isOpen]);


    useEffect(() => {
        setMessages([]);
        setInput("");
    }, [chapterId]);

    const sendMessage = async () => {
        const trimmed = input.trim();
        if (!trimmed || loading) return;

        const userMessage = {
            id: crypto.randomUUID?.() || `${Date.now()}-user`,
            role: "user",
            text: trimmed,
        };
        const assistantMessageId = crypto.randomUUID?.() || `${Date.now()}-assistant`;

        setMessages((prev) => [
            ...prev,
            userMessage,
            { id: assistantMessageId, role: "assistant", text: "", isPending: true },
        ]);
        setInput("");
        setLoading(true);

        const updateAssistantMessage = (text) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantMessageId
                        ? { ...msg, text, isPending: false }
                        : msg
                )
            );
        };

        try {
            const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: trimmed,
                    courseId,
                    chapterId: chapterId || null,
                    history: messages.slice(-20).map(({ role, text }) => ({ role, text })),
                }),
            });

            if (res.ok && res.body) {
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let streamedText = "";

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) {
                        break;
                    }

                    streamedText += decoder.decode(value, { stream: true });
                    updateAssistantMessage(streamedText);
                }

                streamedText += decoder.decode();
                updateAssistantMessage(streamedText);
            } else {
                const data = await res.json().catch(() => ({}));
                updateAssistantMessage(
                    data.error ||
                        "Sorry, I couldn't generate a response. Please try again."
                );
            }
        } catch {
            updateAssistantMessage(
                "Network error. Please check your connection and try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-20 z-50 w-14 h-14 rounded-full bg-linear-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center hover:scale-105 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-200 group"
                    title="Ask AI about this course"
                >
                    <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />

                    <span className="absolute inset-0 rounded-full bg-purple-400/30 animate-ping pointer-events-none" />
                </button>
            )}

            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-95 max-w-[calc(100vw-2rem)] h-130 max-h-[calc(100vh-4rem)] rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/20 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">

                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-linear-to-r from-purple-500/10 to-blue-500/10">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                                <Bot className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-semibold leading-tight truncate">
                                    AI Assistant
                                </h3>
                                <p className="text-[11px] text-muted-foreground truncate">
                                    {courseTitle
                                        ? `Currently studying: ${courseTitle}`
                                        : "Ask me anything"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            {messages.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={clearChat}
                                    title="Clear chat"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => setIsOpen(false)}
                                title="Close chat"
                            >
                                <Minimize2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3 opacity-80">
                                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                                    <Bot className="h-7 w-7 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-1">
                                        Hi! I&apos;m your AI assistant.
                                    </p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Ask me anything — course topics,
                                        general knowledge, coding help,
                                        or any question you have!
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
                                    {[
                                        "Summarize this chapter",
                                        "Explain a concept",
                                        "Help me with code",
                                        "General knowledge",
                                    ].map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => {
                                                setInput(suggestion);
                                                inputRef.current?.focus();
                                            }}
                                            className="text-[11px] px-3 py-1.5 rounded-full border border-border/60 bg-muted/30 hover:bg-purple-500/10 hover:border-purple-500/30 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}


                        {messages.map((msg, i) => (
                            <div
                                key={msg.id || i}
                                className={cn(
                                    "flex gap-2.5",
                                    msg.role === "user"
                                        ? "justify-end"
                                        : "justify-start"
                                )}
                            >
                                {msg.role === "assistant" && (
                                    <div className="w-7 h-7 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                                        <Bot className="h-3.5 w-3.5 text-white" />
                                    </div>
                                )}
                                <div
                                    className={cn(
                                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                                        msg.role === "user"
                                            ? "bg-purple-600 text-white rounded-br-md"
                                            : "bg-muted/60 border border-border/40 rounded-bl-md"
                                    )}
                                >
                                    {msg.role === "assistant" && msg.isPending ? (
                                        <div className="flex items-center gap-1.5 py-1 min-w-[3.25rem]">
                                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0ms]" />
                                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:150ms]" />
                                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:300ms]" />
                                        </div>
                                    ) : msg.role === "assistant" ? (
                                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2">
                                            <ReactMarkdown>
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap">
                                            {msg.text}
                                        </p>
                                    )}
                                </div>
                                {msg.role === "user" && (
                                    <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <User className="h-3.5 w-3.5 text-foreground/60" />
                                    </div>
                                )}
                            </div>
                        ))}


                        <div ref={messagesEndRef} />
                    </div>


                    <div className="border-t border-border/50 px-3 py-2.5 bg-muted/20">
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask me anything..."
                                rows={1}
                                className="flex-1 resize-none bg-background border border-border/60 rounded-xl px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 max-h-24 scrollbar-thin"
                                style={{
                                    height: "auto",
                                    minHeight: "40px",
                                }}
                                onInput={(e) => {
                                    e.target.style.height = "auto";
                                    e.target.style.height =
                                        Math.min(e.target.scrollHeight, 96) +
                                        "px";
                                }}
                            />
                            <Button
                                onClick={sendMessage}
                                disabled={!input.trim() || loading}
                                size="icon"
                                className="h-10 w-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shrink-0 disabled:opacity-40"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
