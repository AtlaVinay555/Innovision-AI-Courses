"use client";

import { useState, useEffect } from "react";

export default function PomodoroTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [showBreak, setShowBreak] = useState(false);
  const [selectedTime, setSelectedTime] = useState(25);

  useEffect(() => {
    let timer;

    if (running) {
      timer = setInterval(() => {
        if (seconds > 0) {
          setSeconds((s) => s - 1);
        } else if (minutes > 0) {
          setMinutes((m) => m - 1);
          setSeconds(59);
        } else {
          setRunning(false);
          setShowBreak(true);
        }
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [running, minutes, seconds]);
  useEffect(() => {
  const savedTime = localStorage.getItem("focusTime");
useEffect(() => {
  if ("Notification" in window) {
    Notification.requestPermission();
  }
}, []);
  if (savedTime) {
    setSelectedTime(Number(savedTime));
    setMinutes(Number(savedTime));
  }
}, []);
  return (
    <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-6 mt-6 border border-slate-200 dark:border-slate-700 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">
        Pomodoro Timer
      </h2>
      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 mb-5 flex items-center justify-center gap-3">
  <span className="text-sm font-medium">
    Session Length
  </span>

  <input
    type="number"
    min="1"
    max="180"
    value={selectedTime}
    onChange={(e) => {
  const value = Number(e.target.value);

  setSelectedTime(value);
  localStorage.setItem("focusTime", value);

  if (!running) {
    setMinutes(value);
    setSeconds(0);
  }
}}
    className="w-20 text-center rounded-lg border px-2 py-1"
  />

  <span>minutes</span>
</div>
    
      <div className="text-6xl font-bold text-center text-blue-600 mb-6">
        {String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </div>

      <div className="flex gap-2 justify-center">
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          onClick={() => {
          setShowBreak(false);

if ("Notification" in window) {
  if (Notification.permission === "granted") {
    new Notification("Time for a break!", {
      body: "Stay hydrated and stretch a little."
    });
  }
}
          setRunning(true);
          }}
        >
          Start
        </button>

        <button
          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition"
          onClick={() => setRunning(false)}
        >
          Pause
        </button>

        <button
          className="px-4 py-2 bg-slate-400 hover:bg-slate-500 text-white rounded-lg transition"
          onClick={() => {
            setRunning(false);
            setMinutes(selectedTime);
            setSeconds(0);
          }}
        >
          Reset
        </button>
      </div>

      {showBreak && (
        <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-center">
  Time for a short break! Stretch, hydrate, and recharge.
</div>
      )}
    </div>
  );
}