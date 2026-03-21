import { Suspense } from "react";
import { ActivitiesPage } from "@/components/activities/activities-page";

export default function ActivitiesRoute() {
  return (
    <Suspense>
      <ActivitiesPage />
    </Suspense>
  );
}
