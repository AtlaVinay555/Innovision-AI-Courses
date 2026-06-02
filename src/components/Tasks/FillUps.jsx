"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Loader, Zap } from "lucide-react";
import { toast } from "sonner";
import { useContext } from "react";
import xpContext from "@/contexts/xp";
import { ComboIndicator } from "@/components/gamification/ComboMultiplier";
import { isAnswerCorrect } from "@/lib/answerValidator";

const FillUps = ({ task, roadmapId, chapterNumber, onCourseComplete }) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const { getXp, awardXP, combo, incrementCombo, resetCombo, getCurrentMultiplier } = useContext(xpContext);

  const handleInputChange = (e) => {
    if (isAnswered) return;
    setUserAnswer(e.target.value);
  };

  const checkAnswer = async () => {
    let correct = false;
    setSubmitting(true);

    try {
      correct = isAnswerCorrect(
        userAnswer,
        task.acceptableAnswers || [task.answer],
        task.caseSensitive || false
      );

      const res = await fetch(`/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task,
          isCorrect: correct,
          roadmap: roadmapId,
          chapter: chapterNumber,
          userAnswer,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setIsCorrect(correct);
        setIsAnswered(true);

        // Handle combo system
        if (correct) {
          incrementCombo();
          // Show toast for combo XP after a small delay so combo updates first
          setTimeout(() => {
            const multiplier = getCurrentMultiplier();
            if (multiplier > 1) {
              toast.success(`+${2 * multiplier} XP (${multiplier}x combo!)`, {
                icon: <Zap className="h-4 w-4 text-yellow-500" />,
              });
            }
          }, 100);
        } else {
          resetCombo();
        }

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
      console.error("Error submitting answer:", error);
      toast.error("Network error. Please check your connection and try again.");
    }
    setSubmitting(false);
  };

  useEffect(() => {
    if (task.isAnswered) {
      setIsAnswered(task.isAnswered);
      setIsCorrect(task.isCorrect);
      setUserAnswer(task.userAnswer || "");
    }
  }, []);

  return (
    <div className="w-full p-4">
      <Card className="max-w-3xl gap-4 mx-auto border-0 shadow-none">
        <CardHeader className="rounded-t-lg">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold">Fill in the blank</CardTitle>
            {/* Show combo indicator if active */}
            {combo >= 2 && <ComboIndicator combo={combo} />}
          </div>
        </CardHeader>

        <CardContent className="pb-2">
          <div>
            <h2 className="mb-0 text-lg font-semibold">Question</h2>

            <div className="flex select-none flex-col gap-3 text-lg">
              <span>{task.question || task.content}</span>
              <div className="flex items-center gap-2">
                Enter your answer :
                <Input
                  value={userAnswer}
                  onChange={handleInputChange}
                  disabled={isAnswered}
                  className={`text-center mx-2 max-w-24 font-medium ${isAnswered
                    ? isCorrect
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                      : "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                    : "border-blue-300 focus:border-blue-500"
                    }`}
                  placeholder="Answer"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && userAnswer.trim() !== "") {
                      e.preventDefault();
                      checkAnswer();
                    }
                  }}
                />
              </div>
            </div>

            {isAnswered && (
              <div>
                <div className="flex items-center mt-4">
                  <div className="shrink-0 mr-3">
                    {isCorrect ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{isCorrect ? "Correct!" : "Incorrect!"}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {isCorrect ? "Great job!" : `The correct answer is: ${task.answer}`}
                    </div>
                  </div>
                </div>
                <div className="mt-6 space-y-4 animate-fadeIn">
                  <div
                    className={`p-4 rounded-lg border-l-4 ${isCorrect
                      ? "bg-green-50 dark:bg-green-950/30 border-green-500 text-green-700 dark:text-green-400"
                      : "bg-red-50 dark:bg-red-950/30 border-red-500 text-red-700 dark:text-red-400"
                      }`}
                  >
                    <div className="font-bold text-lg mb-1">Explanation</div>
                    <p>{task.explanation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          {!isAnswered && (
            <Button
              variant={"secondary"}
              className={"bg-blue-500 text-zinc-50 mx-auto dark:bg-blue-800 hover:bg-blue-600 dark:hover:bg-blue-600"}
              onClick={checkAnswer}
              disabled={!userAnswer || submitting}
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
    </div>
  );
};

export default FillUps;
