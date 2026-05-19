"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";
import { useAuth } from "@/contexts/auth";
import { useEffect, useState } from "react";
const LeaderAvatar = ({ position, image, name, xp }) => {
  let size = position === 0 ? "w-16 h-16" : position === 1 ? "w-14 h-14" : position === 2 ? "w-12 h-12" : "";
  return (
    <div className="min-w-0 text-center flex flex-col items-center">
      <div className={cn("rounded-full", size)}>
        <Avatar className={cn(size)}>
          <AvatarImage src={image} />
          <AvatarFallback>{name[0].toUpperCase()}</AvatarFallback>
        </Avatar>
      </div>
      <div className={cn("flex items-center justify-center gap-1 text-sm min-w-0", position === 0 ? "text-lg" : position === 1 ? "text-base" : "text-sm")}>
        <span className="shrink-0">#{position + 1}</span>
        <p className="truncate">{name.split(" ")[0]}</p>
      </div>
      <p className="text-xs sm:text-sm whitespace-nowrap">{xp} xp</p>
    </div>
  );
};

const LeaderBoard = ({ leaderboard }) => {
  const { user } = useAuth();
  const [leader, setLeader] = useState(leaderboard);

  useEffect(() => {
    const samp = leaderboard.map((leaderUser) =>
      leaderUser.email === user?.email ? { ...leaderUser, name: "You" } : leaderUser
    );
    setLeader(samp);
  }, [user, leaderboard]);

  return (
    <div className="w-full min-w-0 p-2 border border-border shadow-sm rounded-xl overflow-hidden">
      <h1 className="text-center">Leaderboard</h1>{" "}
      {leader[0]?.email ? (
        <div id="head" className="grid grid-cols-3 gap-2 py-4 px-2 items-end mx-auto w-full max-w-full">
          <LeaderAvatar
            position={1}
            image={leader[1]?.image}
            name={leader[1]?.name || " "}
            xp={leader[1]?.xp}
          ></LeaderAvatar>
          <LeaderAvatar
            position={0}
            image={leader[0]?.image}
            name={leader[0]?.name || " "}
            xp={leader[0]?.xp}
          ></LeaderAvatar>
          <LeaderAvatar
            position={2}
            image={leader[2]?.image}
            name={leader[2]?.name || " "}
            xp={leader[2]?.xp}
          ></LeaderAvatar>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 py-4 items-end mx-auto w-full max-w-full">
          <Skeleton className={"w-14 h-14 rounded-full"}></Skeleton>
          <Skeleton className={"w-16 h-16 rounded-full"}></Skeleton>
          <Skeleton className={"w-12 h-12 rounded-full"}></Skeleton>
        </div>
      )}{" "}
      <div className=" ">
        {leader[0]?.email
          ? leader.map((user, index) => {
            if (index > 2) {
              return (
                <div key={user.email} className="border-t flex justify-between py-1.5 px-2 last-of-type:border-b-0">
                  <div className="flex gap-3">
                    <span>#{index + 1}</span> {user.name.split(" ")[0]}
                  </div>
                  <div>{user.xp} xp</div>
                </div>
              );
            }
          })
          : Array(7)
            .fill(0)
            .map((e, index) => (
              <div key={index} className="border-t flex justify-between py-1.5 px-2 last-of-type:border-b-0">
                <Skeleton className={"w-full h-5"}></Skeleton>
              </div>
            ))}
      </div>
    </div>
  );
};

export default LeaderBoard;
