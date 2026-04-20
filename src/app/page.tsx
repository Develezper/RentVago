import { APP_NAME } from "@/lib";
import DataInput from "@/components/forms/DataInput";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl justify-center items-center h-screen">
      <div className="mx">
          <h1 className="text-4xl font-bold tracking-tight">{APP_NAME}</h1>

        <DataInput />
      </div>
    </main>
  );
}
