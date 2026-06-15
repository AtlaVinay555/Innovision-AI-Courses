"use client";
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import Sidebar from "../sidebar/page";
import { Button } from "../ui/button";
import { AnimatedProgress } from "../ui/animated-progress";
import TaskDecider from "../Tasks/TaskDecider";
import Content from "./Content";
import ChapterNotFound from "./ChapterNotFound";
import ChapterError from "./ChapterError";
import ChapterLoading from "./ChapterLoading";
import BookmarkButton from "./BookmarkButton";
import { toast } from "sonner";
import { loader } from "../ui/Custom/ToastLoader";
import CertificateDialog from "@/components/certificates/CertificateDialog";
import { useAuth } from "@/contexts/auth";
import { useGeminiRequest } from "@/hooks/useGeminiRequest";

// Calculate reading time based on word count (200 words per minute average)
const calculateReadingTime = (content) => {
    if (!content) return 0;

    // Handle different content types
    let text = "";
    if (typeof content === "string") {
        text = content;
    } else if (typeof content === "object") {
        // Extract text from subtopics
        if (content.subtopics) {
            text = content.subtopics.map(topic => {
                const title = topic.title || "";
                const topicContent = topic.content || "";
                return `${title} ${topicContent}`;
            }).join(" ");
        }
        if (content.chapterTitle) {
            text += " " + content.chapterTitle;
        }
    }

    // Remove HTML tags and extra whitespace
    const cleanText = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    const wordCount = cleanText.split(" ").filter(word => word.length > 0).length;

    // Calculate minutes (200 words per minute)
    const minutes = Math.ceil(wordCount / 200);
    return Math.max(1, minutes); // Minimum 1 minute
};

// Format reading time display
const formatReadingTime = (minutes) => {
    if (minutes < 1) return "< 1 min read";
    if (minutes === 1) return "1 min read";
    return `${minutes} min read`;
};

