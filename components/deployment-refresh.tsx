"use client";

import { useEffect } from "react";
import { startDeploymentRefresh } from "@/lib/deployment-refresh";

export function DeploymentRefresh() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    return startDeploymentRefresh({
      id: process.env.NEXT_PUBLIC_SITE_BUILD_ID ?? "",
      builtAt: Number(process.env.NEXT_PUBLIC_SITE_BUILD_TIME),
    });
  }, []);

  return null;
}
