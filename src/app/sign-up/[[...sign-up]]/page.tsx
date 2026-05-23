import { SignUp } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <SignUp />
    </div>
  );
}
