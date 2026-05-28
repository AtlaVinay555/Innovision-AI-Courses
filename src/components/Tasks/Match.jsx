"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader, CheckCircle, XCircle } from "lucide-react";
import { useContext } from "react";
import xpContext from "@/contexts/xp";

export default function Match({ task, roadmapId, chapterNumber, onCourseComplete }) {
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matches, setMatches] = useState(Array((task?.terms?.lhs || []).length).fill(-1));
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState([]);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState([]);
  const { getXp, awardXP } = useContext(xpContext);

  const leftRefs = useRef([]);
  const rightRefs = useRef([]);
  const containerRef = useRef(null);

  // Defensive validation: ensure schema exists before hooks depend on it
  const isValidTask = task && task.terms && Array.isArray(task.terms.lhs) && Array.isArray(task.terms.rhs);

  useEffect(() => {
    if (!isValidTask) return;
    const lhsLength = (task?.terms?.lhs || []).length;
    const rhsLength = (task?.terms?.rhs || []).length;
    leftRefs.current = leftRefs.current.slice(0, lhsLength);
    rightRefs.current = rightRefs.current.slice(0, rhsLength);
    if (task?.isAnswered) {
      setIsCorrect(task.isCorrect || []);
      setScore((task.isCorrect || []).filter(Boolean).length);
      setMatches(task.userAnswer || []);
      setSubmitted(task.isAnswered);
    }
  }, []);

  useEffect(() => {
    updateLines();
    window.addEventListener("resize", updateLines);
    return () => window.removeEventListener("resize", updateLines);
  }, [matches, submitted]);

  const updateLines = () => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines = [];

    matches.forEach((rightIndex, leftIndex) => {
      if (rightIndex !== -1 && leftRefs.current[leftIndex] && rightRefs.current[rightIndex]) {
        const leftRect = leftRefs.current[leftIndex].getBoundingClientRect();
        const rightRect = rightRefs.current[rightIndex].getBoundingClientRect();

        const from = {
          x: leftRect.right - containerRect.left,
          y: leftRect.top + leftRect.height / 2 - containerRect.top,
          width: leftRect.width,
          height: leftRect.height,
          left: leftRect.left - containerRect.left,
          right: leftRect.right - containerRect.left,
          top: leftRect.top - containerRect.top,
          bottom: leftRect.bottom - containerRect.top,
          toJSON: () => { },
        };

        const to = {
          x: rightRect.left - containerRect.left,
          y: rightRect.top + rightRect.height / 2 - containerRect.top,
          width: rightRect.width,
          height: rightRect.height,
          left: rightRect.left - containerRect.left,
          right: rightRect.right - containerRect.left,
          top: rightRect.top - containerRect.top,
          bottom: rightRect.bottom - containerRect.top,
          toJSON: () => { },
        };

        let color = "#0971e8";
        if (submitted) {
          color = isCorrect[leftIndex] ? "#22c55e" : "#ef4444";
        }

        newLines.push({ from, to, color });
      }
    });

    setLines(newLines);
  };

  const handleLeftSelect = (index) => {
    if (submitted) return;
    setSelectedLeft(index);

    if (selectedRight !== null) {
      createMatch(index, selectedRight);
    }
  };

  const handleRightSelect = (index) => {
    if (submitted) return;
    setSelectedRight(index);

    if (selectedLeft !== null) {
      createMatch(selectedLeft, index);
    }
  };

  const createMatch = (leftIndex, rightIndex) => {
    const newMatches = [...matches];

    const existingMatchIndex = matches.indexOf(rightIndex);
    if (existingMatchIndex !== -1) {
      newMatches[existingMatchIndex] = -1;
    }

    if (newMatches[leftIndex] !== -1) {
      newMatches[leftIndex] = -1;
    }

    newMatches[leftIndex] = rightIndex;
    setMatches(newMatches);

    setSelectedLeft(null);
    setSelectedRight(null);
  };

  const removeMatch = (leftIndex) => {
    if (submitted) return;
    const newMatches = [...matches];
    newMatches[leftIndex] = -1;
    setMatches(newMatches);
  };

  const handleSubmit = async () => {
    if (matches.includes(-1)) {
      toast.warning("Please match all items before submitting");
      return;
    }
    setSubmitting(true);

    try {
      const correctAnswers = task?.answer || [];

      const correctnessArray = matches.map((rightIndex, leftIndex) => {
        return correctAnswers[leftIndex] === rightIndex;
      });

      const res = await fetch(`/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task,
          isCorrect: correctnessArray,
          roadmap: roadmapId,
          chapter: chapterNumber,
          userAnswer: matches,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setIsCorrect(correctnessArray);
        const correctCount = correctnessArray.filter(Boolean).length;
        setScore(correctCount);
        setSubmitted(true);

        // XP is now awarded server-side in /api/tasks
        getXp();

        // Auto-trigger certificate dialog if entire course is complete
        if (data.courseCompleted && onCourseComplete) {
          setTimeout(() => onCourseComplete(), 800);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to submit task. Try again.");
      }
    } catch (error) {
      console.error("Error submitting match:", error);
      toast.error("Network error. Please check your connection and try again.");
    }
    setSubmitting(false);
  };

  const getLeftItemColor = (index) => {
    if (submitted) {
      return isCorrect[index]
        ? "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700"
        : "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700";
    }
    if (index === selectedLeft) return "bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700";
    if (matches[index] !== -1) return "bg-blue-200/80 border-blue-400/80 dark:bg-blue-900/50 dark:border-blue-700";
    return "bg-background";
  };

  const getRightItemColor = (index) => {
    if (submitted) {
      const leftIndex = matches.indexOf(index);
      if (leftIndex !== -1) {
        return isCorrect[leftIndex]
          ? "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700"
          : "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700";
      }
    }
    if (index === selectedRight) return "bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700";
    if (matches.includes(index)) return "bg-blue-200/80 border-blue-400/80 dark:bg-blue-900/50 dark:border-blue-700";
    return "bg-background";
  };

  if (!isValidTask) {
    return (
      <Card className="w-full max-w-3xl border-0 shadow-none mx-auto">
        <CardHeader>
          <CardTitle>Match the Following</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              This task could not be generated correctly by the AI. You may skip it.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl border-0 shadow-none mx-auto">
      <CardHeader>
        <CardTitle>Match the Following</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative" ref={containerRef}>
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
            {lines.map((line, index) => {
              const controlPointX1 = line.from.right + (line.to.left - line.from.right) * 0.4;
              const controlPointX2 = line.from.right + (line.to.left - line.from.right) * 0.6;

              return (
                <path
                  key={index}
                  d={`M ${line.from.right} ${line.from.y} C ${controlPointX1} ${line.from.y}, ${controlPointX2} ${line.to.y}, ${line.to.left} ${line.to.y}`}
                  stroke={line.color}
                  strokeWidth="2"
                  fill="none"
                />
              );
            })}
          </svg>

          <div className="flex gap-6 justify-center select-none md:gap-16">
            <div className="space-y-4">
              {task.terms.lhs.map((term, index) => (
                <div
                  key={`left-${index}`}
                  ref={(el) => (leftRefs.current[index] = el)}
                  className={`p-3 border rounded-lg w-full cursor-pointer transition-colors ${getLeftItemColor(index)}`}
                  onClick={() => handleLeftSelect(index)}
                >
                  <div className="flex justify-between items-center">
                    <span>{term}</span>
                    {matches[index] !== -1 && !submitted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMatch(index);
                        }}
                        className="text-gray-500 hover:text-gray-700 ml-2"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {task.terms.rhs.map((definition, index) => (
                <div
                  key={`right-${index}`}
                  ref={(el) => (rightRefs.current[index] = el)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${getRightItemColor(index)}`}
                  onClick={() => handleRightSelect(index)}
                >
                  {definition}
                </div>
              ))}
            </div>
          </div>
        </div>

        {submitted && (
          <Alert className="mt-6">
            <AlertDescription>
              <p className="font-medium">
                Score: {score}/{task.terms.lhs.length}
              </p>
              <p className="mt-2">{task.explanation}</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-center gap-2">
        {!submitted && (
          <Button
            variant={"secondary"}
            onClick={handleSubmit}
            disabled={submitting}
            className={"bg-blue-500 text-zinc-50 dark:bg-blue-800 hover:bg-blue-600 dark:hover:bg-blue-600"}
          >
            {submitting ? (
              <>
                Submitting
                <Loader className="animate-spin"></Loader>
              </>
            ) : (
              "Submit"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
