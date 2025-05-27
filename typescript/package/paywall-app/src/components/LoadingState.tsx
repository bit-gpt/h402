export default function LoadingState({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      {message === "Loading..." ? (
        message
      ) : (
        <div className="w-full max-w-[800px] mx-auto p-8 text-center">
          <h1 className="text-2xl font-semibold mb-4">{message}</h1>
          <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
          <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
        </div>
      )}
    </div>
  );
}
