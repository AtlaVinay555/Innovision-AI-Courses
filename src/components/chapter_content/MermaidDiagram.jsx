"use client";
import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { useTheme } from "next-themes";
import { Loader2, AlertCircle, FileCode2 } from "lucide-react";

/**
 * Preprocesses and sanitizes AI-generated Mermaid syntax.
 * Escapes problematic characters (math notation, brackets, commas) inside node labels
 * to prevent parser crashes.
 */
const sanitizeMermaid = (chartStr) => {
    if (!chartStr) return "";
    let sanitized = chartStr.replace(/^```mermaid\s*\n?/i, "").replace(/```\s*$/i, "").trim();

    // 1. Normalize line endings and trim spaces
    sanitized = sanitized.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');

    // 2. Fix malformed arrows (extra spaces inside arrows)
    sanitized = sanitized
        .replace(/-\s+->/g, "-->")       
        .replace(/=\s+=>/g, "==>")       
        .replace(/-\s*\.\s*->/g, "-.->") 
        .replace(/-\s+-\s+-/g, "---");   

    // 3. Fix common LLM mistake: "A -> B" instead of "A --> B"
    sanitized = sanitized.replace(/([a-zA-Z0-9_\]\)\}]\"?)\s+->\s+/g, "$1 --> ");
    sanitized = sanitized.replace(/([a-zA-Z0-9_\]\)\}]\"?)\s+=>\s+/g, "$1 ==> ");

    // 4. Remove invalid spaces between Node IDs and shape brackets
    // e.g., B ["Supervised Learning"] -> B["Supervised Learning"]
    sanitized = sanitized.replace(/([A-Za-z0-9_-]+)\s+(\[|\(|\{|\>)/g, "$1$2");

    // 5. Fix edge label formatting: "--> |Label|" to "-->|Label|"
    sanitized = sanitized.replace(/(-->|==>|-\.->|---)\s+\|/g, "$1|");

    const cleanLabel = (text) => {
        if (text.startsWith('"') && text.endsWith('"')) return text;
        return `"${text
            .replace(/\(/g, "（")
            .replace(/\)/g, "）")
            .replace(/\[/g, "［")
            .replace(/\]/g, "］")
            .replace(/\{/g, "｛")
            .replace(/\}/g, "｝")
            .replace(/:/g, "：")
            .replace(/;/g, "；")
            .replace(/,/g, "，")
            .replace(/"/g, "'")
            .replace(/\n/g, "<br/>")
            .trim()}"`;
    };

    const lines = sanitized.split('\n');
    return lines.map(line => {
        if (line.trim().startsWith('%%')) return line;
        
        let processed = line;

        // 1. Edge Labels: |Text|
        processed = processed.replace(/\|([^|]+)\|/g, (match, text) => `|${cleanLabel(text)}|`);

        // 2. Compound Shapes
        processed = processed.replace(/([A-Za-z0-9_-]+)\s*\(\[([^\]]+)\]\)/g, (match, id, text) => `${id}([${cleanLabel(text)}])`);
        processed = processed.replace(/([A-Za-z0-9_-]+)\s*\[\(([^)]+)\)\]/g, (match, id, text) => `${id}[(${cleanLabel(text)})]`);
        processed = processed.replace(/([A-Za-z0-9_-]+)\s*\(\(([^)]+)\)\)/g, (match, id, text) => `${id}((${cleanLabel(text)}))`);
        processed = processed.replace(/([A-Za-z0-9_-]+)\s*\{\{([^}]+)\}\}/g, (match, id, text) => `${id}{{${cleanLabel(text)}}}`);
        processed = processed.replace(/([A-Za-z0-9_-]+)\s*\[\[([^\]]+)\]\]/g, (match, id, text) => `${id}[[${cleanLabel(text)}]]`);

        // 3. Simple Shapes
        processed = processed.replace(/([A-Za-z0-9_-]+)\s*\[([^\]]+)\]/g, (match, id, text) => {
            if (text.startsWith('[') || text.endsWith(']')) return match; 
            return `${id}[${cleanLabel(text)}]`;
        });
        processed = processed.replace(/([A-Za-z0-9_-]+)\s*\(([^)]+)\)/g, (match, id, text) => {
            if (text.startsWith('(') || text.endsWith(')') || text.startsWith('[') || text.endsWith(']')) return match; 
            return `${id}(${cleanLabel(text)})`;
        });
        processed = processed.replace(/([A-Za-z0-9_-]+)\s*\{([^}]+)\}/g, (match, id, text) => {
            if (text.startsWith('{') || text.endsWith('}')) return match; 
            return `${id}{${cleanLabel(text)}}`;
        });
        processed = processed.replace(/([A-Za-z0-9_-]+)\s*>([^\]]+)\]/g, (match, id, text) => {
            return `${id}>${cleanLabel(text)}]`;
        });

        return processed;
    }).join('\n');
};

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
                
                // Sanitize the AI-generated syntax
                const safeChart = sanitizeMermaid(chart);

                // Check validity before rendering
                try {
                    await mermaid.parse(safeChart);
                } catch (parseErr) {
                    console.error("[Mermaid Validation Error]:", parseErr);
                    if (isMounted) {
                        setError("Diagram unavailable for this topic.");
                        setLoading(false);
                    }
                    return; // Exit cleanly without throwing an Error
                }
                
                // Render the chart
                const { svg } = await mermaid.render(id, safeChart);
                
                if (isMounted) {
                    setSvg(svg);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Failed to render Mermaid diagram:", err);
                if (isMounted) {
                    setError("Diagram unavailable for this topic.");
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
            <div className="flex flex-col items-center justify-center p-6 bg-muted/20 border border-border/50 rounded-xl my-6 text-muted-foreground overflow-hidden w-full">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <p className="font-semibold text-sm text-foreground">Diagram unavailable for this topic</p>
                <p className="text-xs mt-1 opacity-80 text-center">The AI-generated visualization could not be rendered.</p>
                
                <div className="mt-4 w-full text-left">
                    <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider opacity-70">
                        <FileCode2 className="w-4 h-4" />
                        Raw Syntax (For Debugging)
                    </div>
                    <div className="text-xs opacity-70 p-3 bg-black/10 dark:bg-black/20 rounded-lg w-full overflow-x-auto whitespace-pre font-mono">
                        {chart}
                    </div>
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
