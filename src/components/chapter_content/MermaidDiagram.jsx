"use client";
import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { useTheme } from "next-themes";
import { Loader2, AlertCircle } from "lucide-react";

export default function MermaidDiagram({ chart }) {
    const containerRef = useRef(null);
    const { theme, systemTheme } = useTheme();
    const [svg, setSvg] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const renderDiagram = async () => {
            if (!chart) return;
            
            setLoading(true);
            setError(null);
            
            try {
                // Determine actual theme
                const currentTheme = theme === 'system' ? systemTheme : theme;
                
                mermaid.initialize({
                    startOnLoad: false,
                    theme: currentTheme === 'dark' ? 'dark' : 'default',
                    securityLevel: 'loose',
                    fontFamily: 'inherit'
                });

                // Generate a unique ID for the mermaid chart to prevent conflicts
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                
                // Render the chart
                const { svg } = await mermaid.render(id, chart);
                
                if (isMounted) {
                    setSvg(svg);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Failed to render Mermaid diagram:", err);
                if (isMounted) {
                    setError(err.message || "Failed to render diagram");
                    setLoading(false);
                }
            }
        };

        renderDiagram();

        return () => {
            isMounted = false;
        };
    }, [chart, theme, systemTheme]);

    if (!chart) return null;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-6 bg-red-500/10 border border-red-500/20 rounded-xl my-6 text-red-500 overflow-hidden w-full">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p className="font-semibold text-sm">Failed to render flowchart</p>
                <div className="text-xs opacity-80 mt-2 p-2 bg-black/10 rounded w-full overflow-x-auto whitespace-pre font-mono">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="relative my-8 flex flex-col items-center justify-center w-full min-h-[250px] bg-card/50 rounded-xl border border-border/50 p-6 transition-colors hover:border-blue-500/30 overflow-hidden">
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">Generating flowchart...</p>
                </div>
            )}
            
            {!loading && svg && (
                <div 
                    ref={containerRef}
                    className="w-full flex justify-center overflow-x-auto diagram-container"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
            )}
        </div>
    );
}
