import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-4">
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-white font-bold text-2xl shadow-lg">
          CC
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-bold tracking-tight text-gray-950">CommerceCraft</h1>
          <p className="text-lg text-gray-500 max-w-md">
            AI-powered e-commerce management platform for merchants
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button size="lg">Login</Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
