"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useState } from "react";

import ChatInboxLive from "@/components/inbox/chat-inbox-live";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export default function DashboardPage() {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <>
      <Authenticated>
        <div className="flex h-full min-h-0 flex-1 flex-col">
          <ChatInboxLive />
        </div>
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
          <div className="w-full max-w-md space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Agent inbox</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to manage WhatsApp conversations, AI replies, and human takeover.
            </p>
          </div>
          {showSignIn ? (
            <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
          ) : (
            <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
          )}
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      </AuthLoading>
    </>
  );
}
