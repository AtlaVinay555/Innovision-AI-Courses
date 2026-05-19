"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";


// Function to process the array of questions and generate monthly data
const processQuestionsData = (questions) => {
  const data = [];
  const now = new Date();
  const currentMonth = now.getMonth();
  const maxOriginalRange = 3; // Maximum value in the original range
  const maxNewRange = 100; // Maximum value in the new range

  // Initialize an array for the last 12 months with default values
  for (let i = 0; i < 12; i++) {
    const month = new Date(now.getFullYear(), currentMonth - 11 + i, 1);
    const monthName = month.toLocaleString("default", { month: "short" });
    const question = questions[((currentMonth - 11 + i) < 0 ? 12 + (currentMonth - 11 + i) : currentMonth - 11 + i)];

    data.push({
      name: monthName,
      totalQuestions: question,
    });
  }

  // Populate the data array with the count of questions per month
  questions.forEach((question) => {
    const questionDate = new Date(question.date); // Assuming each question has a "date" property
    const questionMonth = questionDate.getMonth();
    const questionYear = questionDate.getFullYear();

    const index = data.findIndex(
      (item) =>
        item.name ===
        new Date(questionYear, questionMonth, 1).toLocaleString("default", { month: "short" })
    );

    if (index !== -1) {
      // Normalize the value correctly using the full range
      const normalizedValue = (1 / maxOriginalRange) * maxNewRange; // Assuming 1 question corresponds to the value
      data[index].totalQuestions += normalizedValue;
    }
  });

  return data;
};


const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const totalQuestions = payload[0]?.value || 0;

    return (
      <Card className="p-2 text-xs shadow-lg">
        <p className="font-medium">{label}</p>
        <p className="font-medium mt-1 border-t pt-1">Total XP : {totalQuestions}</p>
      </Card>
    );
  }

  return null;
};

export function ProblemSolvedChart({ questions }) {
  const [data, setData] = useState([]);


  useEffect(() => {
    setData(processQuestionsData(questions));

  }, [questions]);

  return (
    <div className="h-75 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 0,
            bottom: 5,
          }}
        >
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="totalQuestions" fill="#0865e9" name="Total XP" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
