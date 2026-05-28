import { adminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";
import Roadmap from "@/components/Home/RoadMap";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import ChatBot from "@/components/chat/ChatBot";
import CourseReviews from "@/components/reviews/CourseReviews";
import { Separator } from "@/components/ui/separator";

// Helper to serialize Firestore Timestamps
const serializeTimestamps = (data) => {
  if (!data || typeof data !== "object") return data;

  const serialized = Array.isArray(data) ? [] : {};

  for (const key in data) {
    const value = data[key];

    if (value && typeof value === "object" && typeof value.toMillis === "function") {
      serialized[key] = value.toMillis();
    } else if (value && typeof value === "object") {
      serialized[key] = serializeTimestamps(value);
    } else {
      serialized[key] = value;
    }
  }

  return serialized;
};

//function to fetch roadmap
async function getRoadmap(id) {

  const session = await getServerSession();
  if (session) {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const adminDbInstance = getAdminDb();
    if (!adminDbInstance) return false;

    const docSnap = await adminDbInstance.collection("users").doc(session.user.email).collection("roadmaps").doc(id).get();

    if (!docSnap.exists) {
      return false;
    }

    return serializeTimestamps(docSnap.data());
  }
  return false;
}

//roadmap component
const page = async ({ params }) => {
  const { id } = await params;
  const roadmap = await getRoadmap(id);

  if (!roadmap) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        {" "}
        <p className="text-lg font-semibold">Roadmap doesn't exist</p>
      </div>
    );
  }

  return (
    <div className="w-screen">
      <div className="mx-auto max-w-2xl p-4">
        <Breadcrumb className="my-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/roadmap">Roadmap</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{roadmap.courseTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Roadmap roadMap={roadmap} id={id}></Roadmap>

        {/* Reviews Section */}
        <div className="mt-12">
          <Separator className="mb-8" />
          <h2 className="text-2xl font-bold mb-6">Course Reviews</h2>
          <CourseReviews courseId={id} />
        </div>

        <ChatBot courseId={id} courseTitle={roadmap?.courseTitle} />
      </div>
    </div>
  );
};

export default page;
