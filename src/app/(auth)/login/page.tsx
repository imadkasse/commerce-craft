import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md px-4">
          <div className="animate-pulse rounded-lg border bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="h-8 w-1/2 mx-auto bg-gray-200 rounded" />
              <div className="h-4 w-2/3 mx-auto bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
