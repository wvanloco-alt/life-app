"use client";

import { useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";

/**
 * When NEXT_PUBLIC_DISABLE_AUTH is set (local Docker only), signs in as the
 * dev admin in the background so the client session matches the server bypass.
 */
export function DevAutoSession() {
  const { status } = useSession();
  const attempted = useRef(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_AUTH !== "true") return;
    if (status === "authenticated" || attempted.current) return;

    attempted.current = true;
    const username = process.env.NEXT_PUBLIC_DEV_AUTH_USERNAME ?? "admin";
    const password = process.env.NEXT_PUBLIC_DEV_AUTH_PASSWORD ?? "admin123";

    void signIn("credentials", {
      username,
      password,
      redirect: false,
    });
  }, [status]);

  return null;
}
