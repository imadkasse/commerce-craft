export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent font-bold text-white text-lg">
            CC
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-950">CommerceCraft</h1>
          <p className="text-sm text-gray-500">AI-powered e-commerce management</p>
        </div>
        {children}
      </div>
    </div>
  );
}
