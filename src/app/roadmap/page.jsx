"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Sparkles, Search, X, Filter, Trash2, Archive, ArchiveRestore, CheckSquare } from "lucide-react";
import CourseCard from "@/components/Home/CourseCard";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageBackground, GridPattern, PageHeader, ScrollReveal, HoverCard } from "@/components/ui/PageWrapper";
import ChatBot from "@/components/chat/ChatBot";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import RecommendedCourses from "@/components/RecommendedCourses";
import DailyQuests from "@/components/gamification/DailyQuests";
import { useAuth } from "@/contexts/auth";

export default function page() {
    const { user } = useAuth();
    const [error, setError] = useState(null);
    const [roadmaps, setRoadmaps] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("all");
    const [archiveFilter, setArchiveFilter] = useState("active"); // active, archived, all
    const [sortBy, setSortBy] = useState("newest");

    // Bulk selection states
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showArchiveDialog, setShowArchiveDialog] = useState(false);
    const [bulkAction, setBulkAction] = useState(null);

    // Load filter preferences from localStorage
    useEffect(() => {
        const savedFilters = localStorage.getItem("courseFilters");
        if (savedFilters) {
            const { search, difficulty, archive, sort } = JSON.parse(savedFilters);
            setSearchQuery(search || "");
            setDifficultyFilter(difficulty || "all");
            setArchiveFilter(archive || "active");
            setSortBy(sort || "newest");
        }
    }, []);

    // Save filter preferences to localStorage
    useEffect(() => {
        localStorage.setItem(
            "courseFilters",
            JSON.stringify({
                search: searchQuery,
                difficulty: difficultyFilter,
                archive: archiveFilter,
                sort: sortBy,
            })
        );
    }, [searchQuery, difficultyFilter, archiveFilter, sortBy]);

    async function fetchRoadmaps() {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/roadmap/all");

            if (!response.ok) {
                throw new Error("Failed to fetch roadmaps");
            }

            const data = await response.json();
            setRoadmaps(data?.docs || []);
        } catch (err) {
            console.error("Roadmap fetch error:", err);
            setError("Unable to load your courses.");
            setRoadmaps([]);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        fetchRoadmaps();
    }, []);

    const completedCourses = roadmaps.filter(r => r.process === "completed");

    // Filter by archive status
    const statusFilteredCourses = completedCourses.filter((course) => {
        if (archiveFilter === "active") return !course.archived;
        if (archiveFilter === "archived") return course.archived;
        return true; // "all"
    });

    // Filter and sort courses
    const filteredCourses = statusFilteredCourses
        .filter((course) => {
            // Archive filter - treat undefined/null as not archived
            const isArchived = course.archived === true;
            if (archiveFilter === "active" && isArchived) return false;
            if (archiveFilter === "archived" && !isArchived) return false;
            // "all" shows both

            // Search filter
            const matchesSearch = course.courseTitle
                .toLowerCase()
                .includes(searchQuery.toLowerCase());

            // Difficulty filter
            const matchesDifficulty =
                difficultyFilter === "all" || course.difficulty === difficultyFilter;

            return matchesSearch && matchesDifficulty;
        })
        .sort((a, b) => {
            // Sort logic
            if (sortBy === "newest") {
                return new Date(b.createdAt) - new Date(a.createdAt);
            } else if (sortBy === "oldest") {
                return new Date(a.createdAt) - new Date(b.createdAt);
            } else if (sortBy === "title") {
                return a.courseTitle.localeCompare(b.courseTitle);
            }
            return 0;
        });

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery("");
        setDifficultyFilter("all");
        setArchiveFilter("active");
        setSortBy("newest");
    };

    // Check if any filters are active
    const hasActiveFilters = searchQuery !== "" || difficultyFilter !== "all" || archiveFilter !== "active" || sortBy !== "newest";

    // Bulk selection handlers
    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode);
        setSelectedCourses([]);
    };

    const handleSelectCourse = (courseId, checked) => {
        if (checked) {
            setSelectedCourses([...selectedCourses, courseId]);
        } else {
            setSelectedCourses(selectedCourses.filter(id => id !== courseId));
        }
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedCourses(filteredCourses.map(c => c.id));
        } else {
            setSelectedCourses([]);
        }
    };

    const handleBulkAction = async (action) => {
        if (selectedCourses.length === 0) {
            toast.error("No courses selected");
            return;
        }

        setBulkActionLoading(true);
        try {
            const response = await fetch("/api/roadmap/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseIds: selectedCourses,
                    action: action,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(
                    `Successfully ${action}d ${data.processed} course${data.processed > 1 ? 's' : ''}${data.failed > 0 ? `, ${data.failed} failed` : ''
                    }`
                );
                setSelectedCourses([]);
                setSelectionMode(false);
                fetchRoadmaps();
            } else {
                toast.error(data.error || `Failed to ${action} courses`);
            }
        } catch (error) {
            console.error(`Bulk ${action} error:`, error);
            toast.error(`Failed to ${action} courses`);
        } finally {
            setBulkActionLoading(false);
            setShowDeleteDialog(false);
            setShowArchiveDialog(false);
        }
    };

    const confirmBulkDelete = () => {
        setBulkAction("delete");
        setShowDeleteDialog(true);
    };

    const confirmBulkArchive = () => {
        const hasArchivedCourses = selectedCourses.some(id => {
            const course = filteredCourses.find(c => c.id === id);
            return course?.archived;
        });
        setBulkAction(hasArchivedCourses ? "unarchive" : "archive");
        setShowArchiveDialog(true);
    };

    return (
        <div className="min-h-screen bg-background relative">
            <PageBackground variant="courses" />
            <GridPattern opacity={0.02} />

            <div className="max-w-6xl flex flex-col gap-4 items-center p-4 mt-10 mb-16 mx-auto relative z-10">
                <PageHeader
                    title="Your Courses"
                    description="Manage and continue your learning journey"
                    icon={BookOpen}
                    iconColor="text-blue-500"
                    badge={<><Sparkles className="h-3.5 w-3.5" /> My Learning</>}
                />

                {!loading && !error && <RecommendedCourses query={searchQuery} />}

                {!loading && !error && user?.email && (
                    <div className="w-full max-w-4xl">
                        <DailyQuests userId={user.email} />
                    </div>
                )}

                {/* Search and Filter Section */}
                {!loading && !error && completedCourses.length > 0 && (
                    <div className="w-full max-w-4xl space-y-4">
                        {/* Bulk Actions Toolbar */}
                        {selectionMode && (
                            <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg backdrop-blur-sm">
                                <div className="flex items-center gap-4">
                                    <Checkbox
                                        checked={selectedCourses.length === filteredCourses.length && filteredCourses.length > 0}
                                        onCheckedChange={handleSelectAll}
                                        className="h-5 w-5"
                                    />
                                    <span className="text-sm font-medium">
                                        {selectedCourses.length} of {filteredCourses.length} selected
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedCourses.length > 0 && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={confirmBulkArchive}
                                                disabled={bulkActionLoading}
                                                className="gap-2"
                                            >
                                                {archiveFilter === "archived" ? (
                                                    <>
                                                        <ArchiveRestore className="h-4 w-4" />
                                                        Unarchive
                                                    </>
                                                ) : (
                                                    <>
                                                        <Archive className="h-4 w-4" />
                                                        Archive
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={confirmBulkDelete}
                                                disabled={bulkActionLoading}
                                                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                            </Button>
                                        </>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggleSelectionMode}
                                        disabled={bulkActionLoading}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Selection Mode Toggle */}
                        {!selectionMode && (
                            <div className="flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={toggleSelectionMode}
                                    className="gap-2"
                                >
                                    <CheckSquare className="h-4 w-4" />
                                    Select Courses
                                </Button>
                            </div>
                        )}

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search courses by title..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-10 h-11 bg-card/50 backdrop-blur-sm border-border/50 focus:border-blue-500/50"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Filters Row */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Filter className="h-4 w-4" />
                                <span className="font-medium">Filters:</span>
                            </div>

                            {/* Archive Status Filter */}
                            <Select value={archiveFilter} onValueChange={setArchiveFilter}>
                                <SelectTrigger className="w-35 h-9 bg-card/50 backdrop-blur-sm border-border/50">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                    <SelectItem value="all">All Courses</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Difficulty Filter */}
                            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                                <SelectTrigger className="w-40 h-9 bg-card/50 backdrop-blur-sm border-border/50">
                                    <SelectValue placeholder="Difficulty" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Difficulties</SelectItem>
                                    <SelectItem value="fast">Fast-paced</SelectItem>
                                    <SelectItem value="balanced">Balanced</SelectItem>
                                    <SelectItem value="in-depth">In-depth</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Archive Filter */}
                            <Select value={archiveFilter} onValueChange={setArchiveFilter}>
                                <SelectTrigger className="w-35 h-9 bg-card/50 backdrop-blur-sm border-border/50">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                    <SelectItem value="all">All Courses</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Sort By */}
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-40 h-9 bg-card/50 backdrop-blur-sm border-border/50">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest First</SelectItem>
                                    <SelectItem value="oldest">Oldest First</SelectItem>
                                    <SelectItem value="title">Title (A-Z)</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Clear Filters Button */}
                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="h-9 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Clear Filters
                                </Button>
                            )}

                            {/* Course Count */}
                            <div className="ml-auto text-sm text-muted-foreground">
                                Showing {filteredCourses.length} of {completedCourses.length} courses
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-6 justify-center flex-wrap w-full">
                    {loading ? (
                        Array(6)
                            .fill(0)
                            .map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="w-[320px] h-70 rounded-xl"
                                />
                            ))
                    ) : error ? (
                        <div className="w-full text-center py-16 text-muted-foreground">
                            <div className="flex flex-col items-center">
                                <BookOpen className="h-12 w-12 mb-4 opacity-50" />
                                <p className="text-lg font-semibold">
                                    We couldn't load your courses
                                </p>
                                <p className="text-sm mt-2">
                                    Please try again or refresh the page.
                                </p>
                                <button
                                    onClick={fetchRoadmaps}
                                    className="mt-4 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    ) : completedCourses.length === 0 ? (
                        <div className="w-full text-center py-16 text-muted-foreground">
                            <div className="flex flex-col items-center">
                                <BookOpen className="h-12 w-12 mb-4 opacity-50" />
                                <p className="text-lg font-medium">
                                    You don't have any courses yet
                                </p>
                                <p className="text-sm mt-2">
                                    Start by generating your first roadmap
                                </p>
                                <Link href="/generate" className="mt-4">
                                    <Button>Create Course</Button>
                                </Link>
                            </div>
                        </div>
                    ) : filteredCourses.length === 0 ? (
                        <div className="w-full text-center py-16 text-muted-foreground">
                            <div className="flex flex-col items-center">
                                <Search className="h-12 w-12 mb-4 opacity-50" />
                                <p className="text-lg font-medium">
                                    No courses found
                                </p>
                                <p className="text-sm mt-2">
                                    Try adjusting your search or filters
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={clearFilters}
                                    className="mt-4"
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Course Cards */}
                            {filteredCourses.map((roadmap, index) => (
                                <ScrollReveal key={roadmap.id} delay={index * 50}>
                                    <HoverCard>
                                        <CourseCard
                                            course={roadmap}
                                            onDelete={fetchRoadmaps}
                                            onArchive={fetchRoadmaps}
                                            isSelectable={selectionMode}
                                            isSelected={selectedCourses.includes(roadmap.id)}
                                            onSelect={handleSelectCourse}
                                        />
                                    </HoverCard>
                                </ScrollReveal>
                            ))}

                            {/* Create New Course Card */}
                            <ScrollReveal delay={filteredCourses.length * 50}>
                                <HoverCard>
                                    <Card className="w-[320px] h-70 relative flex items-center justify-center border-2 border-dashed border-border/50 bg-card/30 backdrop-blur-sm hover:border-blue-500/50 transition-colors">
                                        <div className="flex flex-col items-center text-muted-foreground">
                                            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                                                <Plus strokeWidth={1.5} className="w-8 h-8 text-blue-500" />
                                            </div>
                                            <p className="text-lg text-center font-medium">
                                                Create New Course
                                            </p>
                                        </div>
                                        <Link href={`/generate`} scroll={false}>
                                            <span className="absolute inset-0"></span>
                                        </Link>
                                    </Card>
                                </HoverCard>
                            </ScrollReveal>
                        </>
                    )}
                </div>
            </div>
            <ChatBot />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedCourses.length} Course{selectedCourses.length > 1 ? 's' : ''}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the selected course{selectedCourses.length > 1 ? 's' : ''} and all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={bulkActionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => handleBulkAction("delete")}
                            disabled={bulkActionLoading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {bulkActionLoading ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Archive Confirmation Dialog */}
            <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {bulkAction === "archive" ? "Archive" : "Unarchive"} {selectedCourses.length} Course{selectedCourses.length > 1 ? 's' : ''}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {bulkAction === "archive"
                                ? `This will archive the selected course${selectedCourses.length > 1 ? 's' : ''}. You can restore them later from the archived filter.`
                                : `This will restore the selected course${selectedCourses.length > 1 ? 's' : ''} to your active courses.`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={bulkActionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => handleBulkAction(bulkAction)}
                            disabled={bulkActionLoading}
                        >
                            {bulkActionLoading ? "Processing..." : bulkAction === "archive" ? "Archive" : "Unarchive"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