const Page = ({ chapter, roadmapId }) => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const subtopicParam = searchParams.get("subtopic");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [chapterData, setChapterData] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [roadmap, setRoadmap] = useState({});
    const [certDialogOpen, setCertDialogOpen] = useState(false);
    const hasFetchedRef = useRef(false);
    const { showLoader, hideLoader } = loader();
    const { user } = useAuth();
    const { request: geminiRequest } = useGeminiRequest();

    async function getRoadmap() {
        try {
            const response = await fetch(`/api/roadmap/${roadmapId}`);
            if (response.ok) {
                const data = await response.json();
                setRoadmap(data);
                return data;
            }

            toast.error("Roadmap not found");
            return null;
        } catch (error) {
            console.error("Error fetching roadmap", error);
            setError("Failed to fetch roadmap data. Please try again later.");
            toast.error(
                "Failed to fetch roadmap data. Please try again later."
            );
            return null;
        }
    }

    async function fetchChapter(isManualRetry = false) {
        if (!isManualRetry && hasFetchedRef.current) return;
        hasFetchedRef.current = true;
        
        setIsLoading(true);
        setError(null);
        setNotFound(false);

        try {
            const response = await fetch(
                `/api/get-chapter/${roadmapId}/${chapter}`
            );

            if (response.ok) {
                const data = await response.json();

                if (data.chapter.process === "pending") {
                    await handleNotFoundChapter();
                    await handlePendingChapter();
                } else {
                    setChapterData(data.chapter.content);
                    setTasks(data.chapter.tasks);
                }
            } else if (response.status === 404) {
                await handleNotFoundChapter();
            } else {
                throw new Error(`Failed to fetch chapter: ${response.status}`);
            }
        } catch (error) {
            console.error("Error fetching chapter:", error);
            setError("Failed to load chapter content. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handlePendingChapter() {
        setGenerating(true);

        return new Promise((resolve, reject) => {
            const fetchInterval = setInterval(async () => {
                try {
                    const res = await fetch(
                        `/api/get-chapter/${roadmapId}/${chapter}`
                    );

                    if (res.status === 404) {
                        clearInterval(fetchInterval);
                        toast.error(
                            "There was an error while generating your chapter"
                        );
                        setGenerating(false);
                        reject(new Error("Chapter generation failed"));
                        return;
                    }

                    if (!res.ok) {
                        throw new Error(`Failed to fetch: ${res.status}`);
                    }

                    const chapterData = await res.json();

                    if (chapterData.chapter.process === "completed") {
                        clearInterval(fetchInterval);
                        setChapterData(chapterData.chapter.content);
                        setTasks(chapterData.chapter.tasks);
                        setGenerating(false);
                        resolve();
                    } else if (chapterData.chapter.process === "failed") {
                        clearInterval(fetchInterval);
                        setError(chapterData.chapter.error || "Chapter generation failed");
                        setGenerating(false);
                        reject(new Error("Chapter generation failed"));
                    }
                } catch (error) {
                    clearInterval(fetchInterval);
                    setGenerating(false);
                    console.error("Error during polling:", error);
                    toast.error("Error checking chapter generation status");
                    reject(error);
                }
            }, 5000);
        });
    }

    async function handleNotFoundChapter() {
        const roadmap = await getRoadmap();

        if (!roadmap) {
            setNotFound(true);
            return;
        }

        const chapterDetails = roadmap.chapters.find(
            (ch) => ch.chapterNumber === Number(chapter)
        );

        if (!chapterDetails) {
            setNotFound(true);
            return;
        }

        setGenerating(true);

        try {
            const fetchChapterGen = async () => {
                const chapterResponse = await fetch("/api/chapter-prompt", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: chapterDetails,
                        number: chapter,
                        roadmapId,
                    }),
                });
                if (chapterResponse.status === 429) {
                    const err = new Error("QUOTA_EXCEEDED");
                    err.status = 429;
                    throw err;
                }
                if (!chapterResponse.ok && chapterResponse.status !== 202) {
                    throw new Error(`Failed to start chapter generation: ${chapterResponse.status}`);
                }
                // Return a simple object indicating success since the response is empty for 202
                return { status: chapterResponse.status };
            };

            const result = await geminiRequest(`chapter:${roadmapId}:${chapter}`, fetchChapterGen);

            if (result.status === 202) {
                await handlePendingChapter();
            } else if (result.status !== 202 && result.status !== 200) {
                throw new Error(`Failed to start chapter generation`);
            }
        } catch (error) {
            console.error("Error starting chapter generation:", error);
            toast.error("Failed to start chapter generation.");
        }
    }

    const updateUrl = (index) => {
        const params = new URLSearchParams(searchParams);
        params.set("subtopic", index.toString());
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleNext = () => {
        if (
            selectedIndex <
            (chapterData?.subtopics?.length || 0) + tasks?.length - 1
        ) {
            const newIndex = selectedIndex + 1;
            setSelectedIndex(newIndex);
            updateUrl(newIndex);
            window.scrollTo(0, 0);
        } else if (
            selectedIndex ===
            chapterData?.subtopics?.length + tasks?.length - 1 &&
            chapter < roadmap.chapters.length
        ) {
            showLoader();
            const params = new URLSearchParams(searchParams);
            params.set("subtopic", 0);
            router.push(
                `/chapter-test/${roadmapId}/${Number(chapter) + 1
                }/?${params.toString()}`,
                { scroll: false }
            );
        }
    };

    const handlePrev = () => {
        if (selectedIndex > 0) {
            const newIndex = selectedIndex - 1;
            setSelectedIndex(newIndex);
            updateUrl(newIndex);
            window.scrollTo(0, 0);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "ArrowRight") {
            handleNext();
        } else if (e.key === "ArrowLeft") {
            handlePrev();
        }
    };

    useEffect(() => {
        if (subtopicParam && chapterData && chapterData.subtopics) {
            const parsedIndex = parseInt(subtopicParam, 10);
            if (
                !isNaN(parsedIndex) &&
                parsedIndex >= 0 &&
                parsedIndex < chapterData.subtopics.length + tasks.length
            ) {
                setSelectedIndex(parsedIndex);
            }
        }
    }, [subtopicParam, chapterData?.subtopics?.length, tasks.length]);

    useEffect(() => {
        let cancelled = false;
        
        if (roadmapId && chapter && !hasFetchedRef.current) {
            const run = async () => {
                if (cancelled) return;
                await fetchChapter();
            };
            run();
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            cancelled = true;
            window.removeEventListener("keydown", handleKeyDown);
            // reset ref when unmounting or changing chapters
            hasFetchedRef.current = false;
        };
    }, [roadmapId, chapter]);

    useEffect(() => {
        const rm = { ...roadmap };
        for (const element of tasks) {
            const type = element.type.split("-");
            let displayType = "";
            for (const word of type) {
                displayType += word[0].toUpperCase() + word.slice(1) + " ";
            }
            if (rm.chapters && chapterData?.subtopics?.length) {
                rm.chapters[Number(chapter - 1)].contentOutline.length <
                    chapterData.subtopics.length + tasks.length &&
                    rm.chapters[Number(chapter - 1)]?.contentOutline.push(
                        `Task > ${displayType}`
                    );
            }
        }
    }, [roadmap?.chapters?.length, tasks.length, chapterData?.subtopics?.length]);

    useEffect(() => {
        getRoadmap();
        hideLoader();
    }, []);

    if (isLoading) {
        return (
            <ChapterLoading
                roadmap={roadmap}
                roadmapId={roadmapId}
                isGenerating={isGenerating}
            ></ChapterLoading>
        );
    }

    if (error) {
        return <ChapterError fetchChapter={() => fetchChapter(true)} error={error} />;
    }
    if (notFound) {
        return <ChapterNotFound roadmapId={roadmapId} />;
    }

    if (
        !chapterData ||
        !chapterData.subtopics ||
        chapterData.subtopics.length === 0
    ) {
        return (
            <div className="min-h-screen bg-background p-6 flex items-center justify-center">
                <p className="text-lg text-gray-500">
                    No content available for this chapter.
                </p>
            </div>
        );
    }

    const subtopics = chapterData.subtopics || [];
    const currentTopic = subtopics[selectedIndex] || {};

    return (
        <>
            <div className="min-h-[calc(100vh-64px)] bg-background ">
                <div className="flex flex-col md:flex-row">
                    <Sidebar roadmap={roadmap} id={roadmapId} courseTitle={roadmap?.courseTitle || roadmap?.title || ""} />
                    <div className="flex-1 p-8 lg:ml-96 lg:w-[60vw] max-sm:p-4 bg-background ">
                        {chapterData.chapterTitle && (
                            <div className="mb-4">
                                <div className="flex items-start justify-between gap-4">
                                    <h1 className="text-4xl font-bold">
                                        {chapterData.chapterTitle}
                                    </h1>
                                    <BookmarkButton
                                        roadmapId={roadmapId}
                                        chapterNumber={chapter}
                                        chapterTitle={chapterData.chapterTitle}
                                        roadmapTitle={roadmap?.title}
                                        size="lg"
                                    />
                                </div>
                                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-sm">
                                        {formatReadingTime(calculateReadingTime(chapterData))}
                                    </span>
                                    <span className="text-sm">•</span>
                                    <span className="text-sm">
                                        {subtopics.length} topics
                                    </span>
                                    {tasks.length > 0 && (
                                        <>
                                            <span className="text-sm">•</span>
                                            <span className="text-sm">
                                                {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {selectedIndex < chapterData.subtopics.length ? (
                            <div className="mb-6">
                                <div className="flex justify-between text-sm text-gray-500 mb-2">
                                    <span>
                                        Topic {selectedIndex + 1} of{" "}
                                        {subtopics.length}
                                    </span>
                                    <span>
                                        {Math.round(
                                            ((selectedIndex + 1) /
                                                subtopics.length) *
                                            100
                                        )}
                                        % complete
                                    </span>
                                </div>
                                <AnimatedProgress
                                    value={((selectedIndex + 1) / subtopics.length) * 100}
                                    color="blue"
                                    size="default"
                                    delay={200}
                                />
                            </div>
                        ) : (
                            <div className="mb-6">
                                <div className="flex justify-between text-sm text-gray-500 mb-2">
                                    <span>
                                        Task {selectedIndex - subtopics.length + 1}{" "}
                                        of {tasks.length}
                                    </span>
                                    <span>
                                        {Math.round(
                                            ((selectedIndex -
                                                subtopics.length +
                                                1) /
                                                tasks.length) *
                                            100
                                        )}
                                        % complete
                                    </span>
                                </div>
                                <AnimatedProgress
                                    value={((selectedIndex - subtopics.length + 1) / tasks.length) * 100}
                                    color="green"
                                    size="default"
                                    delay={200}
                                />
                            </div>
                        )}
                        {selectedIndex < subtopics.length ? (
                            <Content currentTopic={currentTopic}></Content>
                        ) : (
                            <div>
                                <TaskDecider
                                    roadmapId={roadmapId}
                                    chapterNumber={chapter}
                                    task={tasks[selectedIndex - subtopics.length]}
                                    onCourseComplete={() => {
                                        // Mark roadmap as completed in local state so sidebar button enables immediately
                                        setRoadmap(prev => ({ ...prev, completed: true }));
                                        setCertDialogOpen(true);
                                    }}
                                ></TaskDecider>
                            </div>
                        )}

                        <div className="flex justify-between mt-12 mb-4">
                            <Button
                                variant={"outline"}
                                onClick={handlePrev}
                                disabled={selectedIndex === 0}
                            >
                                <ArrowLeft className="h-5 w-5 mr-2" />
                                <span>Previous</span>
                            </Button>

                            <Button
                                onClick={handleNext}
                                variant={"outline"}
                                disabled={
                                    selectedIndex ===
                                    chapterData?.subtopics?.length +
                                    tasks?.length -
                                    1 && chapter >= roadmap.chapters.length
                                }
                            >
                                <span>
                                    {selectedIndex ===
                                        chapterData?.subtopics?.length - 1
                                        ? "Go to task"
                                        : selectedIndex ===
                                            chapterData?.subtopics?.length +
                                            tasks?.length -
                                            1
                                            ? "Next Chapter"
                                            : "Next"}
                                </span>
                                <ArrowRight className="h-5 w-5 ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Certificate dialog — auto opens on 100% course completion */}
            <CertificateDialog
                open={certDialogOpen}
                onOpenChange={setCertDialogOpen}
                userId={user?.email}
                courseId={roadmapId}
                courseTitle={roadmap?.courseTitle || roadmap?.title || ""}
            />
        </>
    );
};

export default Page;
