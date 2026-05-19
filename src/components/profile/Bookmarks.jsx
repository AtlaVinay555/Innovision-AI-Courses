"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, BookOpen, Trash2, ExternalLink, BookmarkX } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function Bookmarks() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const res = await fetch("/api/bookmarks");
      const data = await res.json();
      setBookmarks(data.bookmarks || []);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (bookmark) => {
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookmarkId: bookmark.id,
          roadmapId: bookmark.roadmapId,
          courseId: bookmark.courseId,
          courseType: bookmark.courseType,
          chapterNumber: bookmark.chapterNumber,
          action: "remove",
        }),
      });

      if (res.ok) {
        setBookmarks(prev => prev.filter(b => b.id !== bookmark.id));
        toast.success("Bookmark removed");
      }
    } catch (error) {
      toast.error("Failed to remove bookmark");
    }
  };

  const goToChapter = (bookmark) => {
    const type = bookmark.courseType || "roadmap";
    const id = bookmark.courseId || bookmark.roadmapId;
    const chapter = bookmark.chapterNumber;
    const chapterId = bookmark.chapterId;

    if (type === "ingested") {
      if (chapterId) {
        router.push(`/ingested-course/${id}/${chapterId}`);
      } else if (chapter && chapter !== 0) {
        router.push(`/ingested-course/${id}/${chapter}`);
      } else {
        router.push(`/ingested-course/${id}`);
      }
    } else if (type === "youtube") {
      router.push(`/youtube-course/${id}`);
    } else {
      // Default to roadmap pattern
      if (chapter && chapter !== 0) {
        router.push(`/chapter-test/${id}/${chapter}`);
      } else {
        router.push(`/roadmap/${id}`);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-yellow-500" />
            Bookmarks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          Bookmarks
          {bookmarks.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({bookmarks.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bookmarks.length === 0 ? (
          <EmptyState
            title="No bookmarks yet"
            description="Bookmark chapters to quickly access them later. Your favorite learning content will appear here."
            icon={BookmarkX}
            actionLabel="Browse Courses"
            actionHref="/courses"
          />
        ) : (
          <div className="space-y-3">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <BookOpen className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {bookmark.chapterTitle}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {bookmark.roadmapTitle} • Chapter {bookmark.chapterNumber}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Saved {formatDate(bookmark.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => goToChapter(bookmark)}
                    className="h-8 w-8"
                    title="Go to chapter"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBookmark(bookmark)}
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    title="Remove bookmark"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
