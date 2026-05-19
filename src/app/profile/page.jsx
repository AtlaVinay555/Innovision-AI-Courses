"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, BookOpen, Calendar, Settings, Award, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/dashboard/Sidebar";
import { ProblemSolvedChart } from "@/components/ui/problem-solved-chart";
import { RecentCourses } from "@/components/ui/recent-submissions";
import GamificationDashboard from "@/components/gamification/GamificationDashboard";
import MotivationalQuote from "@/components/dashboard/MotivationalQuote";
import XPChart from "@/components/gamification/XPChart";
import StreakCalendar from "@/components/gamification/StreakCalendar";
import DailyChallenges from "@/components/gamification/DailyChallenges";
import DailyQuests from "@/components/gamification/DailyQuests";
import SkillTree from "@/components/gamification/SkillTree";
import Leaderboard from "@/components/gamification/Leaderboard";
import BadgeGallery from "@/components/profile/BadgeGallery";
import Bookmarks from "@/components/profile/Bookmarks";
import StatsCard from "@/components/profile/StatsCard";
import StudyReminders from "@/components/settings/StudyReminders";
import { Download, Database, Shield, FileText, Crown, Lock } from "lucide-react";
import TrialBanner from "@/components/TrialBanner";
import PremiumDialog from "@/components/PremiumDialog";
import LockedFeature from "@/components/LockedFeature";
import { useRouter } from "next/navigation";
import { PageBackground, GridPattern, ScrollReveal } from "@/components/ui/PageWrapper";
import ChartSkeleton from "@/components/skeletons/ChartSkeleton";
import CourseListSkeleton from "@/components/skeletons/CourseListSkeleton";

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState({});
  const [recentRoadmaps, setRecentRoadmaps] = useState([]);
  const [completedRoadmaps, setCompletedRoadmaps] = useState([]);
  const [rank, setRank] = useState(0);
  const [loading, setLoading] = useState(false);
  const [difficultyLevel, setDifficultyLevel] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState(null);
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState("");
  const tabsListRef = useRef(null);
  const [activeTab, setActiveTab] = useState("overview");

  const tabOrder = ["overview", "progress", "courses", "activity", "compete", "certificates", "research", "settings"];

  const navigateTab = (direction) => {
    const currentIndex = tabOrder.indexOf(activeTab);
    let nextIndex;
    if (direction === "next") {
      nextIndex = (currentIndex + 1) % tabOrder.length;
    } else {
      nextIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
    }
    setActiveTab(tabOrder[nextIndex]);
  };

  const scrollTabs = (direction) => {
    if (tabsListRef.current) {
      const scrollAmount = 200;
      tabsListRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    if (tabsListRef.current) {
      const activeElement = tabsListRef.current.querySelector('[data-state="active"]');
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }
  }, [activeTab]);

  useEffect(() => {
    fetchUser();
    fetchRank();
    fetchRoadmaps();
  }, []);

  // Handle premium status from TrialBanner
  const handleStatusChange = (status) => {
    setPremiumStatus(status);
  };

  // Check if user has access (premium or in trial)
  const hasAccess = premiumStatus?.hasFullAccess || premiumStatus?.isPremium || premiumStatus?.isInTrial;

  // Show premium dialog for blocked features
  const handleBlockedFeature = (featureName) => {
    if (!hasAccess) {
      setBlockedFeature(featureName);
      setShowPremiumDialog(true);
    }
  };

  async function fetchUser() {
    try {
      const res = await fetch("/api/getuser");
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  }

  const handleUserUpdate = (updatedUser) => {
    setUserData(updatedUser);
  };

  const exportDataset = async (type) => {
    setExporting(true);
    try {
      const response = await fetch(`/api/research/export?type=${type}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_dataset_${Date.now()}.json`;
      a.click();
    } catch (error) {
      console.error("Failed to export dataset:", error);
    }
    setExporting(false);
  };

  async function fetchRoadmaps() {
    setLoading(true);
    try {
      const res = await fetch("/api/roadmap/all");
      if (!res.ok) throw new Error("Failed to fetch roadmaps");
      const data = await res.json();
      const diffLevel = data?.difficultyArray || [];
      let docs = data?.docs || [];
      docs = docs.length > 4 ? docs.slice(0, 4) : docs;
      docs = docs.filter((e) => e.process === "completed");
      const completed = (data?.docs || []).filter((roadmap) => roadmap.completed);
      setCompletedRoadmaps(completed);
      setDifficultyLevel(diffLevel);
      setRecentRoadmaps(docs);
    } catch (error) {
      console.error("Failed to fetch roadmaps:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRank() {
    try {
      const res = await fetch("/api/getrank");
      if (!res.ok) throw new Error("Failed to fetch rank");
      const data = await res.json();
      setRank(data?.rank || 0);
      setLeaderboard(data?.leaderboard || []);
    } catch (error) {
      console.error("Failed to fetch rank:", error);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please login to view your profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <PageBackground variant="profile" />
      <GridPattern opacity={0.02} />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 relative z-10">
        {/* Trial Banner */}
        <TrialBanner onStatusChange={handleStatusChange} />

        {/* Premium Dialog */}
        <PremiumDialog
          open={showPremiumDialog}
          onOpenChange={setShowPremiumDialog}
          feature={blockedFeature}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6">
          {/* Left Sidebar - All original features */}
          <Sidebar
            user={userData}
            rank={rank}
            leaderboard={leaderboard}
            difficultyLevel={difficultyLevel}
            onUserUpdate={handleUserUpdate}
          />

          {/* Main Content - All original tabs */}
          <div className="min-w-0 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              {/* Tab Navigation Pager (Mobile Optimized) */}
              <div className="relative group">
                <div className="flex items-center justify-between gap-2 p-1 bg-muted/50 rounded-xl border border-border/50 backdrop-blur-sm">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-lg hover:bg-background/80"
                    onClick={() => navigateTab("prev")}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  <div className="flex-1 overflow-hidden relative">
                    <TabsList
                      ref={tabsListRef}
                      className="flex flex-nowrap h-10 w-full gap-1 bg-transparent justify-start overflow-x-auto no-scrollbar scroll-smooth p-0"
                    >
                      <TabsTrigger value="overview" className="flex-none px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all duration-300">
                        <Trophy className="h-4 w-4 mr-2" />
                        Overview
                      </TabsTrigger>
                      <TabsTrigger value="progress" className="flex-none px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all duration-300">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Progress
                      </TabsTrigger>
                      <TabsTrigger value="courses" className="flex-none px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all duration-300">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Courses
                      </TabsTrigger>
                      <TabsTrigger value="activity" className="flex-none px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all duration-300">
                        <Calendar className="h-4 w-4 mr-2" />
                        Activity
                      </TabsTrigger>
                      <TabsTrigger value="compete" className="flex-none px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all duration-300">
                        <Trophy className="h-4 w-4 mr-2" />
                        Compete
                      </TabsTrigger>
                      <TabsTrigger value="certificates" className="flex-none px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all duration-300">
                        <Award className="h-4 w-4 mr-2" />
                        Certificates
                      </TabsTrigger>
                      <TabsTrigger value="research" className="flex-none px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all duration-300">
                        <Database className="h-4 w-4 mr-2" />
                        Research
                      </TabsTrigger>
                      <TabsTrigger value="settings" className="flex-none px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all duration-300">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </TabsTrigger>
                    </TabsList>

                    {/* Fades for better visual scroll indication */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-muted/50 to-transparent pointer-events-none z-10" />
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-muted/50 to-transparent pointer-events-none z-10" />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-lg hover:bg-background/80"
                    onClick={() => navigateTab("next")}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                  display: none;
                }
                .no-scrollbar {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}</style>

              {/* Overview Tab - Gamification Dashboard */}
              <TabsContent value="overview" className="space-y-4">
                <LockedFeature featureName="Overview Dashboard" hasAccess={hasAccess} showPreview={true}>
                  {/* Motivational Quote */}
                  <MotivationalQuote />

                  {/* Learning Stats Dashboard */}
                  {user?.email && <StatsCard userId={user.email} />}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                      {user?.email && <GamificationDashboard userId={user.email} />}
                    </div>
                    <div className="lg:col-span-1">
                      {user?.email && <DailyQuests userId={user.email} />}
                    </div>
                  </div>

                  {/* Badge Collection Gallery */}
                  <BadgeGallery
                    earnedBadges={userData?.badges || []}
                    userName={userData?.name || user?.displayName || "User"}
                  />
                </LockedFeature>
              </TabsContent>

              {/* Progress Tab - XP Chart */}
              <TabsContent value="progress" className="space-y-4">
                <LockedFeature featureName="Progress Analytics" hasAccess={hasAccess} showPreview={true}>
                  {loading ? (
                    <>
                      <ChartSkeleton title="XP Earned" description="Your XP earned data over the last year" />
                      <ChartSkeleton title="XP History" />
                    </>
                  ) : (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle>XP Earned</CardTitle>
                          <CardDescription>Your XP earned data over the last year</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ProblemSolvedChart questions={Object.values(userData?.xptrack || {})} />
                        </CardContent>
                      </Card>

                      {user?.email && <XPChart userId={user.email} />}
                    </>
                  )}
                </LockedFeature>
              </TabsContent>

              {/* Courses Tab */}
              <TabsContent value="courses" className="space-y-4">
                {/* Bookmarks Section */}
                <Bookmarks />

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Courses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <CourseListSkeleton count={4} />
                    ) : (
                      <RecentCourses courses={recentRoadmaps} loading={loading} />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Completed Courses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <CourseListSkeleton count={3} />
                    ) : (
                      <RecentCourses courses={completedRoadmaps} loading={loading} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab - Streak Calendar */}
              <TabsContent value="activity" className="space-y-4">
                <LockedFeature featureName="Activity Calendar" hasAccess={hasAccess} showPreview={true}>
                  {user?.email && <StreakCalendar userId={user.email} />}
                </LockedFeature>
              </TabsContent>

              {/* Compete Tab - Challenges, Skills, Leaderboard */}
              <TabsContent value="compete" className="space-y-4">
                <LockedFeature featureName="Compete Features" hasAccess={hasAccess} showPreview={true}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Daily Challenges */}
                    {user?.email && <DailyChallenges userId={user.email} />}

                    {/* Skill Tree */}
                    <SkillTree />
                  </div>

                  {/* Leaderboard */}
                  {user?.email && <Leaderboard currentUserId={user.email} />}
                </LockedFeature>
              </TabsContent>

              {/* Research Tab - Data Export */}
              <TabsContent value="research" className="space-y-4">
                <LockedFeature featureName="Research Data Export" hasAccess={hasAccess} showPreview={true}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Interaction Dataset */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Database className="h-5 w-5 text-blue-500" />
                          Interaction Dataset
                        </CardTitle>
                        <CardDescription>
                          Anonymized user interaction data including clicks, time spent, and navigation patterns
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-green-500" />
                            <span>Fully anonymized</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>JSON format</span>
                          </div>
                        </div>
                        <Button onClick={() => exportDataset("interactions")} disabled={exporting} className="w-full">
                          <Download className="h-4 w-4 mr-2" />
                          Export Interactions
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Outcome Dataset */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                          Outcome Dataset
                        </CardTitle>
                        <CardDescription>
                          Learning outcomes, quiz scores, completion rates, and performance metrics
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-green-500" />
                            <span>Fully anonymized</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>JSON format</span>
                          </div>
                        </div>
                        <Button onClick={() => exportDataset("outcomes")} disabled={exporting} className="w-full">
                          <Download className="h-4 w-4 mr-2" />
                          Export Outcomes
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Privacy Notice */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-500" />
                        Data Privacy & Anonymization
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-500" />
                          All personal identifiers removed
                        </li>
                        <li className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-500" />
                          User IDs replaced with random hashes
                        </li>
                        <li className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-500" />
                          No email addresses or names included
                        </li>
                        <li className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-500" />
                          Timestamps rounded to nearest hour
                        </li>
                        <li className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-500" />
                          IP addresses excluded
                        </li>
                        <li className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-500" />
                          GDPR and COPPA compliant
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </LockedFeature>
              </TabsContent>

              {/* Certificates Tab */}
              <TabsContent value="certificates" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-yellow-500" />
                      My Certificates
                    </CardTitle>
                    <CardDescription>
                      View and download your course completion certificates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => router.push("/profile/certificates")} className="w-full">
                      View All Certificates
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <LockedFeature featureName="Settings & Reminders" hasAccess={hasAccess} showPreview={true}>
                  <StudyReminders />
                </LockedFeature>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
