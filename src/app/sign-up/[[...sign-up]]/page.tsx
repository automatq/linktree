import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
      <SignUp />
    </div>
  );
}
