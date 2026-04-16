"use client";

import { ReactNode, useState } from "react";
import { Provider as JotaiProvider } from "jotai";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  InitializeFarcasterMiniApp,
  useInitializeFarcasterApp,
} from "@/neynar-farcaster-sdk/mini";
import { NeynarWagmiProvider } from "@/neynar-web-sdk/blockchain";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { injected } from "wagmi";
import { Toaster } from "@neynar/ui";

export function ProvidersAndInitialization({
  children,
}: {
  children: ReactNode;
}) {
  useInitializeFarcasterApp();
  const [queryClient] = useState(() => new QueryClient());

  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <NeynarWagmiProvider connectors={[farcasterMiniApp(), injected()]}>
          {/* LLMs: Add additional providers between here */}
          <Toaster position="top-center" richColors />
          {/* and here */}
          {/* LLMs: Do not remove, initialization must be last, before children */}
          <InitializeFarcasterMiniApp />
          {children}
          {/* End Do not remove */}
        </NeynarWagmiProvider>
      </QueryClientProvider>
    </JotaiProvider>
  );
}
