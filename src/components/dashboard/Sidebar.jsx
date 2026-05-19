"use client"
import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { CalendarDays, Trophy, GithubIcon, LinkedinIcon, TwitterIcon, GlobeIcon, InstagramIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import LeaderBoard from "@/components/LeaderBoard";
import EditProfileModal from "@/components/profile/EditProfileModal";

const Sidebar = ({ user, rank, difficultyLevel, leaderboard, onUserUpdate }) => {
    const [editModalOpen, setEditModalOpen] = useState(false);

    // Format date safely
    const formatJoinDate = (dateValue) => {
        if (!dateValue) return null;

        try {
            // Handle Firestore Timestamp
            if (dateValue.seconds) {
                const date = new Date(dateValue.seconds * 1000);
                return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            }

            // Handle Firestore Timestamp with _seconds (serialized format)
            if (dateValue._seconds) {
                const date = new Date(dateValue._seconds * 1000);
                return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            }

            // Handle numeric timestamp (milliseconds)
            if (typeof dateValue === 'number') {
                const date = new Date(dateValue);
                return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            }

            // Handle ISO string or regular date
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) {
                return null;
            }
            return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        } catch (error) {
            console.error("Error formatting date:", error);
            return null;
        }
    };

    // Calculate profile completion
    const calculateProfileCompletion = () => {
        const fields = [
            user?.name,
            user?.email,
            user?.image,
            user?.bio,
            user?.socialLinks?.github,
            user?.socialLinks?.linkedin,
            user?.socialLinks?.twitter,
            user?.socialLinks?.website,
            user?.socialLinks?.instagram
        ];
        const filledFields = fields.filter(field => field && field.trim() !== "").length;
        return Math.round((filledFields / fields.length) * 100);
    };

    const joinedDate = formatJoinDate(user?.createdAt);
    const profileCompletion = calculateProfileCompletion();

    const socialLinks = [
        { icon: GithubIcon, url: user?.socialLinks?.github, label: "GitHub" },
        { icon: LinkedinIcon, url: user?.socialLinks?.linkedin, label: "LinkedIn" },
        { icon: TwitterIcon, url: user?.socialLinks?.twitter, label: "Twitter" },
        { icon: InstagramIcon, url: user?.socialLinks?.instagram, label: "Instagram" },
        { icon: GlobeIcon, url: user?.socialLinks?.website, label: "Website" }
    ].filter(link => link.url && link.url.trim() !== "");
    return (
        <div className="w-full min-w-0 space-y-6 md:min-w-72 md:min-h-[calc(100vh-120px)] pt-3 md:sticky top-16">
            <Card className="gap-3">
                <CardHeader className="pb-2">
                    <div className="flex items-center flex-wrap gap-4">
                        {user.image ? (
                            <img
                                src={user.image || "/default-avatar.png"}
                                width={64}
                                height={64}
                                alt="Avatar"
                                className="rounded-full border"
                            />
                        ) : (
                            <Skeleton className="w-16 h-16 rounded-full" />
                        )}
                        {user.name ? (
                            <div className="w-36">
                                <CardTitle>{user.name}</CardTitle>
                                <CardDescription className="text-[14px] w-full mt-1">
                                    {user.email}
                                </CardDescription>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <Skeleton className="h-3.5 w-16" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pb-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Trophy className="h-4 w-4" />
                        <span className="flex items-end gap-2">
                            Rank:{" "}
                            {rank ? (
                                rank
                            ) : (
                                <Skeleton className={"w-6 h-3.5"}></Skeleton>
                            )}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        <span className="flex items-end gap-2">
                            Joined:{" "}
                            {joinedDate ? (
                                joinedDate
                            ) : (
                                <Skeleton className={"w-12 h-3.5"}></Skeleton>
                            )}
                        </span>
                    </div>

                    {/* Bio */}
                    {user?.bio && (
                        <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground">{user.bio}</p>
                        </div>
                    )}

                    {/* Social Links */}
                    {socialLinks.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                            <div className="flex flex-wrap gap-2">
                                {socialLinks.map((link) => {
                                    const Icon = link.icon;
                                    return (
                                        <a
                                            key={link.label}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-md border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            title={link.label}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Profile Completion */}
                    <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Profile Completion</span>
                            <span className="font-medium">{profileCompletion}%</span>
                        </div>
                        <Progress value={profileCompletion} className="h-1.5" />
                    </div>
                </CardContent>
                <CardFooter className="pt-2">
                    <Button
                        className="w-full"
                        size="sm"
                        onClick={() => setEditModalOpen(true)}
                    >
                        Edit Profile
                    </Button>
                </CardFooter>
            </Card>

            <LeaderBoard leaderboard={leaderboard}></LeaderBoard>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Roadmap Level</CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                    <div className="space-y-4">
                        {["fast", "balanced", "inDepth"].map((level, index) => (
                            <div key={level}>
                                <div className="mb-1 flex items-center justify-between text-sm">
                                    <span className="capitalize">
                                        {level.replace(/([A-Z])/g, " $1")}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {difficultyLevel[index] ?? 0}
                                    </span>
                                </div>
                                <Progress
                                    value={(difficultyLevel[index] ?? 0) * 10}
                                    className="h-2 bg-muted"
                                />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Edit Profile Modal */}
            <EditProfileModal
                open={editModalOpen}
                onOpenChange={setEditModalOpen}
                user={user}
                onUpdate={onUserUpdate}
            />
        </div>
    );
};

export default Sidebar;
