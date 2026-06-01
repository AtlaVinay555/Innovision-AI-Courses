"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Crown, Clock } from "lucide-react";

const PremiumGoogleTranslate = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false);
  const [trialActive, setTrialActive] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    let intervalId;
    intervalId = setInterval(() => {
      const combo = document.querySelector(".goog-te-combo");
      if (combo) {
        // Add English option if it doesn't exist
        const hasEnglish = Array.from(combo.options).some((opt) => opt.value === "en");
        if (!hasEnglish) {
          const opt = document.createElement("option");
          opt.value = "en";
          opt.textContent = "English";
          if (combo.options.length > 1) {
            combo.insertBefore(opt, combo.options[1]);
          } else {
            combo.appendChild(opt);
          }
        }

        // Keep selected option correct for English / default
        const googtrans = document.cookie.split("; ").find((row) => row.startsWith("googtrans="));
        if (!googtrans || googtrans.endsWith("/en")) {
          if (combo.value !== "") {
            combo.value = "";
          }
        }

        // Add change listener if not already added
        if (!combo.dataset.listenerAdded) {
          combo.dataset.listenerAdded = "true";
          combo.addEventListener("change", (e) => {
            if (e.target.value === "en") {
              // Clear googtrans cookie
              document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
              document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." + window.location.hostname.split('.').slice(-2).join('.');
              window.location.reload();
            }
          });
        }
        clearInterval(intervalId);
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const checkPremiumAndTrial = async () => {
      if (!user) return;

      try {
        // Check premium status
        const res = await fetch("/api/premium/status");
        const data = await res.json();
        setIsPremium(data.isPremium);

        if (data.isPremium) {
          // Premium users get full access
          initializeTranslate();
          return;
        }

        // Check trial status from localStorage
        const trialStartTime = localStorage.getItem("translate_trial_start");
        const trialUsed = localStorage.getItem("translate_trial_used");

        if (trialUsed === "true") {
          // Trial already used
          setTrialExpired(true);
          return;
        }

        if (!trialStartTime) {
          // Start trial
          const startTime = Date.now();
          localStorage.setItem("translate_trial_start", startTime.toString());
          setTrialActive(true);
          initializeTranslate();
          startTrialTimer(startTime);
        } else {
          // Check if trial is still valid
          const elapsed = Date.now() - parseInt(trialStartTime);
          const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds

          if (elapsed < tenMinutes) {
            setTrialActive(true);
            initializeTranslate();
            startTrialTimer(parseInt(trialStartTime));
          } else {
            // Trial expired
            localStorage.setItem("translate_trial_used", "true");
            setTrialExpired(true);
            setShowUpgradeDialog(true);
          }
        }
      } catch (error) {
        console.error("Error checking premium status:", error);
      }
    };

    checkPremiumAndTrial();
  }, [user]);

  const startTrialTimer = (startTime) => {
    const tenMinutes = 10 * 60 * 1000;

    const updateTimer = () => {
      const elapsed = Date.now() - startTime;
      const remaining = tenMinutes - elapsed;

      if (remaining <= 0) {
        localStorage.setItem("translate_trial_used", "true");
        setTrialActive(false);
        setTrialExpired(true);
        setShowUpgradeDialog(true);
        setTimeRemaining(0);
        // Remove translate widget
        const translateElement = document.getElementById("google_translate_element");
        if (translateElement) {
          translateElement.innerHTML = "";
        }
      } else {
        setTimeRemaining(Math.ceil(remaining / 1000)); // seconds
        setTimeout(updateTimer, 1000);
      }
    };

    updateTimer();
  };

  const initializeTranslate = () => {
    if (!document.querySelector("#google-translate-script")) {
      const addScript = document.createElement("script");
      addScript.id = "google-translate-script";
      addScript.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      addScript.async = true;
      document.body.appendChild(addScript);
    }

    window.googleTranslateElementInit = () => {
      if (!document.querySelector(".goog-te-combo")) {
        new window.google.translate.TranslateElement(
          { pageLanguage: "en" },
          "google_translate_element"
        );
      }
    };
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!user) {
    return (
      <div className="p-3 bg-muted rounded-lg text-center">
        <p className="text-sm text-muted-foreground">Login to use translation</p>
      </div>
    );
  }

  if (trialExpired && !isPremium) {
    return (
      <>
        <div className="p-3 bg-linear-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-semibold">Premium Feature</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Your 10-minute trial has expired. Upgrade to Premium for unlimited translation!
          </p>
          <Button
            size="sm"
            onClick={() => router.push("/premium")}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            Upgrade to Premium
          </Button>
        </div>

        <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-600" />
                Translation Trial Expired
              </AlertDialogTitle>
              <AlertDialogDescription>
                Your 10-minute free trial for translation has ended. Upgrade to Premium for unlimited access to translation and all other premium features!
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => router.push("/premium")}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                Upgrade Now - ₹100/month
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <div>
      {trialActive && !isPremium && (
        <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg notranslate" translate="no">
          <div className="flex items-center gap-2 text-xs">
            <Clock className="h-3 w-3 text-blue-600" />
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              Trial: {formatTime(timeRemaining)} remaining
            </span>
          </div>
        </div>
      )}
      {isPremium && (
        <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2 text-xs">
            <Crown className="h-3 w-3 text-yellow-600" />
            <span className="text-yellow-600 dark:text-yellow-400 font-medium">
              Premium Access
            </span>
          </div>
        </div>
      )}
      <div id="google_translate_element"></div>
    </div>
  );
};

export default PremiumGoogleTranslate;
