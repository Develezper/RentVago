"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      theme="dark"
      toastOptions={{
        className: "border border-gray-800 bg-black text-gray-100",
        classNames: {
          success: "border-green-500/60 bg-black text-green-300",
          error: "border-red-500/60 bg-black text-red-300",
          description: "text-gray-400",
          actionButton: "bg-green-500 text-black",
          cancelButton: "bg-gray-800 text-gray-200",
        },
      }}
    />
  );
}
