"use client";
import PomodoroTimer from "@/components/PomodoroTimer";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, User, ArrowLeft, Play } from "lucide-react";
import { toast } from "sonner";
import ChatBot from "@/components/chat/ChatBot";

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchCourse();
    }
  }, [params.id]);

  const fetchCourse = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data);
      } else {
        toast.error("Course not found");
        router.push("/courses");
      }
    } catch (error) {
      toast.error("Failed to load course");
    }
    setLoading(false);
  };

  const handleEnroll = async () => {
    if (!user) {
      toast.error("Please login to enroll");
      router.push("/login");
      return;
    }

    // For Studio courses, just navigate directly to first chapter
    router.push(`/studio-course/${params.id}/1`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Course not found</p>
          <Button onClick={() => router.push("/courses")} className="mt-4">
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/courses")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>
       
        {/* Course Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{course.title}</h1>
              <p className="text-lg text-muted-foreground">{course.description}</p>
            </div>
            <Badge className="ml-4">Published</Badge>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>By {course.createdBy || "Instructor"}</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>{course.chapters?.length || 0} chapters</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Published {new Date(course.publishedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Enroll Button */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Ready to start learning?</h3>
                <p className="text-sm text-muted-foreground">
                  Start the course and access all materials
                </p>
              </div>
              <Button
                size="lg"
                onClick={handleEnroll}
                className="ml-4"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Course
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Focus Timer */}
        <PomodoroTimer />

        {/* Course Content */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Course Content</h2>

          {course.chapters && course.chapters.length > 0 ? (
            <div className="space-y-3">
              {course.chapters.map((chapter, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-sm font-bold">
                        {index + 1}
                      </span>
                      {chapter.title || `Chapter ${index + 1}`}
                    </CardTitle>
                    {chapter.description && (
                      <CardDescription>{chapter.description}</CardDescription>
                    )}
                  </CardHeader>
                  {chapter.topics && chapter.topics.length > 0 && (
                    <CardContent>
                      <ul className="space-y-2">
                        {chapter.topics.map((topic, topicIndex) => (
                          <li key={topicIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Course content will be available after enrollment</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <ChatBot courseId={params.id} courseTitle={course?.title} />
    </div>
  );
}
