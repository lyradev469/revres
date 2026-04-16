import { publicConfig } from "@/config/public-config";
import { MiniApp } from "@/features/app/mini-app";
import { AppErrorBoundary } from "@/features/app/components/error-boundary";
import { getFarcasterPageMetadata } from "@/neynar-farcaster-sdk/src/nextjs/get-farcaster-page-metadata";
import type { Metadata } from "next";

type PageProps<_Route extends string = string> = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: PageProps<"/">): Promise<Metadata> {
  return getFarcasterPageMetadata({
    title: publicConfig.name,
    description: publicConfig.description,
    homeUrl: publicConfig.homeUrl,
    path: "",
    splashImageUrl: publicConfig.splashImageUrl,
    splashBackgroundColor: publicConfig.splashBackgroundColor,
    buttonTitle: publicConfig.shareButtonTitle,
    searchParams,
  });
}

export default function Home() {
  return (
    <AppErrorBoundary>
      <MiniApp />
    </AppErrorBoundary>
  );
}
