import { SignInButton, SignUpButton } from "@clerk/nextjs";

export default function SignupToAddFallback() {
    return (
        <div className="flex flex-col items-center gap-4 mt-4">
        <SignInButton>
            <button className="text-sm underline cursor-pointer">
            Sign in to add yours!
            </button>
        </SignInButton>

        <SignUpButton>
            <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
            Sign Up
            </button>
        </SignUpButton>
        </div>
    );
}